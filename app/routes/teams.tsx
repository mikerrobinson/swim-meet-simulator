import { Link } from "react-router";
import { useMeet } from "~/context/meet-context";
import { useSortableTable } from "~/hooks/useSortableTable";
import { SortableHeader } from "~/components/SortableHeader";

type TeamSortColumn = "name" | "swimmers" | "entries";

export default function Teams() {
  const { meet, getSwimmersForTeam, getEntriesForTeam } = useMeet();
  const { toggleSort, getSortDirection, sortData } = useSortableTable<TeamSortColumn>();

  if (!meet) return null;

  const allTeams = Array.from(meet.teams.values());

  // Apply sorting (default sort by name if no sort selected)
  const sortedTeams = sortData(allTeams, (team, column) => {
    switch (column) {
      case "name":
        return team.name;
      case "swimmers":
        return getSwimmersForTeam(team.id).length;
      case "entries":
        return getEntriesForTeam(team.id).length;
      default:
        return team.name;
    }
  });

  // If no sort is active, default to name sort
  const teams = getSortDirection("name") === null &&
    getSortDirection("swimmers") === null &&
    getSortDirection("entries") === null
    ? [...allTeams].sort((a, b) => a.name.localeCompare(b.name))
    : sortedTeams;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Teams
      </h2>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <SortableHeader
                label="Team"
                column="name"
                direction={getSortDirection("name")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Swimmers"
                column="swimmers"
                direction={getSortDirection("swimmers")}
                onSort={toggleSort}
                align="right"
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
            {teams.map((team) => {
              const swimmers = getSwimmersForTeam(team.id);
              const entries = getEntriesForTeam(team.id);
              return (
                <tr
                  key={team.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    <Link
                      to={`/teams/${team.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {team.name}
                    </Link>
                    {team.abbreviation && (
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({team.abbreviation})
                      </span>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {swimmers.length}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {entries.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {teams.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            No teams found in this meet.
          </div>
        )}
      </div>
    </div>
  );
}
