import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import TableCell from "./TableCell";

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
  if (!rows.length) {
    return <p className="sa-status sa-status--empty">{emptyMessage}</p>;
  }

  return (
    <div className="sa-table-shell">
      <div className="sa-table-scroll">
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
            {rows.map((row, index) => {
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
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminTable;
