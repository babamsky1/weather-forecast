import { MapPin, Moon, RefreshCw, Share } from "lucide-react";
import { WeatherIcon } from "./WeatherIcon";

export interface HeroCardProps {
  weather: NonNullable<import("../types/weather").CurrentWeather>;
  unitLabel: string;
  observationTime: string;
  heroTheme: string;
  onShare: () => void;
  onRefresh: () => void;
  isFetching: boolean;
  formatSunTime: (isoTime: string | null) => string;
}

export function HeroCard({
  weather,
  unitLabel,
  observationTime,
  heroTheme,
  onShare,
  onRefresh,
  isFetching,
  formatSunTime,
}: HeroCardProps) {
  return (
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
            {weather.temperature !== null && weather.temperature !== undefined
              ? weather.temperature
              : "—"}
          </span>
          <span className="temperature-unit">{unitLabel}</span>
        </div>

        <h2 className="condition-label">{weather.condition}</h2>

        <p className="feels-like">
          Feels like{" "}
          {weather.feels_like !== null && weather.feels_like !== undefined
            ? weather.feels_like
            : "—"}{unitLabel}
        </p>
      </div>

      <div className="hero-illustration" aria-hidden="true">
        <div className="illustration-glow" />
        <WeatherIcon condition={weather.condition} />
        {weather.is_day === 0 && <Moon className="night-moon" size={28} />}
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

        <div>
          <span className="hero-footer-label">SUNRISE</span>
          <strong>{formatSunTime(weather.daily_forecast[0]?.sunrise ?? null)}</strong>
        </div>

        <div>
          <span className="hero-footer-label">SUNSET</span>
          <strong>{formatSunTime(weather.daily_forecast[0]?.sunset ?? null)}</strong>
        </div>

        <div className="hero-footer-actions">
          <button
            className="share-button"
            type="button"
            onClick={onShare}
            title="Share weather"
            aria-label="Share weather"
          >
            <Share size={16} />
          </button>

          <button
            className="refresh-button"
            type="button"
            onClick={onRefresh}
            disabled={isFetching}
          >
            <RefreshCw
              size={16}
              className={isFetching ? "spinning" : ""}
            />
            {isFetching ? "Updating..." : "Refresh weather"}
          </button>
        </div>
      </div>
    </section>
  );
}
