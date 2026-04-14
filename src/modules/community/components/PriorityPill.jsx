const PRIORITY_CLASS = {
  IMPORTANT: "is-important",
  EVENT: "is-event",
  UPDATE: "is-update",
  GENERAL: "is-general",
};

const PriorityPill = ({ priority }) => {
  const normalized = String(priority || "GENERAL").toUpperCase();
  const className = PRIORITY_CLASS[normalized] || PRIORITY_CLASS.GENERAL;
  const label = normalized.charAt(0) + normalized.slice(1).toLowerCase();

  return <span className={`community-priority ${className}`}>{label}</span>;
};

export default PriorityPill;
