import { Droplets, CloudRain } from "lucide-react";
import { ForecastIcon } from "./ForecastIcon";
import { getWeatherCondition } from "../lib/conditions";

export interface DailyForecastProps {
  dailyForecast: import("../types/weather").DailyForecast[];
  unit: "C" | "F";
  formatTemperature: (value: number | null | undefined, unit: "C" | "F") => string;
  formatForecastDay: (dateString: string, index: number) => string;
  formatValue: (value: number | null | undefined) => string;
}

export function DailyForecast({
  dailyForecast,
  unit,
  formatTemperature,
  formatForecastDay,
  formatValue,
}: DailyForecastProps) {
  if (dailyForecast.length === 0) {
    return (
      <div className="forecast-empty">
        Daily forecast data is not available.
      </div>
    );
  }

  return (
    <div className="daily-forecast-list">
      <div className="daily-forecast-head" aria-hidden="true">
        <span>Day</span>
        <span>Condition</span>
        <span>Chance of rain</span>
        <span>Rain (mm)</span>
        <span className="daily-head-temperatures">High / Low</span>
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
  );
}
