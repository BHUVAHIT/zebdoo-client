const ProgressTracker = ({
  label,
  current,
  total,
  tone = "focus",
  helper,
}) => {
  const safeTotal = Math.max(Number(total) || 0, 1);
  const safeCurrent = Math.min(Math.max(Number(current) || 0, 0), safeTotal);
  const progress = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <article className={`ux-progress ux-progress--${tone}`} aria-label={label}>
      <header>
        <p>{label}</p>
        <strong>{progress}%</strong>
      </header>
      <div className="ux-progress__track" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>
      <footer>
        <span>
          {safeCurrent}/{safeTotal}
        </span>
        {helper ? <em>{helper}</em> : null}
      </footer>
    </article>
  );
};

export default ProgressTracker;
