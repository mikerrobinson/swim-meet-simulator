import { useState, useMemo, useCallback } from "react";

export type SortDirection = "asc" | "desc" | null;

export interface SortState<T extends string> {
  column: T | null;
  direction: SortDirection;
}

export interface UseSortableTableResult<T extends string> {
  sortState: SortState<T>;
  toggleSort: (column: T) => void;
  getSortDirection: (column: T) => SortDirection;
  sortData: <D>(data: D[], getSortValue: (item: D, column: T) => string | number | undefined) => D[];
}

/**
 * Hook for managing sortable table state
 * Click cycle: null -> asc -> desc -> null
 */
export function useSortableTable<T extends string>(): UseSortableTableResult<T> {
  const [sortState, setSortState] = useState<SortState<T>>({
    column: null,
    direction: null,
  });

  const toggleSort = useCallback((column: T) => {
    setSortState((prev) => {
      if (prev.column !== column) {
        // New column - start with ascending
        return { column, direction: "asc" };
      }
      // Same column - cycle through: asc -> desc -> null
      if (prev.direction === "asc") {
        return { column, direction: "desc" };
      }
      if (prev.direction === "desc") {
        return { column: null, direction: null };
      }
      // null -> asc
      return { column, direction: "asc" };
    });
  }, []);

  const getSortDirection = useCallback(
    (column: T): SortDirection => {
      return sortState.column === column ? sortState.direction : null;
    },
    [sortState]
  );

  const sortData = useCallback(
    <D>(data: D[], getSortValue: (item: D, column: T) => string | number | undefined): D[] => {
      if (!sortState.column || !sortState.direction) {
        return data;
      }

      const column = sortState.column;
      const direction = sortState.direction;

      return [...data].sort((a, b) => {
        const aVal = getSortValue(a, column);
        const bVal = getSortValue(b, column);

        // Handle undefined values - push to end
        if (aVal === undefined && bVal === undefined) return 0;
        if (aVal === undefined) return 1;
        if (bVal === undefined) return -1;

        // Compare values
        let comparison: number;
        if (typeof aVal === "string" && typeof bVal === "string") {
          comparison = aVal.localeCompare(bVal);
        } else {
          comparison = (aVal as number) - (bVal as number);
        }

        return direction === "asc" ? comparison : -comparison;
      });
    },
    [sortState]
  );

  return {
    sortState,
    toggleSort,
    getSortDirection,
    sortData,
  };
}
