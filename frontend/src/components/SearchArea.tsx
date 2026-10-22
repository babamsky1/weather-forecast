import { useState, type FormEvent } from "react";
import { Search, MapPin, LocateFixed } from "lucide-react";
import { useCitySuggestions } from "../hooks/useCitySuggestions";
import type { CitySuggestion } from "../services/weatherApi";

export interface SearchAreaProps {
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onSearchSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onSelectSuggestion: (suggestion: CitySuggestion) => void;
  onRecentCity: (city: string) => void;
  onUseLocation: () => void;
  isLocating: boolean;
  locationError: string | null;
  recentCities: string[];
}

export function SearchArea({
  searchInput,
  onSearchInputChange,
  onSearchSubmit,
  onSelectSuggestion,
  onRecentCity,
  onUseLocation,
  isLocating,
  locationError,
  recentCities,
}: SearchAreaProps) {
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = useCitySuggestions(searchInput);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      showSuggestions &&
      activeSuggestionIndex >= 0 &&
      suggestions[activeSuggestionIndex]
    ) {
      onSelectSuggestion(suggestions[activeSuggestionIndex]);
      return;
    }

    onSearchSubmit(event);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) =>
        (current + 1) % suggestions.length,
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

  function handleRecentCity(city: string) {
    onRecentCity(city);
    setShowSuggestions(false);
    setActiveSuggestionIndex(-1);
  }

  return (
    <div className="search-area">
      <form className="search-form" onSubmit={handleSubmit}>
        <Search size={19} aria-hidden="true" />

        <input
          type="search"
          value={searchInput}
          onChange={(event) => {
            onSearchInputChange(event.target.value);
            setShowSuggestions(true);
            setActiveSuggestionIndex(-1);
          }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() =>
            window.setTimeout(() => setShowSuggestions(false), 150)
          }
          onKeyDown={handleKeyDown}
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
          onClick={onUseLocation}
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
          {suggestions.map((suggestion, index) => {
            const region = [
              suggestion.admin1,
              suggestion.country,
            ]
              .filter(Boolean)
              .join(", ");

            return (
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
                  onClick={() => onSelectSuggestion(suggestion)}
                >
                  <MapPin size={15} />
                  <span className="suggestion-name">{suggestion.name}</span>
                  <span className="suggestion-region">{region}</span>
                </button>
              </li>
            );
          })}
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
        <p className="search-message" role="alert">{locationError}</p>
      )}
    </div>
  );
}
