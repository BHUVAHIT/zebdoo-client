import { memo } from "react";
import PropTypes from "prop-types";

const hasAnswer = (value) => value !== null && value !== undefined;

const getQuestionStatus = ({ questionId, answers, visited, markedForReview, activeQuestionId }) => {
  const answered = hasAnswer(answers[questionId]);
  const marked = Boolean(markedForReview[questionId]);
  const seen = Boolean(visited[questionId]);

  if (questionId === activeQuestionId) return "active";
  if (marked && answered) return "marked-answered";
  if (marked) return "marked";
  if (answered) return "answered";
  if (seen) return "not-answered";
  return "new";
};

const QuestionPalette = ({
  questions,
  answers,
  visited,
  markedForReview,
  activeQuestionId,
  onQuestionPick,
}) => {
  const counts = questions.reduce(
    (acc, question) => {
      const questionId = question.id;
      const answered = hasAnswer(answers[questionId]);
      const marked = Boolean(markedForReview[questionId]);
      const seen = Boolean(visited[questionId]);

      if (answered) acc.answered += 1;
      if (marked) acc.marked += 1;
      if (seen && !answered) acc.notAnswered += 1;

      return acc;
    },
    {
      answered: 0,
      notAnswered: 0,
      marked: 0,
    }
  );

  return (
    <aside className="mcq-palette" aria-label="Question palette">
      <header>
        <h3>Question Navigator</h3>
        <p>Jump to any question directly</p>
      </header>

      <div className="mcq-palette__summary" aria-label="Question status summary">
        <span>
          <strong>{counts.answered}</strong> Answered
        </span>
        <span>
          <strong>{counts.notAnswered}</strong> Not Answered
        </span>
        <span>
          <strong>{counts.marked}</strong> Marked
        </span>
      </div>

      <div className="mcq-palette__legend">
        <span className="is-new">Not Visited</span>
        <span className="is-not-answered">Not Answered</span>
        <span className="is-answered">Answered</span>
        <span className="is-marked">Marked</span>
        <span className="is-marked-answered">Marked + Answered</span>
        <span className="is-active">Active</span>
      </div>

      <div className="mcq-palette__grid">
        {questions.map((question, index) => {
          const status = getQuestionStatus({
            questionId: question.id,
            answers,
            visited,
            markedForReview,
            activeQuestionId,
          });

          return (
            <button
              type="button"
              key={question.id}
              className={`mcq-palette__item is-${status}`}
              onClick={() => onQuestionPick(index)}
              aria-label={`Go to question ${index + 1}`}
              aria-current={question.id === activeQuestionId ? "true" : undefined}
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
      id: PropTypes.string.isRequired,
    })
  ).isRequired,
  answers: PropTypes.objectOf(PropTypes.string).isRequired,
  visited: PropTypes.objectOf(PropTypes.bool).isRequired,
  markedForReview: PropTypes.objectOf(PropTypes.bool).isRequired,
  activeQuestionId: PropTypes.string,
  onQuestionPick: PropTypes.func.isRequired,
};

QuestionPalette.defaultProps = {
  activeQuestionId: null,
};

export default memo(QuestionPalette);
