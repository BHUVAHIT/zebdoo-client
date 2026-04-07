import { Bookmark, BookmarkCheck, ExternalLink } from "lucide-react";

const PaperCard = ({ paper, onOpen, isBookmarked = false, onToggleBookmark }) => {
  return (
    <article className="exam-vault-paper-card">
      <header>
        <span className="exam-vault-paper-card__year">{paper.year}</span>
        <small>{paper.chapterName}</small>
      </header>

      <h4>{paper.title}</h4>
      <div className="exam-vault-paper-card__meta">
        <span>{paper.typeLabel}</span>
        <span className={`exam-vault-paper-card__difficulty is-${String(paper.difficulty || "medium").toLowerCase()}`}>
          {paper.difficulty || "Medium"}
        </span>
      </div>

      <footer>
        <button type="button" className="exam-vault-paper-card__btn exam-vault-paper-card__btn--save" onClick={() => onToggleBookmark?.(paper)}>
          {isBookmarked ? <BookmarkCheck size={14} aria-hidden="true" /> : <Bookmark size={14} aria-hidden="true" />}
          <span>{isBookmarked ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className="exam-vault-paper-card__btn exam-vault-paper-card__btn--open" onClick={() => onOpen?.(paper)}>
          <ExternalLink size={14} aria-hidden="true" />
          <span>Open PDF</span>
        </button>
      </footer>
    </article>
  );
};

export default PaperCard;
