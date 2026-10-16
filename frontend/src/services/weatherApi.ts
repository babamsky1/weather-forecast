import axios from "axios";
import { getWeatherCondition } from "../lib/conditions";
import type {
  CurrentWeather,
  DailyForecast,
  HourlyForecast,
  WeatherApiError,
  WeatherUnits,
} from "../types/weather";

// These public APIs need no key and allow browser requests (CORS), so the
// frontend talks to them directly and no application server is required.
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const REVERSE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

// Show the current day, from its first hour, as 24 hourly readings.
const HOURLY_HOURS = 24;

// Show the current day plus the next six days.
const DAILY_DAYS = 7;

// Number of place suggestions offered while typing.
const SUGGESTION_COUNT = 6;

// Create a reusable Axios instance for the upstream weather APIs.
const weatherApi = axios.create({
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

// Define a custom error for weather API failures.
export class WeatherApiException extends Error {
  public readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "WeatherApiException";
    this.status = status;
  }
}

// One place suggestion returned by the geocoding search.
export interface CitySuggestion {
  name: string;
  country: string | null;
  admin1: string | null;
  latitude: number;
  longitude: number;
}

// Response shape returned by the geocoding endpoint.
interface GeocodingResponse {
  results?: CitySuggestion[];
}

// One place resolved from a pair of coordinates.
export interface ReverseGeocodeResult {
  name: string;
  country: string | null;
}

// Response shape returned by the reverse geocoding endpoint.
interface ReverseGeocodeResponse {
  city?: string;
  locality?: string;
  principalSubdivision?: string;
  countryName?: string;
}

// A block of forecast values keyed by variable name.
type MetricBlock = Record<string, unknown>;

// Response shape returned by the forecast endpoint.
interface ForecastResponse {
  current?: MetricBlock;
  current_units?: WeatherUnits;
  hourly?: MetricBlock;
  daily?: MetricBlock;
}

// The place the weather belongs to.
interface WeatherLocation {
  latitude: number;
  longitude: number;
  city: string;
  country: string | null;
}

// Return the first non-empty string from a list of candidates.
function firstString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
}

// Read a value as a finite number, or null when it is missing.
function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

// Read one positional value from an Open-Meteo array.
function at(values: unknown, index: number): number | null {
  return Array.isArray(values) ? num(values[index]) : null;
}

// Read the timestamp array returned by Open-Meteo.
function timestamps(values: unknown): string[] {
  return Array.isArray(values)
    ? values.map((value) => (typeof value === "string" ? value : ""))
    : [];
}

// Convert any Axios failure into a readable WeatherApiException.
function toWeatherApiException(error: unknown): WeatherApiException {
  // Keep our own descriptive errors untouched.
  if (error instanceof WeatherApiException) {
    return error;
  }

  // Handle errors returned by Axios.
  if (axios.isAxiosError<WeatherApiError>(error)) {
    // Get the HTTP status code when the server responded.
    const status = error.response?.status;
    const data = error.response?.data;

    // Prefer the reason reported by the upstream API.
    const message =
      firstString(data?.reason, data?.message, data?.error) ??
      (error.code === "ECONNABORTED"
        ? "The weather request timed out. Please try again."
        : error.response
          ? "Unable to retrieve weather data."
          : "Unable to reach the weather service. Check your internet connection.");

    // Return a readable error for the React interface.
    return new WeatherApiException(message, status);
  }

  // Handle unexpected errors.
  return new WeatherApiException(
    "An unexpected error occurred while retrieving weather data.",
  );
}

// Turn coordinates into a known place with a readable name.
async function geocodeCity(city: string): Promise<CitySuggestion> {
  const response = await weatherApi.get<GeocodingResponse>(GEOCODING_URL, {
    params: {
      name: city,
      count: 1,
      language: "en",
      format: "json",
    },
  });

  const result = response.data.results?.[0];

  if (!result) {
    throw new WeatherApiException(`No location found for "${city}".`, 404);
  }

  return result;
}

// Build the shape the interface expects from the raw Open-Meteo response.
function shapeWeather(
  data: ForecastResponse,
  location: WeatherLocation,
): CurrentWeather {
  const current = data.current ?? {};
  const hourly = data.hourly ?? {};
  const daily = data.daily ?? {};

  const weatherCode = num(current.weather_code);
  const currentTime = typeof current.time === "string" ? current.time : null;
  const currentDate = currentTime?.slice(0, 10) ?? "";

  const hourlyTimes = timestamps(hourly.time);
  const dailyTimes = timestamps(daily.time);

  // Begin the hourly view at the first slot of the current day.
  const foundIndex = hourlyTimes.findIndex(
    (time) => time.slice(0, 10) === currentDate,
  );
  const startIndex = currentDate && foundIndex !== -1 ? foundIndex : 0;

  // Keep the next 24 hourly readings.
  const hourlyForecast: HourlyForecast[] = [];

  for (
    let index = startIndex;
    index < hourlyTimes.length && hourlyForecast.length < HOURLY_HOURS;
    index += 1
  ) {
    const time = hourlyTimes[index];

    if (!time) continue;

    hourlyForecast.push({
      time,
      weather_code: at(hourly.weather_code, index),
      temperature: at(hourly.temperature_2m, index),
      rain_probability: at(hourly.precipitation_probability, index),
      precipitation: at(hourly.precipitation, index),
    });
  }

  // Keep today and the next six days.
  const dailyForecast: DailyForecast[] = [];

  for (
    let index = 0;
    index < dailyTimes.length && dailyForecast.length < DAILY_DAYS;
    index += 1
  ) {
    const date = dailyTimes[index];

    if (!date) continue;

    dailyForecast.push({
      date,
      weather_code: at(daily.weather_code, index),
      temperature_max: at(daily.temperature_2m_max, index),
      temperature_min: at(daily.temperature_2m_min, index),
      rain_probability: at(daily.precipitation_probability_max, index),
      precipitation_sum: at(daily.precipitation_sum, index),
    });
  }

  return {
    ...location,
    temperature: num(current.temperature_2m),
    feels_like: num(current.apparent_temperature),
    humidity: num(current.relative_humidity_2m),
    wind_speed: num(current.wind_speed_10m),
    precipitation: num(current.precipitation),
    condition: getWeatherCondition(weatherCode),
    weather_code: weatherCode,
    is_day: num(current.is_day),
    time: currentTime,
    hourly_forecast: hourlyForecast,
    daily_forecast: dailyForecast,
    units: data.current_units ?? {},
  };
}

