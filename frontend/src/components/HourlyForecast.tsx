import { Droplets } from "lucide-react";
import { ForecastIcon } from "./ForecastIcon";

export interface HourlyForecastProps {
  hourlyForecast: import("../types/weather").HourlyForecast[];
  unit: "C" | "F";
  formatTemperature: (value: number | null | undefined, unit: "C" | "F") => string;
  formatForecastTime: (time: string) => string;
  formatValue: (value: number | null | undefined) => string;
}

export function HourlyForecast({
  hourlyForecast,
  unit,
  formatTemperature,
  formatForecastTime,
  formatValue,
}: HourlyForecastProps) {
  if (hourlyForecast.length === 0) {
    return (
      <div className="forecast-empty">
        Hourly forecast data is not available.
      </div>
    );
  }

  return (
    <div className="hourly-forecast-grid">
      {hourlyForecast.map((hour, index) => (
        <article className="hourly-card" key={`${hour.time}-${index}`}>
          <p className="forecast-time">{formatForecastTime(hour.time)}</p>

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
  );
}
