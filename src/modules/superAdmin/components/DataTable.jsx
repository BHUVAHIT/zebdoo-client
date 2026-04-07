import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { PAGE_SIZE_OPTIONS } from "../types/entities";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import {
  InlineLoadingNotice,
  TableSkeleton,
} from "../../../components/loading/LoadingPrimitives";
import AdminTable from "./AdminTable";
import FiltersBar from "./FiltersBar";
import ModernPagination from "./ModernPagination";
import PageHeader from "./PageHeader";
import SearchBar from "./SearchBar";

const DataTable = ({
  title,
  description,
  columns,
  rows,
  loading,
  isFetching,
  error,
  emptyMessage,
  search,
  onSearch,
  onAdd,
  addLabel,
  sortBy,
  sortDir,
  onSort,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRetry,
  toolbarSlot,
  rowKey = "id",
  headerActions,
  searchPlaceholder,
}) => {
  const [searchDraft, setSearchDraft] = useState(() => search || "");
  const latestOnSearchRef = useRef(onSearch);
  const debouncedSearch = useDebouncedValue(searchDraft, 240);

  useEffect(() => {
    latestOnSearchRef.current = onSearch;
  }, [onSearch]);

  useEffect(() => {
    const safeSearch = search || "";
    if (debouncedSearch === safeSearch) {
      return;
    }

    latestOnSearchRef.current?.(debouncedSearch);
  }, [debouncedSearch, search]);

  return (
    <section className="sa-data-card sa-data-table">
      <div className="sa-data-table__inner">
        <div className="sa-data-table__controls">
          <PageHeader title={title} subtitle={description} />

          <div className="sa-toolbar">
            <div className="sa-toolbar__left">
              <SearchBar
                value={searchDraft}
                onChange={setSearchDraft}
                placeholder={searchPlaceholder || "Search records"}
                className="w-full sm:w-[320px]"
              />
              <FiltersBar>{toolbarSlot}</FiltersBar>
            </div>

            <div className="sa-toolbar__right">
              {headerActions}
              {onAdd ? (
                <button
                  type="button"
                  onClick={onAdd}
                  className="sa-btn sa-btn--primary sa-toolbar__add-btn"
                >
                  <Plus size={16} />
                  <span>{addLabel || "Add"}</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {isFetching && !loading ? (
          <InlineLoadingNotice
            className="mb-3"
            label="Refreshing data to reflect your latest filters..."
          />
        ) : null}

        {error ? (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="m-0 text-sm font-medium text-red-700">{error}</p>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-red-300 bg-white px-3 text-sm font-semibold text-red-700"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <TableSkeleton
            rows={Math.min(Math.max(pageSize || 7, 5), 10)}
            columns={Math.max(columns.length, 4)}
            className="sa-table-skeleton"
            ariaLabel="Loading table records"
          />
        ) : null}

        {!loading && !error ? (
          <>
            <AdminTable
              columns={columns}
              rows={rows}
              rowKey={rowKey}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={onSort}
              emptyMessage={emptyMessage}
            />

            <ModernPagination
              currentPage={page}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={total}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </>
        ) : null}
      </div>
    </section>
  );
};

export default DataTable;
