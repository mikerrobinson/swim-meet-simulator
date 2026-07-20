import type { SortDirection } from "~/hooks/useSortableTable";

interface SortableHeaderProps {
  label: string;
  column: string;
  direction: SortDirection;
  onSort: (column: string) => void;
  align?: "left" | "right";
  className?: string;
}

function SortIcon({ direction }: { direction: SortDirection }) {
  if (direction === "asc") {
    return (
      <svg
        className="w-3 h-3 ml-1 inline-block"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg
        className="w-3 h-3 ml-1 inline-block"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  }
  // Show subtle indicator that column is sortable
  return (
    <svg
      className="w-3 h-3 ml-1 inline-block opacity-0 group-hover:opacity-40"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

export function SortableHeader({
  label,
  column,
  direction,
  onSort,
  align = "left",
  className = "",
}: SortableHeaderProps) {
  const baseClasses =
    "px-2 sm:px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-200 transition-colors group";
  const alignClass = align === "right" ? "text-right" : "text-left";

  return (
    <th
      className={`${baseClasses} ${alignClass} ${className}`}
      onClick={() => onSort(column)}
    >
      <span className="inline-flex items-center">
        {align === "right" && <SortIcon direction={direction} />}
        {label}
        {align === "left" && <SortIcon direction={direction} />}
      </span>
    </th>
  );
}
