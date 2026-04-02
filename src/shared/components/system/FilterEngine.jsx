import { useMemo } from "react";

export const useFilterEngine = ({ rows = [], predicates = [] }) => {
  return useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }

    const activePredicates = (Array.isArray(predicates) ? predicates : []).filter(
      (predicate) => typeof predicate === "function"
    );

    if (!activePredicates.length) {
      return rows;
    }

    return rows.filter((row) => activePredicates.every((predicate) => predicate(row)));
  }, [predicates, rows]);
};
