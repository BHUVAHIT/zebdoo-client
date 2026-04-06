import { ExternalLink } from "lucide-react";

const PaperCard = ({ paper, onOpen }) => {
  return (
    <article className="exam-vault-paper-card">
      <header>
        <span className="exam-vault-paper-card__year">{paper.year}</span>
        <small>{paper.chapterName}</small>
      </header>

      <h4>{paper.title}</h4>

      <footer>
        <span>{paper.typeLabel}</span>
        <button type="button" onClick={() => onOpen?.(paper)}>
          <ExternalLink size={14} aria-hidden="true" />
          <span>Open PDF</span>
        </button>
      </footer>
    </article>
  );
};

export default PaperCard;
