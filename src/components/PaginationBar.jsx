import { useMemo, useState } from "react";
import "./paginationBar.css";

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getWindowedPages = (currentPage, totalPages, spread = 2) => {
  const start = Math.max(currentPage - spread, 1);
  const end = Math.min(currentPage + spread, totalPages);
  const pages = [];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  if (!pages.includes(1)) {
    pages.unshift(1);
  }

  if (!pages.includes(totalPages)) {
    pages.push(totalPages);
  }

  return [...new Set(pages)].sort((a, b) => a - b);
};

const PaginationBar = ({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  pageSizeOptions = [5, 10, 20, 50],
  onPageChange,
  onPageSizeChange,
  onJump,
  jumpMax,
}) => {
  const [jumpValue, setJumpValue] = useState("");

  const pages = useMemo(
    () => getWindowedPages(currentPage, Math.max(totalPages, 1)),
    [currentPage, totalPages]
  );

  const safeTotalPages = Math.max(totalPages, 1);
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);
  const effectiveJumpMax = Math.max(Number(jumpMax || safeTotalPages), 1);

  return (
    <footer className="app-pagination" aria-label="Pagination controls">
      <p className="app-pagination__meta">
        Showing {rangeStart}-{rangeEnd} of {totalItems}
      </p>

      <div className="app-pagination__controls">
        <button
          type="button"
          className="app-pagination__btn"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
        >
          Previous
        </button>

        <div className="app-pagination__pages" aria-label="Page numbers">
          {pages.map((page, index) => {
            const previous = pages[index - 1];
            const showEllipsis = previous && page - previous > 1;

            return (
              <span key={page} className="app-pagination__page-wrap">
                {showEllipsis ? <span className="app-pagination__ellipsis">...</span> : null}
                <button
                  type="button"
                  className={`app-pagination__page ${page === currentPage ? "is-active" : ""}`}
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </button>
              </span>
            );
          })}
        </div>

        <button
          type="button"
          className="app-pagination__btn"
          onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
          disabled={currentPage >= safeTotalPages}
        >
          Next
        </button>
      </div>

      <div className="app-pagination__settings">
        <label>
          Per page
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        {onJump ? (
          <form
            className="app-pagination__jump"
            onSubmit={(event) => {
              event.preventDefault();
              const parsed = Number(jumpValue);
              if (!Number.isFinite(parsed)) return;

              const clamped = clamp(Math.floor(parsed), 1, effectiveJumpMax);
              onJump(clamped);
              setJumpValue(String(clamped));
            }}
          >
            <input
              type="number"
              min={1}
              max={effectiveJumpMax}
              value={jumpValue}
              onChange={(event) => setJumpValue(event.target.value)}
              placeholder="Jump"
              aria-label="Jump to page"
            />
            <button type="submit" className="app-pagination__btn app-pagination__btn--primary">
              Go
            </button>
          </form>
        ) : null}
      </div>
    </footer>
  );
};

export default PaginationBar;
