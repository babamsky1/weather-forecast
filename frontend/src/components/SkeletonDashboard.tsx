// Render a loading skeleton dashboard while the first request is in flight.
export function SkeletonDashboard() {
  return (
    <section
      className="skeleton-dashboard"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Getting the latest weather...</span>

      <div className="skeleton skeleton-hero" />

      <div className="skeleton-metrics">
        {[0, 1, 2, 3].map((index) => (
          <div className="skeleton skeleton-metric" key={index} />
        ))}
      </div>

      <div className="skeleton-hours">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div className="skeleton skeleton-hour" key={index} />
        ))}
      </div>

      <div className="skeleton-lines">
        {[0, 1, 2].map((index) => (
          <div className="skeleton skeleton-line" key={index} />
        ))}
      </div>
    </section>
  );
}
