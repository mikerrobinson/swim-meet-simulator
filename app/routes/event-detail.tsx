import { Link, useParams } from "react-router";
import { useMeet } from "~/context/meet-context";

export default function EventDetail() {
  const { eventId } = useParams();
  const { meet, getEvent, getEntriesForEvent, getSwimmer, getTeam } = useMeet();

  if (!meet || !eventId) return null;

  const event = getEvent(eventId);
  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Event not found</p>
        <Link to="/events" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to events
        </Link>
      </div>
    );
  }

  const entries = getEntriesForEvent(eventId).sort((a, b) => {
    // Sort by seed time (NT entries at the end)
    if (a.seedTimeMs === undefined && b.seedTimeMs === undefined) return 0;
    if (a.seedTimeMs === undefined) return 1;
    if (b.seedTimeMs === undefined) return -1;
    return a.seedTimeMs - b.seedTimeMs;
  });

  const eventName = `${event.distance} ${event.stroke}${event.isRelay ? " Relay" : ""}`;
  const genderLabel = event.gender === "M" ? "Boys" : event.gender === "F" ? "Girls" : "Mixed";

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/events"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; Back to events
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Event {event.number}: {genderLabel} {event.ageGroup} {eventName}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Seed
              </th>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {event.isRelay ? "Team" : "Name"}
              </th>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {event.isRelay ? "Relay" : "Team"}
              </th>
              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {entries.map((entry, index) => {
              const swimmer = entry.swimmerId ? getSwimmer(entry.swimmerId) : null;
              const team = entry.teamId
                ? getTeam(entry.teamId)
                : swimmer
                  ? getTeam(swimmer.teamId)
                  : null;

              return (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {entry.seedTimeMs !== undefined ? index + 1 : "-"}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    {event.isRelay ? (
                      team ? (
                        <Link
                          to={`/teams/${team.id}`}
                          className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          {team.name}
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-500">Unknown</span>
                      )
                    ) : swimmer ? (
                      <Link
                        to={`/swimmers/${swimmer.id}`}
                        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {swimmer.name}
                      </Link>
                    ) : (
                      <span className="text-sm text-gray-500">Unknown</span>
                    )}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 text-sm text-gray-500 dark:text-gray-400">
                    {event.isRelay ? (
                      entry.relayLetter || "-"
                    ) : team ? (
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
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                    {entry.seedTime}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {entries.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            No entries for this event.
          </div>
        )}
      </div>
    </div>
  );
}
