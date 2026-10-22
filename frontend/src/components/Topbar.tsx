import { CloudSun } from "lucide-react";

export interface TopbarProps {
  unit: "C" | "F";
  onChangeUnit: (unit: "C" | "F") => void;
}

export function Topbar({ unit, onChangeUnit }: TopbarProps) {
  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Weather dashboard home">
        <span className="brand-icon">
          <CloudSun size={25} />
        </span>
        <span>
          <strong>SkyWatch</strong>
          <small>Weather Monitoring</small>
        </span>
      </a>

      <div className="topbar-actions">
        <div className="header-status">
          <span className="status-dot" />
          Current weather
        </div>

        <div
          className="unit-toggle"
          role="group"
          aria-label="Temperature unit"
        >
          <button
            type="button"
            className={unit === "C" ? "is-active" : ""}
            aria-pressed={unit === "C"}
            onClick={() => onChangeUnit("C")}
          >
            °C
          </button>
          <button
            type="button"
            className={unit === "F" ? "is-active" : ""}
            aria-pressed={unit === "F"}
            onClick={() => onChangeUnit("F")}
          >
            °F
          </button>
        </div>
      </div>
    </header>
  );
}
