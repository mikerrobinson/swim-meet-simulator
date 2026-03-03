import { Link } from "react-router";
import { useMeet } from "~/context/meet-context";

export default function Teams() {
  const { meet, getSwimmersForTeam, getEntriesForTeam } = useMeet();

  if (!meet) return null;

  const teams = Array.from(meet.teams.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Teams
      </h2>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Swimmers
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Entries
              </th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {swimmers.length}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
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
