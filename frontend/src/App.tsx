import {
  AlertCircle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplet,
  Droplets,
  ExternalLink,
  LocateFixed,
  MapPin,
  Moon,
  RefreshCw,
  Satellite,
  Search,
  Snowflake,
  Sun,
  Thermometer,
  TriangleAlert,
  Wind,
} from "lucide-react";
import {
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useCitySuggestions } from "./hooks/useCitySuggestions";
import { useWeather, type WeatherTarget } from "./hooks/useWeather";
import { getWeatherCondition } from "./lib/conditions";
import {
  reverseGeocode,
  WeatherApiException,
  type CitySuggestion,
} from "./services/weatherApi";
import type { CurrentWeather } from "./types/weather";

// Remember the temperature unit chosen by the user.
const UNITS_STORAGE_KEY = "skywatch:units";

// Remember the cities the user recently searched for.
const RECENT_CITIES_STORAGE_KEY = "skywatch:recent-cities";

// Define the available temperature units.
type TemperatureUnit = "C" | "F";

// Choose the hero color theme for the current weather.
type HeroTheme = "day" | "night" | "rain" | "sunset";

// Load recent cities from localStorage, ignoring stored errors.
function loadRecentCities(): string[] {
  try {
    const stored = window.localStorage.getItem(RECENT_CITIES_STORAGE_KEY);

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

// Load the saved temperature unit from localStorage.
function loadTemperatureUnit(): TemperatureUnit {
  try {
    return window.localStorage.getItem(UNITS_STORAGE_KEY) === "F" ? "F" : "C";
  } catch {
    return "C";
  }
}

// Build a Zoom Earth satellite view URL centered on the selected location.
function buildZoomEarthUrl(latitude: number, longitude: number): string {
  const lat = latitude.toFixed(4);
  const lon = longitude.toFixed(4);

  return `https://zoom.earth/maps/satellite/#view=${lat},${lon},8z/place=${lat},${lon}`;
}

// Format a measurement safely without treating missing values as zero.
function formatValue(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  return String(value);
}

// Format a temperature in the selected unit, or "N/A" when missing.
function formatTemperature(
  value: number | null | undefined,
  unit: TemperatureUnit,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "N/A";
  }

  // Convert Celsius to Fahrenheit and round for a tidy reading.
  if (unit === "F") {
    return String(Math.round((value * 9) / 5 + 32));
  }

  return String(value);
}

// Build the secondary line for a city suggestion.
function buildSuggestionRegion(suggestion: CitySuggestion): string {
  return [suggestion.admin1, suggestion.country].filter(Boolean).join(", ");
}

// Decide the hero color theme from the current weather.
function getHeroTheme(weather: CurrentWeather | undefined): HeroTheme {
  if (!weather) return "day";

  // Night takes priority over every other theme.
  if (weather.is_day === 0) return "night";

  const condition = weather.condition.toLowerCase();

  // Use a gray theme for wet or wintry weather.
  if (/(rain|drizzle|shower|thunder|snow)/.test(condition)) {
    return "rain";
  }

  // Use a warm theme during the evening, ahead of the day theme.
  const hour = weather.time
    ? new Date(weather.time.replace(" ", "T")).getHours()
    : Number.NaN;

  if (!Number.isNaN(hour) && hour >= 17 && hour < 20) {
    return "sunset";
  }

  return "day";
}

// Select a weather icon based on the weather description.
function WeatherIcon({ condition }: { condition: string }) {
  const normalizedCondition = condition.toLowerCase();

  if (normalizedCondition.includes("thunder")) {
    return <CloudLightning size={76} strokeWidth={1.4} />;
  }

  if (
    normalizedCondition.includes("rain") ||
    normalizedCondition.includes("drizzle") ||
    normalizedCondition.includes("shower")
  ) {
    return <CloudRain size={76} strokeWidth={1.4} />;
  }

  if (normalizedCondition.includes("snow")) {
    return <Snowflake size={76} strokeWidth={1.4} />;
  }

  if (
    normalizedCondition.includes("fog") ||
    normalizedCondition.includes("rime")
  ) {
    return <CloudFog size={76} strokeWidth={1.4} />;
  }

  if (
    normalizedCondition.includes("cloud") ||
    normalizedCondition.includes("overcast")
  ) {
    return <CloudSun size={76} strokeWidth={1.4} />;
  }

  return <Sun size={76} strokeWidth={1.4} />;
}

// Show a smaller icon for a forecast item.
function ForecastIcon({ code }: { code: number | null }) {
  const condition = getWeatherCondition(code);
  const normalizedCondition = condition.toLowerCase();

  if (normalizedCondition.includes("thunder")) {
    return <CloudLightning size={25} />;
  }

  if (
    normalizedCondition.includes("rain") ||
    normalizedCondition.includes("drizzle") ||
    normalizedCondition.includes("shower")
  ) {
    return <CloudRain size={25} />;
  }

  if (normalizedCondition.includes("snow")) {
    return <Snowflake size={25} />;
  }

  if (
    normalizedCondition.includes("fog") ||
    normalizedCondition.includes("rime")
  ) {
    return <CloudFog size={25} />;
  }

  if (
    normalizedCondition.includes("cloud") ||
    normalizedCondition.includes("overcast")
  ) {
    return <CloudSun size={25} />;
  }

  return <Sun size={25} />;
}

// Format a forecast timestamp as a local time.
function formatForecastTime(time: string): string {
  const date = new Date(time);

  if (Number.isNaN(date.getTime())) {
    return time;
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

// Format a forecast date as a weekday.
function formatForecastDay(dateString: string, index: number): string {
  if (index === 0) return "Today";

  const date = new Date(`${dateString}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString(undefined, { weekday: "short" });
}

// Render the main weather dashboard.
export default function App() {
  // Store the city currently typed into the search field.
  const [searchInput, setSearchInput] = useState("Manila");

  // Store the location currently selected for weather requests.
  const [target, setTarget] = useState<WeatherTarget>({
    kind: "city",
    city: "Manila",
  });

  // Store the cities the user recently searched for.
  const [recentCities, setRecentCities] = useState<string[]>(loadRecentCities);

  // Store the selected temperature unit.
  const [unit, setUnit] = useState<TemperatureUnit>(loadTemperatureUnit);

  // Track the highlighted suggestion for keyboard navigation.
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Track whether the suggestion list should be visible.
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Track whether a geolocation request is in progress.
  const [isLocating, setIsLocating] = useState(false);

  // Store a message when geolocation fails.
  const [locationError, setLocationError] = useState<string | null>(null);

  // Load live city suggestions as the user types.
  const suggestions = useCitySuggestions(searchInput);

  // Fetch current weather and forecast data from the weather APIs.
  const { weather, isLoading, isFetching, isError, error, refresh, updatedAt } =
    useWeather(target);

  // Save the temperature unit whenever it changes.
  function changeUnit(nextUnit: TemperatureUnit) {
    setUnit(nextUnit);

    try {
      window.localStorage.setItem(UNITS_STORAGE_KEY, nextUnit);
    } catch {
      // Ignore storage failures so the toggle still works.
    }
  }

  // Remember a city in the recent list, most recent first.
  function addRecentCity(city: string) {
    const trimmedCity = city.trim();

    if (!trimmedCity) return;

    setRecentCities((current) => {
      // Remove duplicates and keep the newest entry at the front.
      const next = [
        trimmedCity,
        ...current.filter(
          (entry) => entry.toLowerCase() !== trimmedCity.toLowerCase(),
        ),
      ].slice(0, 6);

      try {
        window.localStorage.setItem(
          RECENT_CITIES_STORAGE_KEY,
          JSON.stringify(next),
        );
      } catch {
        // Ignore storage failures so searching still works.
      }

      return next;
    });
  }

  // Select a suggestion and load its exact coordinates.
  function handleSelectSuggestion(suggestion: CitySuggestion) {
    setSearchInput(suggestion.name);
    setTarget({
      kind: "coords",
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      label: suggestion.name,
    });
    addRecentCity(suggestion.name);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  // Submit a city search.
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // Select the highlighted suggestion instead of submitting.
    if (
      showSuggestions &&
      activeSuggestionIndex >= 0 &&
      suggestions[activeSuggestionIndex]
    ) {
      handleSelectSuggestion(suggestions[activeSuggestionIndex]);
      return;
    }

    const city = searchInput.trim();

    if (!city) return;

    setTarget({ kind: "city", city });
    addRecentCity(city);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  // Move through the suggestion list with the arrow keys.
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex(
        (current) => (current + 1) % suggestions.length,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        current <= 0 ? suggestions.length - 1 : current - 1,
      );
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  }

  // Select a city from the recent list.
  function handleRecentCity(city: string) {
    setSearchInput(city);
    setTarget({ kind: "city", city });
    addRecentCity(city);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  // Ask the browser for the current position.
  function handleUseLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setShowSuggestions(false);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Resolve the coordinates into a readable place name.
        let label = "";

        try {
          const place = await reverseGeocode(latitude, longitude);
          label = place.name || "Current location";
        } catch {
          label = "Current location";
        }

        // Show the resolved place name in the search bar.
        setSearchInput(label);
        setTarget(
          label
            ? { kind: "coords", latitude, longitude, label }
            : { kind: "coords", latitude, longitude },
        );
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        setLocationError(
          "Unable to access your location. Check your browser permissions.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 5 * 60 * 1000 },
    );
  }

  // Display a helpful message when the request fails.
  const errorMessage =
    error instanceof WeatherApiException
      ? error.message
      : "Unable to load weather data. Please try again.";

  // Format the time of the most recent successful fetch.
  const observationTime = updatedAt
    ? new Date(updatedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Time unavailable";

  // Determine whether the selected location is experiencing daytime.
  const isDay = weather?.is_day === 1;

  // Choose the hero color theme for the current weather.
  const heroTheme = getHeroTheme(weather);

  // Build the unit label used next to temperatures.
  const unitLabel = `°${unit}`;

  // Read forecast arrays safely.
  const hourlyForecast = weather?.hourly_forecast ?? [];
  const dailyForecast = weather?.daily_forecast ?? [];

  // Render the dashboard.
  return (
    <main className={`app-shell ${isDay ? "day-theme" : "night-theme"}`}>
      <div className="weather-background" aria-hidden="true">
        <div className="weather-orb weather-orb-one" />
        <div className="weather-orb weather-orb-two" />
        <div className="weather-orb weather-orb-three" />
      </div>

      <div className="dashboard">
        <header className="topbar">
          <a className="brand" href="/" aria-label="Weather dashboard home">
            <span className="brand-icon">
              <CloudSun size={25} />
            </span>
            <span>
              <strong>SkyWatch</strong>
              <small>Weather Monitoring</small>
            </span>
          </a>

          <div className="topbar-actions">
            <div className="header-status">
              <span className="status-dot" />
              Current weather
            </div>

            <div
              className="unit-toggle"
              role="group"
              aria-label="Temperature unit"
            >
              <button
                type="button"
                className={unit === "C" ? "is-active" : ""}
                aria-pressed={unit === "C"}
                onClick={() => changeUnit("C")}
              >
                °C
              </button>
              <button
                type="button"
                className={unit === "F" ? "is-active" : ""}
                aria-pressed={unit === "F"}
                onClick={() => changeUnit("F")}
              >
                °F
              </button>
            </div>
          </div>
        </header>

        <section className="welcome-section">
          <div>
            <p className="eyebrow">YOUR WEATHER, AT A GLANCE</p>
            <h1>Weather dashboard</h1>
            <p className="welcome-description">
              Discover current conditions wherever you are.
            </p>
          </div>

          <div className="search-area">
            <form className="search-form" onSubmit={handleSearch}>
              <Search size={19} aria-hidden="true" />

              <input
                type="search"
                value={searchInput}
                onChange={(event) => {
                  setSearchInput(event.target.value);
                  setShowSuggestions(true);
                  setActiveSuggestionIndex(-1);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() =>
                  window.setTimeout(() => setShowSuggestions(false), 150)
                }
                onKeyDown={handleSearchKeyDown}
                placeholder="Search a city..."
                aria-label="Search city"
                role="combobox"
                aria-expanded={showSuggestions && suggestions.length > 0}
                aria-controls="city-suggestions"
                aria-autocomplete="list"
                autoComplete="off"
              />

              <button
                className="location-button"
                type="button"
                onClick={handleUseLocation}
                disabled={isLocating}
                title="Use my location"
                aria-label="Use my location"
              >
                <LocateFixed
                  size={18}
                  className={isLocating ? "spinning" : ""}
                />
              </button>

              <button
                className="search-submit"
                type="submit"
                disabled={!searchInput.trim()}
              >
                Search
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <ul className="suggestions" id="city-suggestions" role="listbox">
                {suggestions.map((suggestion, index) => (
                  <li
                    key={`${suggestion.name}-${suggestion.latitude}-${suggestion.longitude}`}
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                  >
                    <button
                      type="button"
                      className={`suggestion-option ${
                        index === activeSuggestionIndex ? "is-active" : ""
                      }`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectSuggestion(suggestion)}
                    >
                      <MapPin size={15} />
                      <span className="suggestion-name">
                        {suggestion.name}
                      </span>
                      <span className="suggestion-region">
                        {buildSuggestionRegion(suggestion)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {recentCities.length > 0 && (
              <div className="recent-cities">
                <span className="recent-label">Recent</span>
                {recentCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    className="recent-chip"
                    onClick={() => handleRecentCity(city)}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}

            {locationError && (
              <p className="search-message" role="alert">
                {locationError}
              </p>
            )}
          </div>
        </section>

        {isError && (
          <div className="error-banner" role="alert">
            <AlertCircle size={20} />
            <div>
              <strong>Unable to update weather</strong>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {isLoading && !weather ? (
          <section
            className="skeleton-dashboard"
            aria-busy="true"
            aria-live="polite"
          >
            <span className="sr-only">Getting the latest weather...</span>

            <div className="skeleton skeleton-hero" />

            <div className="skeleton-metrics">
              {[0, 1, 2, 3].map((index) => (
                <div className="skeleton skeleton-metric" key={index} />
              ))}
            </div>

            <div className="skeleton-hours">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div className="skeleton skeleton-hour" key={index} />
              ))}
            </div>

            <div className="skeleton-lines">
              {[0, 1, 2].map((index) => (
                <div className="skeleton skeleton-line" key={index} />
              ))}
            </div>
          </section>
        ) : weather ? (
          <>
            <section className={`hero-card hero-${heroTheme}`}>
              <div className="hero-content">
                <div className="location-label">
                  <MapPin size={17} />
                  <span>
                    {weather.city}
                    {weather.country ? `, ${weather.country}` : ""}
                  </span>
                </div>

                <p className="observation-time">
                  Last observation: {observationTime}
                </p>

                <div className="temperature-display">
                  <span className="temperature-value">
                    {formatTemperature(weather.temperature, unit)}
                  </span>
                  <span className="temperature-unit">{unitLabel}</span>
                </div>

                <h2 className="condition-label">{weather.condition}</h2>

                <p className="feels-like">
                  Feels like {formatTemperature(weather.feels_like, unit)}
                  {weather.feels_like !== null &&
                  weather.feels_like !== undefined
                    ? unitLabel
                    : ""}
                </p>
              </div>

              <div className="hero-illustration" aria-hidden="true">
                <div className="illustration-glow" />
                <WeatherIcon condition={weather.condition} />
                {weather.is_day === 0 && (
                  <Moon className="night-moon" size={28} />
                )}
              </div>

              <div className="hero-footer">
                <div>
                  <span className="hero-footer-label">LATITUDE</span>
                  <strong>{weather.latitude.toFixed(4)}°</strong>
                </div>

                <div>
                  <span className="hero-footer-label">LONGITUDE</span>
                  <strong>{weather.longitude.toFixed(4)}°</strong>
                </div>

                <button
                  className="refresh-button"
                  type="button"
                  onClick={() => void refresh()}
                  disabled={isFetching}
                >
                  <RefreshCw
                    size={16}
                    className={isFetching ? "spinning" : ""}
                  />
                  {isFetching ? "Updating..." : "Refresh weather"}
                </button>
              </div>
            </section>

            <section className="metrics-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">CURRENT CONDITIONS</p>
                  <h2>Weather details</h2>
                </div>

                <span className="live-indicator">
                  <span className="status-dot" />
                  Latest available data
                </span>
              </div>

              <div className="metrics-grid">
                <article className="metric-card">
                  <div className="metric-icon humidity-icon">
                    <Droplets size={22} />
                  </div>
                  <p>Humidity</p>
                  <strong>{formatValue(weather.humidity)}%</strong>
                  <span>Relative humidity</span>
                </article>

                <article className="metric-card">
                  <div className="metric-icon wind-icon">
                    <Wind size={22} />
                  </div>
                  <p>Wind speed</p>
                  <strong>
                    {formatValue(weather.wind_speed)}
                    <small> {weather.units.wind_speed_10m ?? "km/h"}</small>
                  </strong>
                  <span>Current wind measurement</span>
                </article>

                <article className="metric-card">
                  <div className="metric-icon rain-icon">
                    <CloudRain size={22} />
                  </div>
                  <p>Precipitation</p>
                  <strong>
                    {formatValue(weather.precipitation)}
                    <small> {weather.units.precipitation ?? "mm"}</small>
                  </strong>
                  <span>Current precipitation</span>
                </article>

                <article className="metric-card">
                  <div className="metric-icon temperature-icon">
                    <Thermometer size={22} />
                  </div>
                  <p>Feels like</p>
                  <strong>
                    {formatTemperature(weather.feels_like, unit)}
                    <small> {unitLabel}</small>
                  </strong>
                  <span>Apparent temperature</span>
                </article>
              </div>
            </section>

            {/* Hourly forecast and rain probability. */}
            <section className="forecast-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">TODAY'S HOURLY FORECAST</p>
                  <h2>Hourly forecast</h2>
                </div>
                <span className="forecast-count">
                  {hourlyForecast.length} hours
                </span>
              </div>

              {hourlyForecast.length > 0 ? (
                <div className="hourly-forecast-grid">
                  {hourlyForecast.map((hour, index) => (
                    <article
                      className="hourly-card"
                      key={`${hour.time}-${index}`}
                    >
                      <p className="forecast-time">
                        {formatForecastTime(hour.time)}
                      </p>

                      <ForecastIcon code={hour.weather_code} />

                      <strong className="hourly-temperature">
                        {formatTemperature(hour.temperature, unit)}°
                      </strong>

                      <div className="rain-probability">
                        <Droplets size={15} />
                        <span>{formatValue(hour.rain_probability)}%</span>
                      </div>

                      <span className="forecast-caption">Chance of rain</span>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="forecast-empty">
                  Hourly forecast data is not available.
                </div>
              )}
            </section>

            {/* Seven-day forecast with daily rain probability. */}
            <section className="forecast-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">LOOKING AHEAD</p>
                  <h2>7-day forecast</h2>
                </div>
                <span className="forecast-count">
                  {dailyForecast.length} days
                </span>
              </div>

              {dailyForecast.length > 0 ? (
                <div className="daily-forecast-list">
                  <div className="daily-forecast-head" aria-hidden="true">
                    <span>Day</span>
                    <span>Condition</span>
                    <span>Chance of rain</span>
                    <span>Rain (mm)</span>
                    <span className="daily-head-temperatures">
                      High / Low
                    </span>
                  </div>

                  {dailyForecast.map((day, index) => (
                    <article className="daily-forecast-row" key={day.date}>
                      <div className="daily-day">
                        <strong>{formatForecastDay(day.date, index)}</strong>
                        <span>{day.date}</span>
                      </div>

                      <div className="daily-condition">
                        <ForecastIcon code={day.weather_code} />
                        <span>{getWeatherCondition(day.weather_code)}</span>
                      </div>

                      <div className="daily-rain">
                        <Droplets size={17} />
                        <div>
                          <strong>{formatValue(day.rain_probability)}%</strong>
                          <span>Chance of rain</span>
                        </div>
                      </div>

                      <div className="daily-amount">
                        <CloudRain size={17} />
                        <strong>
                          {formatValue(day.precipitation_sum)} mm
                        </strong>
                      </div>

                      <div className="daily-temperatures">
                        <strong>
                          {formatTemperature(day.temperature_max, unit)}°
                        </strong>
                        <span>
                          {formatTemperature(day.temperature_min, unit)}°
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="forecast-empty">
                  Daily forecast data is not available.
                </div>
              )}
            </section>

            <section className="placeholder-grid">
              <article className="placeholder-card">
                <div className="placeholder-heading">
                  <Droplet size={23} />
                  <h2>Flood monitoring</h2>
                </div>
                <p>
                  View flood hazard maps for the Philippines with Project NOAH.
                </p>
                <a
                  className="card-link"
                  href="https://noah.up.edu.ph/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Droplet size={18} />
                  Open Project NOAH
                  <ExternalLink size={14} />
                </a>
              </article>

              <article className="placeholder-card">
                <div className="placeholder-heading">
                  <TriangleAlert size={23} />
                  <h2>Rain &amp; wind signals</h2>
                </div>
                <p>
                  Monitor PAGASA rainfall and wind signal warnings across the
                  Philippines.
                </p>
                <a
                  className="card-link"
                  href="https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <TriangleAlert size={18} />
                  Open PAGASA bulletin
                  <ExternalLink size={14} />
                </a>
              </article>

              <article className="placeholder-card">
                <div className="placeholder-heading">
                  <MapPin size={23} />
                  <h2>Weather location</h2>
                </div>
                <p>
                  Open live satellite imagery of the selected location on Zoom
                  Earth.
                </p>
                <a
                  className="card-link"
                  href={buildZoomEarthUrl(weather.latitude, weather.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Satellite size={18} />
                  View on Zoom Earth
                  <ExternalLink size={14} />
                </a>
              </article>
            </section>
          </>
        ) : null}

        <footer className="app-footer">
          <span>SkyWatch Weather Monitoring</span>
          <span>Weather data provided by Open-Meteo</span>
        </footer>
      </div>
    </main>
  );
}
