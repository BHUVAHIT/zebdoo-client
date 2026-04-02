import { memo, useState } from "react";
import PropTypes from "prop-types";

const OPTION_LABELS = ["A", "B", "C", "D"];

const AttemptQuestionCard = ({
  question,
  index,
  selectedOption,
  isMarkedForReview,
  isBookmarked,
  note,
  timeSpentSeconds,
  isActive,
  showHint,
  onSelect,
  onClear,
  onToggleMark,
  onToggleBookmark,
  onSaveNote,
  onFocus,
}) => {
  const [draftNote, setDraftNote] = useState(note);

  const hasAnswer = selectedOption !== null && selectedOption !== undefined;

  return (
    <article
      className={`mcq-question-card ${isActive ? "is-active" : ""}`}
      id={`question-${index + 1}`}
      tabIndex={0}
      onFocusCapture={onFocus}
      onClickCapture={onFocus}
    >
      <header className="mcq-question-card__header">
        <div>
          <p>Question {index + 1}</p>
          <h3>{question.question}</h3>
        </div>
        <div className="mcq-question-card__actions">
          <button
            type="button"
            className={`btn-chip ${isMarkedForReview ? "is-active" : ""}`}
            onClick={() => onToggleMark(question.id)}
          >
            {isMarkedForReview ? "Unmark" : "Mark"}
          </button>
          <button
            type="button"
            className={`btn-chip ${isBookmarked ? "is-active" : ""}`}
            onClick={() => onToggleBookmark(question.id)}
          >
            {isBookmarked ? "Bookmarked" : "Bookmark"}
          </button>
          <button
            type="button"
            className="btn-chip btn-chip--ghost"
            onClick={() => onClear(question.id)}
            disabled={!hasAnswer}
          >
            Clear
          </button>
        </div>
      </header>

      <div className="mcq-question-card__status-row">
        <span className={`mcq-status-pill ${hasAnswer ? "is-answered" : "is-unanswered"}`}>
          {hasAnswer ? "Answered" : "Not Answered"}
        </span>
        {isMarkedForReview ? <span className="mcq-status-pill is-marked">Marked</span> : null}
        {isBookmarked ? <span className="mcq-status-pill is-bookmarked">Bookmarked</span> : null}
        <span className="mcq-status-pill is-time">
          Time: <strong>{Math.max(Number(timeSpentSeconds) || 0, 0)}s</strong>
        </span>
      </div>

      <div className="mcq-question-card__options" role="radiogroup" aria-label={`Question ${index + 1} options`}>
        {question.options.map((option, optionIndex) => {
          const isSelected = option.id === selectedOption;

          return (
            <button
              type="button"
              key={option.id}
              className={`mcq-option ${isSelected ? "is-selected" : ""}`}
              onClick={() => onSelect(question.id, option.id)}
              role="radio"
              aria-checked={isSelected}
            >
              <span className="mcq-option__label">{OPTION_LABELS[optionIndex] || option.id}</span>
              <span className="mcq-option__text">{option.text}</span>
              <span className={`mcq-option__radio ${isSelected ? "is-selected" : ""}`} />
            </button>
          );
        })}
      </div>

      {showHint ? (
        <p className="mcq-question-card__hint">
          <strong>Concept hint:</strong>{" "}
          {question.explanation || "Eliminate distractors, then verify scope and exclusions."}
        </p>
      ) : null}

      <label className="mcq-question-card__note">
        <span>Personal note</span>
        <textarea
          rows={2}
          value={draftNote}
          placeholder="Write a short concept note for revision"
          onChange={(event) => setDraftNote(event.target.value)}
          onBlur={() => onSaveNote(question.id, draftNote)}
        />
      </label>
    </article>
  );
};

AttemptQuestionCard.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string.isRequired,
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  index: PropTypes.number.isRequired,
  selectedOption: PropTypes.string,
  isMarkedForReview: PropTypes.bool,
  isBookmarked: PropTypes.bool,
  note: PropTypes.string,
  timeSpentSeconds: PropTypes.number,
  isActive: PropTypes.bool,
  showHint: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onToggleMark: PropTypes.func.isRequired,
  onToggleBookmark: PropTypes.func.isRequired,
  onSaveNote: PropTypes.func.isRequired,
  onFocus: PropTypes.func.isRequired,
};

AttemptQuestionCard.defaultProps = {
  selectedOption: null,
  isMarkedForReview: false,
  isBookmarked: false,
  note: "",
  timeSpentSeconds: 0,
  isActive: false,
  showHint: false,
};

export default memo(AttemptQuestionCard);
