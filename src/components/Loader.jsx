const Loader = ({ count = 6, className = "exam-vault-skeleton-grid" }) => {
  return (
    <div
      className={className}
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      {Array.from({ length: count }, (_, index) => (
        <article key={`skeleton-${index}`} className="exam-vault-skeleton-card" />
      ))}
    </div>
  );
};

export default Loader;