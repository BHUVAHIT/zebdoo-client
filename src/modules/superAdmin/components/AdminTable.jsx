import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import TableCell from "./TableCell";
import { expandRowsForSyntheticLoad } from "../../../shared/utils/syntheticLoad";
import {
  logVirtualizationTuning,
  resolveVirtualizationTuning,
} from "../../../shared/utils/virtualizationTuning";

const TABLE_ROW_HEIGHT_CLASS = "h-14";

const renderSortIcon = (active, direction) => {
  if (!active) {
    return <ArrowUpDown size={14} className="text-slate-400" aria-hidden="true" />;
  }

  return direction === "desc" ? (
    <ArrowDown size={14} className="text-teal-600" aria-hidden="true" />
  ) : (
    <ArrowUp size={14} className="text-teal-600" aria-hidden="true" />
  );
};

const resolveCellContent = (column, row) => {
  if (typeof column.render === "function") {
    return column.render(row);
  }

  return row[column.key] ?? "-";
};

const AdminTable = ({
  columns,
  rows,
  rowKey = "id",
  sortBy,
  sortDir,
  onSort,
  emptyMessage = "No records found.",
}) => {
  const scrollRef = useRef(null);
  const virtualizationConfig = useMemo(
    () => resolveVirtualizationTuning({ scope: "table" }),
    []
  );
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    virtualizationConfig.defaultViewportHeight
  );

  const effectiveRows = useMemo(
    () => expandRowsForSyntheticLoad(rows, { rowKey }),
    [rowKey, rows]
  );

  useEffect(() => {
    logVirtualizationTuning({
      scope: "table",
      config: virtualizationConfig,
      enabled: true,
    });
  }, [virtualizationConfig]);

  const shouldVirtualize = effectiveRows.length >= virtualizationConfig.threshold;

  useEffect(() => {
    if (!shouldVirtualize) return;

    const node = scrollRef.current;
    if (!node) {
      return;
    }

    const updateViewport = () => {
      setViewportHeight(node.clientHeight || virtualizationConfig.defaultViewportHeight);
    };

    updateViewport();

    let resizeObserver;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateViewport);
      resizeObserver.observe(node);
    }

    window.addEventListener("resize", updateViewport);
    return () => {
      resizeObserver?.disconnect?.();
      window.removeEventListener("resize", updateViewport);
    };
  }, [shouldVirtualize, virtualizationConfig.defaultViewportHeight]);

  const virtualWindow = useMemo(() => {
    if (!shouldVirtualize) {
      return {
        visibleRows: effectiveRows,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const estimatedRowHeight = virtualizationConfig.estimatedItemHeight;
    const overscanRows = virtualizationConfig.overscan;
    const startIndex = Math.max(Math.floor(scrollTop / estimatedRowHeight) - overscanRows, 0);
    const visibleCount =
      Math.ceil(viewportHeight / estimatedRowHeight) + overscanRows * 2;
    const endIndex = Math.min(startIndex + visibleCount, effectiveRows.length);

    return {
      visibleRows: effectiveRows.slice(startIndex, endIndex),
      topSpacerHeight: startIndex * estimatedRowHeight,
      bottomSpacerHeight: Math.max((effectiveRows.length - endIndex) * estimatedRowHeight, 0),
    };
  }, [effectiveRows, scrollTop, shouldVirtualize, viewportHeight, virtualizationConfig]);

  if (!effectiveRows.length) {
    return <p className="sa-status sa-status--empty">{emptyMessage}</p>;
  }

  return (
    <div className="sa-table-shell">
      <div
        ref={scrollRef}
        className="sa-table-scroll"
        onScroll={
          shouldVirtualize
            ? (event) => {
                setScrollTop(event.currentTarget.scrollTop || 0);
              }
            : undefined
        }
        style={
          shouldVirtualize
            ? {
                maxHeight: `${virtualizationConfig.defaultViewportHeight}px`,
              }
            : undefined
        }
      >
        <table className="sa-admin-table">
          <thead>
            <tr>
              {columns.map((column) => {
                const isSortable = Boolean(column.sortable && onSort);
                const isActive = sortBy === column.key;

                return (
                  <th
                    key={column.key}
                    data-column-key={column.key}
                    className={`sa-admin-table__head-cell ${column.key === "actions" ? "is-actions" : ""}`}
                    style={{
                      width: column.width || "auto",
                      minWidth: column.minWidth || column.width || "auto",
                    }}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() => {
                          const nextDirection = isActive && sortDir === "asc" ? "desc" : "asc";
                          onSort({ sortBy: column.key, sortDir: nextDirection });
                        }}
                        className="sa-admin-table__sort-btn"
                      >
                        <span className="truncate">{column.label}</span>
                        {renderSortIcon(isActive, sortDir)}
                      </button>
                    ) : (
                      <span className="truncate">{column.label}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {virtualWindow.topSpacerHeight > 0 ? (
              <tr aria-hidden="true">
                <td colSpan={columns.length} style={{ height: `${virtualWindow.topSpacerHeight}px`, padding: 0, border: 0 }} />
              </tr>
            ) : null}

            {virtualWindow.visibleRows.map((row, index) => {
              const computedRowKey = row?.[rowKey] ?? `${rowKey}-${index}`;

              return (
                <tr key={computedRowKey} className="sa-admin-table__row">
                  {columns.map((column) => {
                    const content = resolveCellContent(column, row);
                    const isActions = column.key === "actions";
                    const isPrimitive =
                      typeof content === "string" ||
                      typeof content === "number" ||
                      typeof content === "boolean";
                    const normalized = isPrimitive ? String(content) : "";
                    const maxWidth = column.maxWidth || (isActions ? "160px" : "250px");

                    return (
                      <td
                        key={`${computedRowKey}-${column.key}`}
                        data-column-key={column.key}
                        className={`${TABLE_ROW_HEIGHT_CLASS} sa-admin-table__cell ${column.key === "actions" ? "is-actions" : ""}`}
                        style={{
                          width: column.width || "auto",
                          minWidth: column.minWidth || column.width || "auto",
                        }}
                      >
                        <TableCell
                          content={isPrimitive ? normalized : content}
                          isActions={isActions}
                          maxWidth={maxWidth}
                          title={isPrimitive ? normalized : undefined}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {virtualWindow.bottomSpacerHeight > 0 ? (
              <tr aria-hidden="true">
                <td
                  colSpan={columns.length}
                  style={{ height: `${virtualWindow.bottomSpacerHeight}px`, padding: 0, border: 0 }}
                />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default memo(AdminTable);
