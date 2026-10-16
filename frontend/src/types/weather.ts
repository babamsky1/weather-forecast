export interface WeatherUnits {
  time?: string;
  interval?: string;
  temperature_2m?: string;
  relative_humidity_2m?: string;
  apparent_temperature?: string;
  is_day?: string;
  precipitation?: string;
  weather_code?: string;
  wind_speed_10m?: string;
}

// One hourly forecast reading.
export interface HourlyForecast {
  time: string;
  weather_code: number | null;
  temperature: number | null;
  rain_probability: number | null;
  precipitation: number | null;
}

// One daily forecast reading.
export interface DailyForecast {
  date: string;
  weather_code: number | null;
  temperature_max: number | null;
  temperature_min: number | null;
  rain_probability: number | null;
  precipitation_sum: number | null;
}

// Weather information for the selected city.
export interface CurrentWeather {
  city: string;
  country: string | null;
  latitude: number;
  longitude: number;

  // Current weather measurements.
  temperature: number | null;
  feels_like: number | null;
  humidity: number | null;
  wind_speed: number | null;
  precipitation: number | null;
  condition: string;
  weather_code: number | null;
  is_day: number | null;
  time: string | null;

  // Forecast data returned by the weather APIs.
  hourly_forecast: HourlyForecast[];
  daily_forecast: DailyForecast[];

  // Units for current weather measurements.
  units: WeatherUnits;
}

// Error response returned by the weather APIs.
export interface WeatherApiError {
  error?: boolean | string;
  reason?: string;
  message?: string;
}
