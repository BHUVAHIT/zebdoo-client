import { memo } from "react";
import PropTypes from "prop-types";
import { QUESTION_STATE } from "../utils/constants";
import { getQuestionStatus } from "../utils/helpers";

const LEGEND = [
  { key: QUESTION_STATE.NOT_VISITED, label: "Not Visited" },
  { key: QUESTION_STATE.ANSWERED, label: "Answered" },
  { key: QUESTION_STATE.NOT_ANSWERED, label: "Not Answered" },
  { key: QUESTION_STATE.MARKED, label: "Marked Review" },
  { key: QUESTION_STATE.CURRENT, label: "Current" },
];

const QuestionPalette = ({
  questions,
  currentIndex,
  answers,
  visited,
  markedForReview,
  onQuestionSelect,
}) => {
  return (
    <aside className="question-palette" aria-label="Question palette">
      <div className="question-palette__head">
        <h3>Question Palette</h3>
        <p>Jump to any question instantly</p>
      </div>

      <div className="question-palette__legend">
        {LEGEND.map((item) => (
          <div className="legend-item" key={item.key}>
            <span className={`legend-dot is-${item.key}`} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>

      <div className="question-palette__grid">
        {questions.map((question, index) => {
          const status = getQuestionStatus({
            question,
            index,
            currentIndex,
            answers,
            visited,
            markedForReview,
          });

          return (
            <button
              key={question.id}
              type="button"
              className={`palette-item is-${status}`}
              onClick={() => onQuestionSelect(index)}
              aria-label={`Open question ${index + 1}`}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </aside>
  );
};

QuestionPalette.propTypes = {
  questions: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
    })
  ).isRequired,
  currentIndex: PropTypes.number.isRequired,
  answers: PropTypes.objectOf(PropTypes.string).isRequired,
  visited: PropTypes.objectOf(PropTypes.bool).isRequired,
  markedForReview: PropTypes.objectOf(PropTypes.bool).isRequired,
  onQuestionSelect: PropTypes.func.isRequired,
};

export default memo(QuestionPalette);