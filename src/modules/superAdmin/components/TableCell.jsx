import { memo } from "react";

const TableCell = ({ content, isActions, maxWidth, title }) => {
  return (
    <div
      className={`sa-cell ${isActions ? "" : "is-truncate"}`.trim()}
      style={{ maxWidth }}
      title={title}
    >
      {content}
    </div>
  );
};

export default memo(TableCell);
