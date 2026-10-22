import { useState, useEffect, type FormEvent } from "react";
import { useWeather, type WeatherTarget } from "./hooks/useWeather";
import {
  reverseGeocode,
  WeatherApiException,
  type CitySuggestion,
} from "./services/weatherApi";
import type { CurrentWeather } from "./types/weather";

// Components.
import { Topbar } from "./components/Topbar";
import { SearchArea } from "./components/SearchArea";
import { ErrorBanner } from "./components/ErrorBanner";
import { SkeletonDashboard } from "./components/SkeletonDashboard";
import { HeroCard } from "./components/HeroCard";
import { MetricsSection } from "./components/MetricsSection";
import { HourlyForecast } from "./components/HourlyForecast";
import { DailyForecast } from "./components/DailyForecast";
import { PlaceholderGrid } from "./components/PlaceholderGrid";
import { AppFooter } from "./components/AppFooter";

// Remember the temperature unit chosen by the user.
const UNITS_STORAGE_KEY = "skywatch:units";

// Remember the cities the user recently searched for.
const RECENT_CITIES_STORAGE_KEY = "skywatch:recent-cities";

// Remember whether the user has visited before (for first-visit geolocation prompt).
const HAS_VISITED_STORAGE_KEY = "skywatch:has-visited";

// Choose the hero color theme for the current weather.
type HeroTheme = "day" | "night" | "rain" | "sunset";

// Define the available temperature units.
type TemperatureUnit = "C" | "F";

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

// Format a sunrise/sunset ISO time as a short local time.
function formatSunTime(isoTime: string | null): string {
  if (!isoTime) return "—";

  const date = new Date(isoTime);
  if (Number.isNaN(date.getTime())) return isoTime;

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
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

  // Track whether a geolocation request is in progress.
  const [isLocating, setIsLocating] = useState(false);

  // Store a message when geolocation fails.
  const [locationError, setLocationError] = useState<string | null>(null);

  // On the very first visit, prompt for geolocation and fall back to the default city.
  useEffect(() => {
    const alreadyVisited = window.localStorage.getItem(HAS_VISITED_STORAGE_KEY);

    if (alreadyVisited) return;

    try {
      window.localStorage.setItem(HAS_VISITED_STORAGE_KEY, "1");
    } catch {
      // Ignore storage failures; geolocation prompt can still run.
    }

    if ("geolocation" in navigator) {
      handleUseLocation();
    }
  }, []);

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
  }

  // Submit a city search.
  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const city = searchInput.trim();

    if (!city) return;

    setTarget({ kind: "city", city });
    addRecentCity(city);
  }

  // Select a city from the recent list.
  function handleRecentCity(city: string) {
    setSearchInput(city);
    setTarget({ kind: "city", city });
    addRecentCity(city);
  }

  // Share the current weather via the Web Share API, with a clipboard fallback.
  async function handleShare() {
    if (!weather) return;

    const unitLabel = `°${unit}`;
    const shareText = `${weather.city}: ${weather.temperature ?? "—"}${unitLabel}, ${weather.condition}`;
    const shareUrl = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Weather in ${weather.city}`,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch {
        // User canceled or sharing failed; fall through to clipboard fallback.
      }
    }

    // Clipboard fallback for browsers without Web Share API.
    try {
      await navigator.clipboard.writeText(`${shareText} — ${shareUrl}`);
    } catch {
      // Clipboard access failed; nothing more to do.
    }
  }

  // Ask the browser for the current position.
  function handleUseLocation() {
    if (!("geolocation" in navigator)) {
      setLocationError("Geolocation is not supported by this browser.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

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
        <Topbar unit={unit} onChangeUnit={changeUnit} />

        <section className="welcome-section">
          <div>
            <p className="eyebrow">YOUR WEATHER, AT A GLANCE</p>
            <h1>Weather dashboard</h1>
            <p className="welcome-description">
              Discover current conditions wherever you are.
            </p>
          </div>

          <SearchArea
            searchInput={searchInput}
            onSearchInputChange={setSearchInput}
            onSearchSubmit={handleSearch}
            onSelectSuggestion={handleSelectSuggestion}
            onRecentCity={handleRecentCity}
            onUseLocation={handleUseLocation}
            isLocating={isLocating}
            locationError={locationError}
            recentCities={recentCities}
          />
        </section>

        {isError && <ErrorBanner errorMessage={errorMessage} />}

        {isLoading && !weather ? (
          <SkeletonDashboard />
        ) : weather ? (
          <>
            <HeroCard
              weather={weather}
              unitLabel={unitLabel}
              observationTime={observationTime}
              heroTheme={heroTheme}
              onShare={handleShare}
              onRefresh={() => void refresh()}
              isFetching={isFetching}
              formatSunTime={formatSunTime}
            />

            <MetricsSection
              weather={weather}
              unit={unit}
              unitLabel={unitLabel}
              formatTemperature={formatTemperature}
              formatValue={formatValue}
            />

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

              <HourlyForecast
                hourlyForecast={hourlyForecast}
                unit={unit}
                formatTemperature={formatTemperature}
                formatForecastTime={(time: string) => {
                  const date = new Date(time);
                  if (Number.isNaN(date.getTime())) return time;
                  return date.toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                }}
                formatValue={formatValue}
              />
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

              <DailyForecast
                dailyForecast={dailyForecast}
                unit={unit}
                formatTemperature={formatTemperature}
                formatForecastDay={(dateString: string, index: number) => {
                  if (index === 0) return "Today";
                  const date = new Date(`${dateString}T12:00:00`);
                  if (Number.isNaN(date.getTime())) return dateString;
                  return date.toLocaleDateString(undefined, {
                    weekday: "short",
                  });
                }}
                formatValue={formatValue}
              />
            </section>

            <PlaceholderGrid
              latitude={weather.latitude}
              longitude={weather.longitude}
            />
          </>
        ) : null}

        <AppFooter />
      </div>
    </main>
  );
}
