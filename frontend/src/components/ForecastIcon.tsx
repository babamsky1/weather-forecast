import {
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Snowflake,
  Sun,
} from "lucide-react";
import { getWeatherCondition } from "../lib/conditions";

// Show a smaller icon for a forecast item.
export function ForecastIcon({ code, size = 25 }: { code: number | null; size?: number }) {
  const condition = getWeatherCondition(code);
  const normalizedCondition = condition.toLowerCase();

  if (normalizedCondition.includes("thunder")) {
    return <CloudLightning size={size} />;
  }

  if (
    normalizedCondition.includes("rain") ||
    normalizedCondition.includes("drizzle") ||
    normalizedCondition.includes("shower")
  ) {
    return <CloudRain size={size} />;
  }

  if (normalizedCondition.includes("snow")) {
    return <Snowflake size={size} />;
  }

  if (
    normalizedCondition.includes("fog") ||
    normalizedCondition.includes("rime")
  ) {
    return <CloudFog size={size} />;
  }

  if (
    normalizedCondition.includes("cloud") ||
    normalizedCondition.includes("overcast")
  ) {
    return <CloudSun size={size} />;
  }

  return <Sun size={size} />;
}
