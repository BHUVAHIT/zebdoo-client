import PropTypes from "prop-types";
import PaginationBar from "../../components/PaginationBar";

const PaginationControls = ({
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onJumpToQuestion,
  totalQuestions,
}) => {
  return (
    <PaginationBar
      currentPage={currentPage}
      totalPages={totalPages}
      pageSize={pageSize}
      totalItems={totalQuestions}
      pageSizeOptions={[5, 10]}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      onJump={(targetQuestion) => {
        onJumpToQuestion(targetQuestion - 1);
      }}
      jumpMax={totalQuestions}
    />
  );
};

PaginationControls.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  pageSize: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  onPageSizeChange: PropTypes.func.isRequired,
  onJumpToQuestion: PropTypes.func.isRequired,
  totalQuestions: PropTypes.number.isRequired,
};

export default PaginationControls;
