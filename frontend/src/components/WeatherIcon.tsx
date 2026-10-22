import { CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from "lucide-react";

// Select a weather icon based on the weather description.
export function WeatherIcon({ condition }: { condition: string }) {
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
    normalizedCondition.includes("overcast") ||
    normalizedCondition.includes("mainly clear")
  ) {
    return <CloudSun size={76} strokeWidth={1.4} />;
  }

  // "Clear sky" is the only genuinely sunny condition.
  return <Sun size={76} strokeWidth={1.4} />;
}
