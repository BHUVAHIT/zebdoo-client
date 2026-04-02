import { useMemo } from "react";
import StyledSelect from "./StyledSelect";

const getVisiblePages = (current, total) => {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const left = Math.max(current - 1, 1);
  const right = Math.min(current + 1, total);
  const pages = [1, left, current, right, total];

  return [...new Set(pages)].sort((a, b) => a - b);
};

const ModernPagination = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}) => {
  const safeTotalPages = Math.max(totalPages, 1);
  const safeCurrent = Math.min(Math.max(currentPage, 1), safeTotalPages);
  const rangeStart = totalItems === 0 ? 0 : (safeCurrent - 1) * pageSize + 1;
  const rangeEnd = Math.min(safeCurrent * pageSize, totalItems);

  const pages = useMemo(
    () => getVisiblePages(safeCurrent, safeTotalPages),
    [safeCurrent, safeTotalPages]
  );

  return (
    <footer className="sa-pagination" aria-label="Pagination controls">
      <p className="sa-pagination__summary">
        Showing {rangeStart}-{rangeEnd} of {totalItems}
      </p>

      <div className="sa-pagination__controls">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(safeCurrent - 1, 1))}
          disabled={safeCurrent <= 1}
          className="sa-pagination__btn"
        >
          Prev
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          {pages.map((page, index) => {
            const previous = pages[index - 1];
            const showEllipsis = previous && page - previous > 1;

            return (
              <div className="flex items-center gap-2" key={page}>
                {showEllipsis ? <span className="text-slate-400">...</span> : null}
                <button
                  type="button"
                  onClick={() => onPageChange(page)}
                  className={`sa-pagination__btn ${page === safeCurrent ? "is-active" : ""}`}
                >
                  {page}
                </button>
              </div>
            );
          })}
        </div>

        <p className="m-0 text-xs font-semibold text-slate-500 sm:hidden">
          Page {safeCurrent} of {safeTotalPages}
        </p>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(safeCurrent + 1, safeTotalPages))}
          disabled={safeCurrent >= safeTotalPages}
          className="sa-pagination__btn"
        >
          Next
        </button>
      </div>

      <div className="w-full sm:w-[170px] sm:ml-auto">
        <StyledSelect
          label="Rows"
          value={pageSize}
          options={(pageSizeOptions || []).map((size) => ({
            label: `${size} / page`,
            value: size,
          }))}
          onChange={(nextSize) => onPageSizeChange(Number(nextSize))}
          compact
        />
      </div>
    </footer>
  );
};

export default ModernPagination;
