import {
  Atom,
  BadgeIndianRupee,
  BookOpenText,
  BrainCircuit,
  Calculator,
  Scale,
} from "lucide-react";

const ICONS = [
  Calculator,
  Atom,
  BadgeIndianRupee,
  Scale,
  BrainCircuit,
  BookOpenText,
];

const SubjectCard = ({ subject, index = 0, onSelect }) => {
  const Icon = ICONS[index % ICONS.length];

  return (
    <article
      className="exam-vault-subject-card"
      onClick={() => onSelect?.(subject)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.(subject);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${subject.name} papers`}
    >
      <header className="exam-vault-subject-card__head">
        <span className="exam-vault-subject-card__icon" aria-hidden="true">
          <Icon size={18} />
        </span>
        <span className="exam-vault-subject-card__chip">{subject.paperCount || 0} papers</span>
      </header>

      <h3>{subject.name}</h3>
      <p>{subject.description || "Explore curated papers by chapter and syllabus mode."}</p>

      <footer>
        <strong>{subject.chapterCount || 0} chapters</strong>
        <span>Open Library</span>
      </footer>
    </article>
  );
};

export default SubjectCard;
