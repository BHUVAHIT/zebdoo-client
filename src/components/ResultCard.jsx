import { memo, useState } from "react";
import PropTypes from "prop-types";

const ResultCard = ({ question, index }) => {
  const [expanded, setExpanded] = useState(index < 2);
  const selectedOption = question.options.find(
    (option) => option.id === question.selectedOptionId
  );
  const correctOption = question.options.find(
    (option) => option.id === question.correctAnswer
  );
  const explanation = question.explanation || question.solution || "No explanation available.";

  return (
    <article className={`result-card ${question.isCorrect ? "is-correct" : "is-incorrect"}`}>
      <header className="result-card__header">
        <div>
          <p className="result-card__meta">Question {index + 1}</p>
          <h3>{question.question}</h3>
        </div>
        <span className={`result-card__badge ${question.isCorrect ? "is-correct" : "is-incorrect"}`}>
          {question.selectedOptionId === null
            ? "Not Attempted"
            : question.isCorrect
            ? "Correct"
            : "Wrong"}
        </span>
      </header>

      <div className="result-card__options">
        {question.options.map((option) => {
          const isSelected = option.id === question.selectedOptionId;
          const isCorrect = option.id === question.correctAnswer;

          return (
            <div
              key={option.id}
              className={`result-option ${isCorrect ? "is-correct" : ""} ${
                isSelected && !isCorrect ? "is-selected-wrong" : ""
              }`}
            >
              <span className="result-option__label">{option.id.toUpperCase()}</span>
              <span>{option.text}</span>
            </div>
          );
        })}
      </div>

      <div className="result-card__answerline">
        <span>
          Your answer: {selectedOption ? selectedOption.text : "Not answered"}
        </span>
        <span>
          Correct answer: {correctOption ? correctOption.text : "-"}
        </span>
      </div>

      <button
        type="button"
        className="result-card__solution-toggle"
        onClick={() => setExpanded((previous) => !previous)}
      >
        {expanded ? "Hide Solution" : "View Solution"}
      </button>

      {expanded && (
        <section className="result-card__solution">
          <h4>Solution</h4>
          <p>{explanation}</p>
        </section>
      )}
    </article>
  );
};

ResultCard.propTypes = {
  question: PropTypes.shape({
    question: PropTypes.string.isRequired,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        text: PropTypes.string.isRequired,
      })
    ).isRequired,
    correctAnswer: PropTypes.string.isRequired,
    selectedOptionId: PropTypes.string,
    isCorrect: PropTypes.bool.isRequired,
    solution: PropTypes.string,
    explanation: PropTypes.string,
  }).isRequired,
  index: PropTypes.number.isRequired,
};

export default memo(ResultCard);