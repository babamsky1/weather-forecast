import { MetricCard, humidityIcon, windIcon, rainIcon, temperatureIcon, pressureIcon, dewpointIcon, visibilityIcon } from "./MetricCard";
import { WindDirection } from "./WindDirection";

export interface MetricsSectionProps {
  weather: NonNullable<import("../types/weather").CurrentWeather>;
  unit: "C" | "F";
  unitLabel: string;
  formatTemperature: (value: number | null | undefined, unit: "C" | "F") => string;
  formatValue: (value: number | null | undefined) => string;
}

export function MetricsSection({
  weather,
  unit,
  unitLabel,
  formatTemperature,
  formatValue,
}: MetricsSectionProps) {
  return (
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
        <MetricCard
          icon={humidityIcon()}
          label="Humidity"
          value={`${formatValue(weather.humidity)}%`}
          caption="Relative humidity"
        />

        <MetricCard
          icon={windIcon()}
          label="Wind speed"
          value={
            <>
              {formatValue(weather.wind_speed)}
              <small> {weather.units.wind_speed_10m ?? "km/h"}</small>
            </>
          }
          caption={
            <>
              {weather.wind_direction !== null ? (
                <WindDirection degrees={weather.wind_direction} />
              ) : (
                "—"
              )}
            </>
          }
        />

        <MetricCard
          icon={rainIcon()}
          label="Precipitation"
          value={
            <>
              {formatValue(weather.precipitation)}
              <small> {weather.units.precipitation ?? "mm"}</small>
            </>
          }
          caption="Current precipitation"
        />

        <MetricCard
          icon={temperatureIcon()}
          label="Feels like"
          value={
            <>
              {formatTemperature(weather.feels_like, unit)}
              <small> {unitLabel}</small>
            </>
          }
          caption="Apparent temperature"
        />

        <MetricCard
          icon={pressureIcon()}
          label="Pressure"
          value={
            <>
              {formatValue(weather.pressure)}
              <small> {weather.units.pressure ?? "hPa"}</small>
            </>
          }
          caption="Atmospheric pressure"
        />

        <MetricCard
          icon={dewpointIcon()}
          label="Dew point"
          value={
            <>
              {formatTemperature(weather.dewpoint, unit)}
              <small> {unitLabel}</small>
            </>
          }
          caption="Dew point temperature"
        />

        <MetricCard
          icon={visibilityIcon()}
          label="Visibility"
          value={
            <>
              {formatValue(weather.visibility)}
              <small> {weather.units.visibility ?? "km"}</small>
            </>
          }
          caption="Horizontal visibility"
        />
      </div>
    </section>
  );
}
