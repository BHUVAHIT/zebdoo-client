const ChapterCard = ({ chapter, selected = false, onSelect }) => {
  return (
    <button
      type="button"
      className={`exam-vault-chapter-card ${selected ? "is-selected" : ""}`}
      onClick={() => onSelect?.(chapter)}
      aria-pressed={selected}
    >
      <strong>{chapter.title || chapter.name}</strong>
      <p>{chapter.summary || "Chapter-specific paper bundle"}</p>
    </button>
  );
};

export default ChapterCard;
