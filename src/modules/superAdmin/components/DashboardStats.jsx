import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

const DashboardStats = ({ metrics, metricConfig }) => {
  const [expanded, setExpanded] = useState(true);

  const normalizedMetrics = useMemo(() => metrics || {}, [metrics]);

  return (
    <section className="sa-stats-panel" aria-label="Dashboard summary statistics">
      <header className="sa-stats-panel__header">
        <div>
          <p className="sa-stats-panel__kicker">Workspace Summary</p>
          <h1 className="sa-stats-panel__title">Operational Overview</h1>
        </div>

        <button
          type="button"
          className={`sa-toggle-btn ${expanded ? "is-open" : ""}`}
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          aria-controls="sa-stats-grid"
        >
          <span>{expanded ? "Collapse" : "Expand"} summary</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </header>

      <div
        id="sa-stats-grid"
        className={`sa-stats-grid ${expanded ? "is-open" : "is-collapsed"}`}
      >
        {metricConfig.map(({ label, key, icon: Icon, color }) => {
          const value = Number(normalizedMetrics[key] || 0);

          return (
            <article key={key} className={`sa-stats-card ${color}`}>
              <div>
                <p>{label}</p>
                <strong>{value.toLocaleString()}</strong>
              </div>
              {Icon ? <Icon className="sa-stats-card__icon" aria-hidden="true" /> : null}
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default DashboardStats;
