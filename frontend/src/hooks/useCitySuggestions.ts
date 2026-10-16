import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getCitySuggestions } from "../services/weatherApi";

// Return a value that only updates after the delay has passed.
export function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    // Wait for the delay before publishing the latest value.
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);

    // Cancel the pending update when the value changes quickly.
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Load city suggestions for the current search text.
export function useCitySuggestions(query: string) {
  // Delay requests so typing does not trigger a request per keystroke.
  const debouncedQuery = useDebouncedValue(query, 250);

  // Trim the debounced query before using it.
  const trimmedQuery = debouncedQuery.trim();

  // Fetch suggestions only once the query is meaningful.
  const suggestionsQuery = useQuery({
    queryKey: ["city-suggestions", trimmedQuery],
    queryFn: () => getCitySuggestions(trimmedQuery),
    enabled: trimmedQuery.length >= 2,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Return the suggestion list, defaulting to an empty array.
  return suggestionsQuery.data ?? [];
}
