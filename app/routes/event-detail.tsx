import { Link, useParams } from "react-router";
import { useMeet } from "~/context/meet-context";
import { useSortableTable } from "~/hooks/useSortableTable";
import { SortableHeader } from "~/components/SortableHeader";

type EventEntrySortColumn = "seed" | "name" | "team" | "time";

export default function EventDetail() {
  const { eventId } = useParams();
  const { meet, getEvent, getEntriesForEvent, getSwimmer, getTeam } = useMeet();
  const { toggleSort, getSortDirection, sortData } = useSortableTable<EventEntrySortColumn>();

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

  const allEntries = getEntriesForEvent(eventId);

  // Precompute seed ranks (based on time) for each entry
  const entriesByTime = [...allEntries].sort((a, b) => {
    if (a.seedTimeMs === undefined && b.seedTimeMs === undefined) return 0;
    if (a.seedTimeMs === undefined) return 1;
    if (b.seedTimeMs === undefined) return -1;
    return a.seedTimeMs - b.seedTimeMs;
  });
  const seedRankMap = new Map<string, number>();
  entriesByTime.forEach((entry, idx) => {
    if (entry.seedTimeMs !== undefined) {
      seedRankMap.set(entry.id, idx + 1);
    }
  });

  // Helper to get sort values
  const getSortValue = (entry: typeof allEntries[0], column: EventEntrySortColumn) => {
    const swimmer = entry.swimmerId ? getSwimmer(entry.swimmerId) : null;
    const team = entry.teamId
      ? getTeam(entry.teamId)
      : swimmer
        ? getTeam(swimmer.teamId)
        : null;

    switch (column) {
      case "seed":
        return entry.seedTimeMs ?? Number.MAX_VALUE;
      case "name":
        return event.isRelay ? (team?.name ?? "") : (swimmer?.name ?? "");
      case "team":
        return event.isRelay ? (entry.relayLetter ?? "") : (team?.name ?? "");
      case "time":
        return entry.seedTimeMs ?? Number.MAX_VALUE;
      default:
        return entry.seedTimeMs ?? Number.MAX_VALUE;
    }
  };

  // Apply sorting
  const sortedEntries = sortData(allEntries, getSortValue);

  // If no sort is active, default to seed time sort
  const entries = getSortDirection("seed") === null &&
    getSortDirection("name") === null &&
    getSortDirection("team") === null &&
    getSortDirection("time") === null
    ? entriesByTime
    : sortedEntries;

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
              <SortableHeader
                label="Seed"
                column="seed"
                direction={getSortDirection("seed")}
                onSort={toggleSort}
              />
              <SortableHeader
                label={event.isRelay ? "Team" : "Name"}
                column="name"
                direction={getSortDirection("name")}
                onSort={toggleSort}
              />
              <SortableHeader
                label={event.isRelay ? "Relay" : "Team"}
                column="team"
                direction={getSortDirection("team")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Time"
                column="time"
                direction={getSortDirection("time")}
                onSort={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {entries.map((entry) => {
              const swimmer = entry.swimmerId ? getSwimmer(entry.swimmerId) : null;
              const team = entry.teamId
                ? getTeam(entry.teamId)
                : swimmer
                  ? getTeam(swimmer.teamId)
                  : null;
              const seedRank = seedRankMap.get(entry.id);

              return (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {seedRank ?? "-"}
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
