import { Link, useParams } from "react-router";
import { useMeet } from "~/context/meet-context";
import { useSortableTable } from "~/hooks/useSortableTable";
import { SortableHeader } from "~/components/SortableHeader";

type SwimmerEntrySortColumn = "number" | "event" | "time";

export default function SwimmerDetail() {
  const { swimmerId } = useParams();
  const { meet, getSwimmer, getTeam, getEntriesForSwimmer, getEvent } = useMeet();
  const { toggleSort, getSortDirection, sortData } = useSortableTable<SwimmerEntrySortColumn>();

  if (!meet || !swimmerId) return null;

  const swimmer = getSwimmer(swimmerId);
  if (!swimmer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">Swimmer not found</p>
        <Link to="/swimmers" className="text-blue-600 hover:underline mt-2 inline-block">
          Back to swimmers
        </Link>
      </div>
    );
  }

  const team = getTeam(swimmer.teamId);
  const allEntries = getEntriesForSwimmer(swimmerId);

  // Apply sorting
  const sortedEntries = sortData(allEntries, (entry, column) => {
    const event = getEvent(entry.eventId);
    switch (column) {
      case "number":
        return event?.number ?? 0;
      case "event":
        return event ? `${event.distance} ${event.stroke}` : "";
      case "time":
        return entry.seedTimeMs ?? Number.MAX_VALUE;
      default:
        return event?.number ?? 0;
    }
  });

  // If no sort is active, default to event number sort
  const entries = getSortDirection("number") === null &&
    getSortDirection("event") === null &&
    getSortDirection("time") === null
    ? [...allEntries].sort((a, b) => {
        const eventA = getEvent(a.eventId);
        const eventB = getEvent(b.eventId);
        if (!eventA || !eventB) return 0;
        return eventA.number - eventB.number;
      })
    : sortedEntries;

  return (
    <div>
      <div className="mb-6">
        <Link
          to="/swimmers"
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          &larr; Back to swimmers
        </Link>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {swimmer.name}
        </h2>
        {team && (
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            <Link
              to={`/teams/${team.id}`}
              className="hover:text-gray-700 dark:hover:text-gray-200"
            >
              {team.name}
            </Link>
          </p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <div className="px-2 sm:px-4 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Entries ({entries.length})
          </h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                #
              </th>
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Event
              </th>
              <th className="px-2 sm:px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {entries.map((entry) => {
              const event = getEvent(entry.eventId);
              if (!event) return null;
              return (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {event.number}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4">
                    <Link
                      to={`/events/${event.id}`}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {event.distance} {event.stroke}
                    </Link>
                    <span className="ml-1 sm:ml-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                      ({event.gender === "M" ? "B" : "G"} {event.ageGroup})
                    </span>
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
          <div className="px-2 sm:px-4 py-12 text-center text-gray-500 dark:text-gray-400">
            No entries for this swimmer.
          </div>
        )}
      </div>
    </div>
  );
}
