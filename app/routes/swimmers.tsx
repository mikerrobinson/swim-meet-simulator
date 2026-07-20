import { Link } from "react-router";
import { useState, useMemo } from "react";
import { useMeet } from "~/context/meet-context";
import { useSortableTable } from "~/hooks/useSortableTable";
import { SortableHeader } from "~/components/SortableHeader";

type SwimmerSortColumn = "name" | "team" | "entries";

export default function Swimmers() {
  const { meet, getTeam, getEntriesForSwimmer } = useMeet();
  const [search, setSearch] = useState("");
  const { toggleSort, getSortDirection, sortData } = useSortableTable<SwimmerSortColumn>();

  if (!meet) return null;

  const allSwimmers = Array.from(meet.swimmers.values());

  const filteredSwimmers = allSwimmers.filter((swimmer) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const team = getTeam(swimmer.teamId);
    return (
      swimmer.name.toLowerCase().includes(searchLower) ||
      team?.name.toLowerCase().includes(searchLower)
    );
  });

  // Apply sorting (default sort by name if no sort selected)
  const sortedSwimmers = sortData(filteredSwimmers, (swimmer, column) => {
    switch (column) {
      case "name":
        return swimmer.name;
      case "team":
        return getTeam(swimmer.teamId)?.name ?? "";
      case "entries":
        return getEntriesForSwimmer(swimmer.id).length;
      default:
        return swimmer.name;
    }
  });

  // If no sort is active, default to name sort
  const displaySwimmers = getSortDirection("name") === null &&
    getSortDirection("team") === null &&
    getSortDirection("entries") === null
    ? [...filteredSwimmers].sort((a, b) => a.name.localeCompare(b.name))
    : sortedSwimmers;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Swimmers
        </h2>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or team..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     placeholder-gray-500 dark:placeholder-gray-400"
        />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <SortableHeader
                label="Name"
                column="name"
                direction={getSortDirection("name")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Team"
                column="team"
                direction={getSortDirection("team")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Entries"
                column="entries"
                direction={getSortDirection("entries")}
                onSort={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {displaySwimmers.map((swimmer) => {
              const team = getTeam(swimmer.teamId);
              const entries = getEntriesForSwimmer(swimmer.id);
              return (
                <tr
                  key={swimmer.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    <Link
                      to={`/swimmers/${swimmer.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {swimmer.name}
                    </Link>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400">
                    {team ? (
                      <Link
                        to={`/teams/${team.id}`}
                        className="hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {team.name}
                      </Link>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {entries.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredSwimmers.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            {search ? "No swimmers match your search." : "No swimmers found in this meet."}
          </div>
        )}
      </div>

      {search && filteredSwimmers.length !== allSwimmers.length && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredSwimmers.length} of {allSwimmers.length} swimmers
        </p>
      )}
    </div>
  );
}
