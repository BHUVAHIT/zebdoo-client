import { memo } from "react";

const QuestionBankCard = ({
  question,
  index,
  noteValue,
  onToggleBookmark,
  onToggleLearned,
  onNoteChange,
  onSaveNote,
}) => (
  <article className="sqb-card">
    <header className="sqb-card__header">
      <div>
        <p className="sqb-card__meta">
          Q{index + 1} | {question.subjectName} | {question.chapterName} | {question.difficultyLabel}
        </p>
        <h2>{question.question}</h2>
      </div>

      <div className="sqb-card__actions">
        <button
          type="button"
          className={`sqb-chip ${question.isBookmarked ? "is-active" : ""}`}
          onClick={() => onToggleBookmark(question)}
        >
          {question.isBookmarked ? "Bookmarked" : "Bookmark"}
        </button>
        <button
          type="button"
          className={`sqb-chip ${question.isLearned ? "is-active" : ""}`}
          onClick={() => onToggleLearned(question)}
        >
          {question.isLearned ? "Learned" : "Mark Learned"}
        </button>
      </div>
    </header>

    <ul className="sqb-card__options">
      {question.options.map((option) => (
        <li key={option.id} className={option.id === question.correctAnswer ? "is-correct" : ""}>
          <strong>{option.id.toUpperCase()}.</strong> {option.text}
        </li>
      ))}
    </ul>

    <p className="sqb-card__answer">
      <strong>Correct Answer:</strong> {question.correctAnswerText}
    </p>
    <p className="sqb-card__explanation">
      <strong>Solution:</strong>{" "}
      {question.explanation ||
        "Identify the statutory condition first, then eliminate broad distractors."}
    </p>

    <label className="sqb-card__note">
      <span>Personal note</span>
      <textarea
        rows={2}
        value={noteValue}
        onChange={(event) => onNoteChange(question.id, event.target.value)}
        onBlur={() => onSaveNote(question)}
      />
    </label>
  </article>
);

export default memo(QuestionBankCard);
