import { useMemo } from "react";
import DataTable from "../../components/DataTable";
import RowActions from "../../components/RowActions";
import StyledSelect from "../../components/StyledSelect";

const QuestionTable = ({
  rows,
  search,
  onSearch,
  onAdd,
  sortBy,
  sortDir,
  onSort,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  subjectFilter,
  chapterFilter,
  difficultyFilter,
  subjectOptions,
  chapterOptions,
  onSubjectFilterChange,
  onChapterFilterChange,
  onDifficultyFilterChange,
  onClearFilters,
}) => {
  const columns = useMemo(
    () => [
      {
        key: "subjectName",
        label: "Subject",
        sortable: true,
        width: "170px",
        maxWidth: "170px",
      },
      {
        key: "chapterName",
        label: "Chapter",
        sortable: true,
        width: "180px",
        maxWidth: "180px",
      },
      {
        key: "difficulty",
        label: "Difficulty",
        sortable: true,
        width: "120px",
        maxWidth: "120px",
      },
      {
        key: "question",
        label: "Question",
        sortable: true,
        width: "460px",
        maxWidth: "460px",
      },
      {
        key: "actions",
        label: "Actions",
        width: "132px",
        maxWidth: "132px",
        render: (row) => <RowActions onEdit={() => onEdit(row)} onDelete={() => onDelete(row)} />,
      },
    ],
    [onDelete, onEdit]
  );

  const toolbarSlot = (
    <>
      <StyledSelect
        label="Subject"
        value={subjectFilter}
        onChange={onSubjectFilterChange}
        options={[
          { label: "All Subjects", value: "" },
          ...subjectOptions,
        ]}
        className="w-full sm:w-[220px]"
      />

      <StyledSelect
        label="Chapter"
        value={chapterFilter}
        onChange={onChapterFilterChange}
        disabled={!subjectFilter}
        options={[
          {
            label: subjectFilter ? "All Chapters" : "Select Subject First",
            value: "",
          },
          ...chapterOptions,
        ]}
        className="w-full sm:w-[220px]"
      />

      <StyledSelect
        label="Difficulty"
        value={difficultyFilter}
        onChange={onDifficultyFilterChange}
        options={[
          { label: "All Difficulty", value: "" },
          { label: "Easy", value: "Easy" },
          { label: "Medium", value: "Medium" },
          { label: "Hard", value: "Hard" },
        ]}
        className="w-full sm:w-[200px]"
      />

      <button type="button" className="sa-btn" onClick={onClearFilters}>
        Clear Filters
      </button>
    </>
  );

  return (
    <DataTable
      title="Question Bank"
      description="Manage question bank entries used in student study mode."
      columns={columns}
      rows={rows}
      loading={false}
      isFetching={false}
      error=""
      emptyMessage="No questions found. Add your first question to get started."
      search={search}
      onSearch={onSearch}
      onAdd={onAdd}
      addLabel="Add Question"
      sortBy={sortBy}
      sortDir={sortDir}
      onSort={onSort}
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      searchPlaceholder="Search by subject, chapter, question, or difficulty"
      toolbarSlot={toolbarSlot}
    />
  );
};

export default QuestionTable;
