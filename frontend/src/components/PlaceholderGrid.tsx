import { Droplet, TriangleAlert, MapPin, Satellite, ExternalLink } from "lucide-react";

export interface PlaceholderGridProps {
  latitude: number;
  longitude: number;
}

export function PlaceholderGrid({ latitude, longitude }: PlaceholderGridProps) {
  return (
    <section className="placeholder-grid">
      <article className="placeholder-card">
        <div className="placeholder-heading">
          <Droplet size={23} />
          <h2>Flood monitoring</h2>
        </div>
        <p>View flood hazard maps for the Philippines with Project NOAH.</p>
        <a
          className="card-link"
          href="https://noah.up.edu.ph/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Droplet size={18} />
          Open Project NOAH
          <ExternalLink size={14} />
        </a>
      </article>

      <article className="placeholder-card">
        <div className="placeholder-heading">
          <TriangleAlert size={23} />
          <h2>Rain &amp; wind signals</h2>
        </div>
        <p>
          Monitor PAGASA rainfall and wind signal warnings across the
          Philippines.
        </p>
        <a
          className="card-link"
          href="https://www.pagasa.dost.gov.ph/tropical-cyclone/severe-weather-bulletin"
          target="_blank"
          rel="noopener noreferrer"
        >
          <TriangleAlert size={18} />
          Open PAGASA bulletin
          <ExternalLink size={14} />
        </a>
      </article>

      <article className="placeholder-card">
        <div className="placeholder-heading">
          <MapPin size={23} />
          <h2>Weather location</h2>
        </div>
        <p>
          Open live satellite imagery of the selected location on Zoom
          Earth.
        </p>
        <a
          className="card-link"
          href={`https://zoom.earth/maps/satellite/#view=${latitude.toFixed(4)},${longitude.toFixed(4)},8z/place=${latitude.toFixed(4)},${longitude.toFixed(4)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Satellite size={18} />
          View on Zoom Earth
          <ExternalLink size={14} />
        </a>
      </article>
    </section>
  );
}
