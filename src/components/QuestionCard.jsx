import { memo } from "react";
import PropTypes from "prop-types";
import OptionItem from "./OptionItem";

const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];

const QuestionCard = ({
  question,
  questionNumber,
  totalQuestions,
  selectedOptionId,
  isMarkedForReview,
  onSelectOption,
  onClearAnswer,
  onToggleMarkForReview,
}) => {
  return (
    <section className="question-card" aria-live="polite">
      <header className="question-card__header">
        <div>
          <p className="question-card__meta">Question {questionNumber} of {totalQuestions}</p>
          <h2 className="question-card__title">{question.question}</h2>
        </div>
        <div className="question-card__actions">
          <button
            type="button"
            className={`btn-chip ${isMarkedForReview ? "is-active" : ""}`}
            onClick={() => onToggleMarkForReview(question.id)}
          >
            {isMarkedForReview ? "Unmark Review" : "Mark for Review"}
          </button>
          <button
            type="button"
            className="btn-chip btn-chip--ghost"
            onClick={() => onClearAnswer(question.id)}
            disabled={selectedOptionId === null || selectedOptionId === undefined}
          >
            Clear Answer
          </button>
        </div>
      </header>

      <div className="question-card__options">
        {question.options.map((option, index) => (
          <OptionItem
            key={option.id}
            option={option}
            optionLabel={OPTION_LABELS[index] ?? String(index + 1)}
            isSelected={selectedOptionId === option.id}
            onSelect={() => onSelectOption(question.id, option.id)}
          />
        ))}
      </div>
    </section>
  );
};

QuestionCard.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.number.isRequired,
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
  }).isRequired,
  questionNumber: PropTypes.number.isRequired,
  totalQuestions: PropTypes.number.isRequired,
  selectedOptionId: PropTypes.string,
  isMarkedForReview: PropTypes.bool,
  onSelectOption: PropTypes.func.isRequired,
  onClearAnswer: PropTypes.func.isRequired,
  onToggleMarkForReview: PropTypes.func.isRequired,
};

QuestionCard.defaultProps = {
  selectedOptionId: null,
  isMarkedForReview: false,
};

export default memo(QuestionCard);