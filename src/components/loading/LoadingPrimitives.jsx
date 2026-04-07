const clampCount = (value, fallback = 1) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return fallback;
  }

  return Math.floor(numericValue);
};

export const CardGridSkeleton = ({
  count = 6,
  className = "app-skeleton-grid",
  cardClassName = "app-skeleton-card",
  ariaLabel = "Loading content",
}) => {
  const safeCount = clampCount(count, 1);

  return (
    <div className={className} role="status" aria-live="polite" aria-label={ariaLabel}>
      {Array.from({ length: safeCount }, (_, index) => (
        <article key={`skeleton-card-${index}`} className={cardClassName} aria-hidden="true" />
      ))}
    </div>
  );
};

export const TableSkeleton = ({
  rows = 6,
  columns = 5,
  className = "",
  ariaLabel = "Loading table data",
}) => {
  const safeRows = clampCount(rows, 1);
  const safeColumns = clampCount(columns, 1);
  const columnStyle = { "--skeleton-columns": safeColumns };

  return (
    <div
      className={`app-skeleton-table ${className}`.trim()}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      style={columnStyle}
    >
      <div className="app-skeleton-table__head" aria-hidden="true">
        {Array.from({ length: safeColumns }, (_, index) => (
          <span key={`skeleton-head-${index}`} className="app-skeleton-table__head-cell" />
        ))}
      </div>
      <div className="app-skeleton-table__body" aria-hidden="true">
        {Array.from({ length: safeRows }, (_, rowIndex) => (
          <div key={`skeleton-row-${rowIndex}`} className="app-skeleton-table__row">
            {Array.from({ length: safeColumns }, (_, cellIndex) => (
              <span key={`skeleton-cell-${rowIndex}-${cellIndex}`} className="app-skeleton-table__cell" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const PageContentSkeleton = ({
  title = "Loading workspace...",
  description = "Please wait while we prepare your view.",
  className = "",
}) => (
  <div className={`route-loading-screen ${className}`.trim()} role="status" aria-live="polite">
    <div className="app-loader-brand" aria-hidden="true">
      <span className="app-loader-brand__dot" />
      <span className="app-loader-brand__dot" />
      <span className="app-loader-brand__dot" />
    </div>
    <p className="app-loader-title">{title}</p>
    <p className="app-loader-description">{description}</p>
    <div className="app-loader-lines" aria-hidden="true">
      <span className="app-loader-lines__line" />
      <span className="app-loader-lines__line" />
      <span className="app-loader-lines__line" />
    </div>
  </div>
);

export const InlineLoadingNotice = ({ label = "Syncing latest updates...", className = "" }) => (
  <p className={`app-inline-loading ${className}`.trim()} role="status" aria-live="polite">
    <span className="app-inline-loading__spinner" aria-hidden="true" />
    <span>{label}</span>
  </p>
);

export const ButtonBusyLabel = ({
  busy,
  idleLabel,
  busyLabel = "Processing...",
  className = "",
}) =>
  busy ? (
    <span className={`app-button-busy ${className}`.trim()}>
      <span className="app-button-busy__spinner" aria-hidden="true" />
      <span>{busyLabel}</span>
    </span>
  ) : (
    <span>{idleLabel}</span>
  );
