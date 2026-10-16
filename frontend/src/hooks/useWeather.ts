import { useQuery } from "@tanstack/react-query";
import { getCurrentWeather, getWeatherByCoords } from "../services/weatherApi";

// Describe what kind of location the weather should be loaded for.
export type WeatherTarget =
  | { kind: "city"; city: string }
  | {
      kind: "coords";
      latitude: number;
      longitude: number;
      label?: string;
    };

// Define the custom hook for loading and managing current weather.
export function useWeather(target: WeatherTarget) {
  // Determine whether the request uses a city name or coordinates.
  const isCity = target.kind === "city";

  // Remove unnecessary spaces from the city name.
  const trimmedCity = isCity ? target.city.trim() : "";

  // Only run the query when the target has usable values.
  const isEnabled = isCity
    ? trimmedCity.length > 0
    : Number.isFinite(target.latitude) && Number.isFinite(target.longitude);

  // Fetch and cache weather data using the selected target as the query key.
  const query = useQuery({
    // Store separate cached results for each city or coordinate pair.
    queryKey: [
      "weather",
      target.kind,
      target.kind === "city"
        ? target.city.trim()
        : `${target.latitude},${target.longitude},${target.label ?? ""}`,
    ],

    // Call the matching Axios service to retrieve current weather.
    queryFn: () =>
      target.kind === "city"
        ? getCurrentWeather(target.city)
        : getWeatherByCoords(target.latitude, target.longitude, target.label),

    // Do not fetch weather when the target is incomplete.
    enabled: isEnabled,

    // Keep cached weather fresh for 2 minutes.
    staleTime: 2 * 60 * 1000,

    // Retry transient failures once, but do not retry client errors.
    retry: (failureCount, error) => {
      if (
        error instanceof Error &&
        "status" in error &&
        typeof error.status === "number" &&
        error.status >= 400 &&
        error.status < 500
      ) {
        return false;
      }

      return failureCount < 1;
    },
  });

  // Return the weather data and useful request states to the component.
  return {
    // Current weather response, or undefined before data loads.
    weather: query.data,

    // True when no cached data exists and the first request is running.
    isLoading: query.isLoading,

    // True whenever a request is running, including background refreshes.
    isFetching: query.isFetching,

    // True when the request fails.
    isError: query.isError,

    // The error thrown by the API service, if one exists.
    error: query.error,

    // True when a previous successful request can still be displayed.
    hasWeather: query.data !== undefined,

    // Timestamp of the most recent successful fetch.
    updatedAt: query.dataUpdatedAt,

    // Manually fetch the weather again.
    refresh: query.refetch,
  };
}
