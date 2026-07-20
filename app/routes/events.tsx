import { Link } from "react-router";
import { useMeet } from "~/context/meet-context";
import { useSortableTable } from "~/hooks/useSortableTable";
import { SortableHeader } from "~/components/SortableHeader";

type EventSortColumn = "number" | "event" | "gender" | "ageGroup" | "entries";

export default function Events() {
  const { meet, getEntriesForEvent } = useMeet();
  const { toggleSort, getSortDirection, sortData } = useSortableTable<EventSortColumn>();

  if (!meet) return null;

  const allEvents = Array.from(meet.events.values());

  // Apply sorting
  const sortedEvents = sortData(allEvents, (event, column) => {
    switch (column) {
      case "number":
        return event.number;
      case "event":
        return `${event.distance} ${event.stroke}`;
      case "gender":
        return event.gender;
      case "ageGroup":
        return event.ageGroup ?? "";
      case "entries":
        return getEntriesForEvent(event.id).length;
      default:
        return event.number;
    }
  });

  // If no sort is active, default to event number sort
  const events = getSortDirection("number") === null &&
    getSortDirection("event") === null &&
    getSortDirection("gender") === null &&
    getSortDirection("ageGroup") === null &&
    getSortDirection("entries") === null
    ? [...allEvents].sort((a, b) => a.number - b.number)
    : sortedEvents;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Events
      </h2>

      <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <SortableHeader
                label="#"
                column="number"
                direction={getSortDirection("number")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Event"
                column="event"
                direction={getSortDirection("event")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Gender"
                column="gender"
                direction={getSortDirection("gender")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Age"
                column="ageGroup"
                direction={getSortDirection("ageGroup")}
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
            {events.map((event) => {
              const entries = getEntriesForEvent(event.id);
              return (
                <tr
                  key={event.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {event.number}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap">
                    <Link
                      to={`/events/${event.id}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {event.distance} {event.stroke}
                      {event.isRelay && " Relay"}
                    </Link>
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {event.gender === "M"
                      ? "Boys"
                      : event.gender === "F"
                        ? "Girls"
                        : "Mixed"}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {event.ageGroup || "-"}
                  </td>
                  <td className="px-2 sm:px-4 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">
                    {entries.length}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {events.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
            No events found in this meet.
          </div>
        )}
      </div>
    </div>
  );
}
