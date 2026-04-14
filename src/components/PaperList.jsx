import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Download, Eye } from "lucide-react";

const VIRTUALIZATION_THRESHOLD = 120;
const DEFAULT_VIEWPORT_HEIGHT = 560;
const ESTIMATED_ROW_HEIGHT = 76;
const OVERSCAN_ROWS = 8;

const renderPaperRow = ({ paper, bookmarkedPaperIds, onOpenPaper, onToggleBookmark }) => {
  const isBookmarked = bookmarkedPaperIds.has(paper.id);
  const hasPdfUrl = Boolean(paper?.pdfUrl);

  return (
    <tr key={paper.id}>
      <td>
        <span className="exam-vault-table-year">{paper.year || "-"}</span>
      </td>
      <td>
        <p className="exam-vault-table-title">{paper.title || "Untitled paper"}</p>
        <p className="exam-vault-table-subtitle">{paper.chapterName || "Full Syllabus"}</p>
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
};

const PaperList = ({
  papers = [],
  bookmarkedPaperIds = new Set(),
  onOpenPaper,
  onToggleBookmark,
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(DEFAULT_VIEWPORT_HEIGHT);
  const shouldVirtualize = papers.length >= VIRTUALIZATION_THRESHOLD;

  useEffect(() => {
    if (!shouldVirtualize) {
      setScrollTop(0);
      return;
    }

    const node = containerRef.current;
    if (!node) {
      return;
    }

    const updateViewport = () => {
      setViewportHeight(node.clientHeight || DEFAULT_VIEWPORT_HEIGHT);
    };

    updateViewport();

    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateViewport);
      observer.observe(node);
    }

    window.addEventListener("resize", updateViewport);
    return () => {
      observer?.disconnect?.();
      window.removeEventListener("resize", updateViewport);
    };
  }, [shouldVirtualize]);

  const virtualWindow = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        visibleRows: papers,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const startRow = Math.max(Math.floor(scrollTop / ESTIMATED_ROW_HEIGHT) - OVERSCAN_ROWS, 0);
    const visibleRowCount =
      Math.ceil(viewportHeight / ESTIMATED_ROW_HEIGHT) + OVERSCAN_ROWS * 2;
    const endRow = Math.min(startRow + visibleRowCount, papers.length);

    return {
      visibleRows: papers.slice(startRow, endRow),
      topSpacerHeight: startRow * ESTIMATED_ROW_HEIGHT,
      bottomSpacerHeight: Math.max((papers.length - endRow) * ESTIMATED_ROW_HEIGHT, 0),
    };
  }, [papers, scrollTop, shouldVirtualize, viewportHeight]);

  const onScroll = shouldVirtualize
    ? (event) => {
        setScrollTop(event.currentTarget.scrollTop || 0);
      }
    : undefined;

  if (papers.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="exam-vault-table-wrap"
      role="region"
      aria-label="Papers table"
      tabIndex={0}
      onScroll={onScroll}
      style={
        shouldVirtualize
          ? {
              maxHeight: `${DEFAULT_VIEWPORT_HEIGHT}px`,
            }
          : undefined
      }
    >
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
          {virtualWindow.topSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td colSpan={4} style={{ height: `${virtualWindow.topSpacerHeight}px`, padding: 0, border: 0 }} />
            </tr>
          ) : null}

          {virtualWindow.visibleRows.map((paper) =>
            renderPaperRow({
              paper,
              bookmarkedPaperIds,
              onOpenPaper,
              onToggleBookmark,
            })
          )}

          {virtualWindow.bottomSpacerHeight > 0 ? (
            <tr aria-hidden="true">
              <td
                colSpan={4}
                style={{ height: `${virtualWindow.bottomSpacerHeight}px`, padding: 0, border: 0 }}
              />
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
};

export default memo(PaperList);