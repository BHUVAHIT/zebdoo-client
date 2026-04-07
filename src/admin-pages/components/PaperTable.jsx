import { ExternalLink, PencilLine, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import PaginationBar from "../../components/PaginationBar";
import { InlineLoadingNotice } from "../../components/loading/LoadingPrimitives";
import { TEST_PAPER_SCOPES } from "../../constants/paperTypes";
import { routeBuilders } from "../../routes/routePaths";

const PaperTable = ({
  loading,
  items = [],
  totalItems,
  currentPage,
  totalPages,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewPaper,
  onRequestDelete,
}) => {
  const hasItems = items.length > 0;
  const actionBtnClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-[#d1d5db] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#334155] transition-colors duration-200 hover:bg-[#f8fafc]";
  const dangerBtnClass =
    "inline-flex items-center gap-1.5 rounded-lg border border-[#fecaca] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#b91c1c] transition-colors duration-200 hover:bg-[#fef2f2]";

  return (
    <section
      className="tp-admin-theme overflow-hidden rounded-3xl border border-[#e5e7eb] bg-white shadow-[0_20px_40px_-34px_rgba(15,23,42,0.55)]"
      aria-label="Paper list"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef2f7] bg-gradient-to-r from-[#f8fafc] to-[#eef2ff] px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-bold text-[#111827]">Papers</h2>
          <p className="text-xs text-[#64748b]">Manage upload visibility, metadata, and student-facing access.</p>
        </div>
        <div className="rounded-full border border-[#dbe3f4] bg-white px-3 py-1 text-xs font-semibold text-[#334155]">
          {totalItems} total
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 p-4 sm:p-6">
          <InlineLoadingNotice label="Loading papers with current filters and page settings..." />
          {Array.from({ length: 8 }, (_, index) => (
            <span key={`paper-loader-${index}`} className="tp-admin-loading-bar h-11" />
          ))}
        </div>
      ) : null}

      {!loading && !hasItems ? (
        <article className="m-4 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-6 sm:m-6">
          <h2>No test papers found</h2>
          <p>Try changing filters or upload a new paper.</p>
        </article>
      ) : null}

      {!loading && hasItems ? (
        <>
          <div className="hidden overflow-x-auto lg:block">
            <table className="min-w-[980px] w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-[#e5e7eb] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Subject
                  </th>
                  <th className="border-b border-[#e5e7eb] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Chapter / Scope
                  </th>
                  <th className="border-b border-[#e5e7eb] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Type
                  </th>
                  <th className="border-b border-[#e5e7eb] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Year
                  </th>
                  <th className="border-b border-[#e5e7eb] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Title
                  </th>
                  <th className="border-b border-[#e5e7eb] px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.18em] text-[#64748b]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => {
                  const chapterOrFull =
                    item.scope === TEST_PAPER_SCOPES.FULL_SYLLABUS
                      ? "Full Syllabus"
                      : item.chapterName;

                  return (
                    <tr key={item.id} className="group transition-colors duration-200 hover:bg-[#f8faff]">
                      <td className="border-b border-[#eef2f7] px-4 py-3 text-sm font-semibold text-[#1e293b]">
                        {item.subjectName}
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3 text-sm text-[#475569]">{chapterOrFull}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <span className="inline-flex rounded-full border border-[#c7d2fe] bg-[#eef2ff] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#3730a3]">
                          {item.paperType || item.type}
                        </span>
                      </td>
                      <td className="border-b border-[#eef2f7] px-4 py-3 text-sm text-[#475569]">{item.year || "-"}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3 text-sm text-[#111827]">{item.title}</td>
                      <td className="border-b border-[#eef2f7] px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button type="button" className={actionBtnClass} onClick={() => onViewPaper?.(item)}>
                            <ExternalLink size={14} aria-hidden="true" />
                            <span>View</span>
                          </button>

                          <Link
                            to={routeBuilders.admin.testPapersEdit(item.id)}
                            aria-label={`Edit ${item.title}`}
                            className={actionBtnClass}
                          >
                            <PencilLine size={14} aria-hidden="true" />
                            <span>Edit</span>
                          </Link>

                          <button
                            type="button"
                            className={dangerBtnClass}
                            onClick={() => onRequestDelete?.(item)}
                          >
                            <Trash2 size={14} aria-hidden="true" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 p-4 lg:hidden">
            {items.map((item) => (
              <article
                key={`mobile-${item.id}`}
                className="rounded-2xl border border-[#e5e7eb] bg-[#f8fafc] p-4 shadow-[0_12px_20px_-18px_rgba(15,23,42,0.35)]"
              >
                <h3 className="text-sm font-bold text-[#111827]">{item.title}</h3>
                <p className="mt-1 text-sm text-[#475569]">{item.subjectName}</p>
                <p className="mt-1 text-xs text-[#64748b]">
                  {item.scope === TEST_PAPER_SCOPES.FULL_SYLLABUS ? "Full Syllabus" : item.chapterName}
                </p>
                <p className="mt-1 text-xs font-semibold text-[#334155]">
                  {item.paperType || item.type}
                  {item.year ? ` | ${item.year}` : ""}
                </p>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  <button type="button" className={actionBtnClass} onClick={() => onViewPaper?.(item)}>
                    <ExternalLink size={14} aria-hidden="true" />
                    <span>View</span>
                  </button>
                  <Link to={routeBuilders.admin.testPapersEdit(item.id)} className={actionBtnClass}>
                    <PencilLine size={14} aria-hidden="true" />
                    <span>Edit</span>
                  </Link>
                  <button
                    type="button"
                    className={dangerBtnClass}
                    onClick={() => onRequestDelete?.(item)}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="border-t border-[#eef2f7] p-4 sm:p-6">
            <PaginationBar
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
              onJump={onPageChange}
            />
          </div>
        </>
      ) : null}
    </section>
  );
};

export default PaperTable;
