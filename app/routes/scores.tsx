import { useState } from "react";
import { useMeet } from "~/context/meet-context";
import { calculateTeamScores, type TeamScore } from "~/lib/scoring";
import { useSortableTable } from "~/hooks/useSortableTable";
import { SortableHeader } from "~/components/SortableHeader";

type ScoreSortColumn = "team" | "individual" | "relay" | "total";

export default function Scores() {
  const { meet, getSwimmer, getEvent } = useMeet();
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const { toggleSort, getSortDirection, sortData } = useSortableTable<ScoreSortColumn>();

  if (!meet) {
    return null;
  }

  const allScores = calculateTeamScores(meet);

  // Apply sorting
  const sortedScores = sortData(allScores, (score, column) => {
    switch (column) {
      case "team":
        return score.team.name;
      case "individual":
        return score.individualPoints;
      case "relay":
        return score.relayPoints;
      case "total":
        return score.totalPoints;
      default:
        return score.totalPoints;
    }
  });

  // If no sort is active, default to total points descending (already sorted by calculateTeamScores)
  const teamScores = getSortDirection("team") === null &&
    getSortDirection("individual") === null &&
    getSortDirection("relay") === null &&
    getSortDirection("total") === null
    ? allScores
    : sortedScores;

  const topScore = allScores[0]?.totalPoints || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Team Scores
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Based on seed times
        </p>
      </div>

      {/* Scoring legend */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-sm">
        <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">
          Scoring Rules
        </p>
        <div className="text-blue-800 dark:text-blue-200 space-y-1">
          <p>
            <span className="font-medium">Individual:</span> 20, 17, 16, 15, 14,
            13, 12, 11, 9, 7, 6, 5, 4, 3, 2, 1
          </p>
          <p>
            <span className="font-medium">Relay:</span> 40, 34, 32, 30, 28, 26,
            24, 22, 18, 14, 12, 10, 8, 6, 4, 2
          </p>
          <p className="text-blue-600 dark:text-blue-300">
            Top 16 places score. Max 2 relays per team per event.
          </p>
        </div>
      </div>

      {/* Team standings */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10 sm:w-12">
                #
              </th>
              <SortableHeader
                label="Team"
                column="team"
                direction={getSortDirection("team")}
                onSort={toggleSort}
              />
              <SortableHeader
                label="Indiv"
                column="individual"
                direction={getSortDirection("individual")}
                onSort={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Relay"
                column="relay"
                direction={getSortDirection("relay")}
                onSort={toggleSort}
                align="right"
              />
              <SortableHeader
                label="Total"
                column="total"
                direction={getSortDirection("total")}
                onSort={toggleSort}
                align="right"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {teamScores.map((score, index) => (
              <TeamRow
                key={score.team.id}
                score={score}
                rank={index + 1}
                topScore={topScore}
                isExpanded={expandedTeam === score.team.id}
                onToggle={() =>
                  setExpandedTeam(
                    expandedTeam === score.team.id ? null : score.team.id
                  )
                }
                getSwimmer={getSwimmer}
                getEvent={getEvent}
              />
            ))}
          </tbody>
        </table>

        {teamScores.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
            No scoring data available
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRow({
  score,
  rank,
  topScore,
  isExpanded,
  onToggle,
  getSwimmer,
  getEvent,
}: {
  score: TeamScore;
  rank: number;
  topScore: number;
  isExpanded: boolean;
  onToggle: () => void;
  getSwimmer: (id: string) => { name: string; teamId: string } | undefined;
  getEvent: (id: string) => { isRelay: boolean } | undefined;
}) {
  const barWidth = topScore > 0 ? (score.totalPoints / topScore) * 100 : 0;

  return (
    <>
      <tr
        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
        onClick={onToggle}
      >
        <td className="px-2 sm:px-4 py-3 sm:py-4">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full text-sm font-medium ${
              rank === 1
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                : rank === 2
                  ? "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                  : rank === 3
                    ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {rank}
          </span>
        </td>
        <td className="px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <svg
                className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <div className="min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">
                {score.team.name}
              </p>
              {score.team.abbreviation && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {score.team.abbreviation}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-2 sm:px-4 py-3 sm:py-4 text-right text-gray-600 dark:text-gray-400">
          {score.individualPoints}
        </td>
        <td className="px-2 sm:px-4 py-3 sm:py-4 text-right text-gray-600 dark:text-gray-400">
          {score.relayPoints}
        </td>
        <td className="px-2 sm:px-4 py-3 sm:py-4 text-right">
          <div className="flex items-center justify-end gap-2 sm:gap-3">
            <div className="hidden sm:block w-24 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white">
              {score.totalPoints}
            </span>
          </div>
        </td>
      </tr>

      {/* Expanded breakdown */}
      {isExpanded && (
        <tr>
          <td colSpan={5} className="bg-gray-50 dark:bg-gray-800/50 px-2 sm:px-4 py-3 sm:py-4">
            <div className="pl-8 sm:pl-12">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Event Breakdown
              </h4>
              <div className="space-y-2">
                {score.eventBreakdown.map((eb) => (
                  <div
                    key={eb.eventId}
                    className="flex items-start justify-between text-sm"
                  >
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 mr-2">
                        #{eb.eventNumber}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {eb.eventName}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {eb.entries.map((entry, i) => {
                          const event = getEvent(eb.eventId);
                          const isRelay = event?.isRelay;
                          const name = isRelay
                            ? `Relay ${entry.relayLetter || ""}`
                            : getSwimmer(entry.swimmerId || "")?.name ||
                              "Unknown";
                          return (
                            <span key={entry.id}>
                              {i > 0 && ", "}
                              {name} ({getOrdinal(entry.place)}: {entry.points}
                              pts)
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white ml-4">
                      {eb.points}
                    </span>
                  </div>
                ))}

                {score.eventBreakdown.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No scoring entries
                  </p>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
