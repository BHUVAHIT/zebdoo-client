import { memo } from "react";
import { Bookmark, BookmarkCheck, Download, Eye } from "lucide-react";

const PaperList = ({
  papers = [],
  bookmarkedPaperIds = new Set(),
  onOpenPaper,
  onToggleBookmark,
}) => {
  if (papers.length === 0) {
    return null;
  }

  return (
    <div className="exam-vault-table-wrap" role="region" aria-label="Papers table" tabIndex={0}>
      <table className="exam-vault-paper-table">
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Paper Name</th>
            <th scope="col">Type</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {papers.map((paper) => {
            const isBookmarked = bookmarkedPaperIds.has(paper.id);
            const hasPdfUrl = Boolean(paper?.pdfUrl);

            return (
              <tr key={paper.id}>
                <td>
                  <span className="exam-vault-table-year">{paper.year || "-"}</span>
                </td>
                <td>
                  <p className="exam-vault-table-title">{paper.title || "Untitled paper"}</p>
                  <p className="exam-vault-table-subtitle">
                    {paper.chapterName || "Full Syllabus"}
                  </p>
                </td>
                <td>
                  <span className="exam-vault-table-type">{paper.typeLabel || paper.type || "OTHER"}</span>
                </td>
                <td>
                  <div className="exam-vault-table-actions">
                    <button
                      type="button"
                      className={`exam-vault-table-action exam-vault-table-action--save ${isBookmarked ? "is-active" : ""}`}
                      onClick={() => onToggleBookmark?.(paper)}
                      aria-pressed={isBookmarked}
                      title={isBookmarked ? "Remove from saved" : "Save paper"}
                    >
                      {isBookmarked ? (
                        <BookmarkCheck size={14} aria-hidden="true" />
                      ) : (
                        <Bookmark size={14} aria-hidden="true" />
                      )}
                      <span>{isBookmarked ? "Saved" : "Save"}</span>
                    </button>

                    <button
                      type="button"
                      className="exam-vault-table-action exam-vault-table-action--view"
                      onClick={() => onOpenPaper?.(paper)}
                      disabled={!hasPdfUrl}
                    >
                      <Eye size={14} aria-hidden="true" />
                      <span>View</span>
                    </button>

                    {hasPdfUrl ? (
                      <a
                        href={paper.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="exam-vault-table-action exam-vault-table-action--download"
                      >
                        <Download size={14} aria-hidden="true" />
                        <span>Download</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="exam-vault-table-action exam-vault-table-action--download"
                        disabled
                      >
                        <Download size={14} aria-hidden="true" />
                        <span>Download</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default memo(PaperList);