// Request the forecast for a pair of coordinates.
async function fetchWeather(
  latitude: number,
  longitude: number,
  city: string,
  country: string | null,
): Promise<CurrentWeather> {
  try {
    const response = await weatherApi.get<ForecastResponse>(FORECAST_URL, {
      params: {
        latitude,
        longitude,
        timezone: "auto",
        forecast_days: DAILY_DAYS,
        current: [
          "temperature_2m",
          "relative_humidity_2m",
          "apparent_temperature",
          "precipitation",
          "weather_code",
          "wind_speed_10m",
          "is_day",
        ].join(","),
        hourly: [
          "temperature_2m",
          "precipitation_probability",
          "precipitation",
          "weather_code",
        ].join(","),
        daily: [
          "weather_code",
          "temperature_2m_max",
          "temperature_2m_min",
          "precipitation_sum",
          "precipitation_probability_max",
        ].join(","),
      },
    });

    return shapeWeather(response.data, { latitude, longitude, city, country });
  } catch (error: unknown) {
    throw toWeatherApiException(error);
  }
}

// Fetch current weather for a city by looking up its coordinates first.
export async function getCurrentWeather(city: string): Promise<CurrentWeather> {
  // Remove unnecessary whitespace from the city name.
  const trimmedCity = city.trim();

  // Prevent requests with an empty city name.
  if (!trimmedCity) {
    throw new WeatherApiException("Please enter a city name.");
  }

  try {
    // Resolve the city into coordinates before requesting the forecast.
    const location = await geocodeCity(trimmedCity);

    return await fetchWeather(
      location.latitude,
      location.longitude,
      location.name,
      location.country ?? null,
    );
  } catch (error: unknown) {
    // Throw a readable error for the React interface.
    throw toWeatherApiException(error);
  }
}

// Fetch current weather for a pair of coordinates.
export async function getWeatherByCoords(
  latitude: number,
  longitude: number,
  label?: string,
): Promise<CurrentWeather> {
  try {
    // Resolve a readable place name when the caller did not supply one.
    const place = label ? null : await reverseGeocode(latitude, longitude);

    const city = firstString(label, place?.name) ?? "Current location";

    return await fetchWeather(
      latitude,
      longitude,
      city,
      label ? null : (place?.country ?? null),
    );
  } catch (error: unknown) {
    // Throw a readable error for the React interface.
    throw toWeatherApiException(error);
  }
}

// Fetch city suggestions while the user types.
export async function getCitySuggestions(
  query: string,
  signal?: AbortSignal,
): Promise<CitySuggestion[]> {
  // Remove unnecessary whitespace from the query.
  const trimmedQuery = query.trim();

  // Skip very short queries to reduce API calls.
  if (trimmedQuery.length < 2) {
    return [];
  }

  try {
    // Ask the geocoding endpoint for matching places.
    const response = await weatherApi.get<GeocodingResponse>(GEOCODING_URL, {
      params: {
        name: trimmedQuery,
        count: SUGGESTION_COUNT,
        language: "en",
        format: "json",
      },
      signal,
    });

    // Return the suggestion list, defaulting to an empty array.
    return response.data.results ?? [];
  } catch {
    // Fail quietly so typing is never blocked by suggestion errors.
    return [];
  }
}

// Resolve a pair of coordinates into a readable place name.
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<ReverseGeocodeResult> {
  try {
    // Ask the reverse geocoding endpoint for the nearest place.
    const response = await weatherApi.get<ReverseGeocodeResponse>(REVERSE_URL, {
      params: {
        latitude,
        longitude,
        localityLanguage: "en",
      },
    });

    const data = response.data;

    // Prefer the city, then the locality, then the wider region.
    return {
      name:
        firstString(
          data.city,
          data.locality,
          data.principalSubdivision,
        ) ?? "",
      country: firstString(data.countryName) ?? null,
    };
  } catch (error: unknown) {
    // Throw a readable error for the React interface.
    throw toWeatherApiException(error);
  }
}
