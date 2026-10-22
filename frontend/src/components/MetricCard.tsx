import { Droplets, Droplet, Gauge, Eye, Thermometer, Wind, CloudRain } from "lucide-react";

export interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  caption: React.ReactNode;
}

export function MetricCard({ icon, label, value, caption }: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-icon">{icon}</div>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{caption}</span>
    </article>
  );
}

// Convenience mapping for each current-conditions metric so App.tsx stays tidy.
export function humidityIcon() {
  return <Droplets size={22} />;
}
export function windIcon() {
  return <Wind size={22} />;
}
export function rainIcon() {
  return <CloudRain size={22} />;
}
export function temperatureIcon() {
  return <Thermometer size={22} />;
}
export function pressureIcon() {
  return <Gauge size={22} />;
}
export function dewpointIcon() {
  return <Droplet size={22} />;
}
export function visibilityIcon() {
  return <Eye size={22} />;
}
