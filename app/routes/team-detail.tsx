import { Link, useParams } from "react-router";
import { useMeet } from "~/context/meet-context";

export default function TeamDetail() {
  const { teamId } = useParams();
  const { meet, getTeam, getSwimmersForTeam, getEntriesForSwimmer, getEvent } = useMeet();

  if (!meet || !teamId) return null;

  const team = getTeam(teamId);
  if (!team) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Team not found</p>
        <Link to="/teams" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to teams
        </Link>
      </div>
    );
  }

  const swimmers = getSwimmersForTeam(teamId).sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  // Get relay entries for this team
  const relayEntries = meet.entries.filter((e) => e.teamId === teamId);

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/teams"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; Back to teams
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {team.name}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {swimmers.length} {swimmers.length === 1 ? "swimmer" : "swimmers"}
        </p>
      </div>

      {/* Swimmers */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Swimmers
          </h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Entries
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {swimmers.map((swimmer) => {
              const entries = getEntriesForSwimmer(swimmer.id);
              return (
                <tr
                  key={swimmer.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/swimmers/${swimmer.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {swimmer.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {entries.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {swimmers.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            No swimmers found for this team.
          </div>
        )}
      </div>

      {/* Relay Entries */}
      {relayEntries.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Relay Entries
            </h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Relay
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Seed Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {relayEntries.map((entry) => {
                const event = getEvent(entry.eventId);
                if (!event) return null;
                return (
                  <tr
                    key={entry.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/events/${event.id}`}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {event.distance} {event.stroke}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {entry.relayLetter || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                      {entry.seedTime}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
