/**
 * Scoring utilities for swim meet results
 */

import type { Meet, Event, Entry, Team } from "~/types/meet";

// Point tables for top 16 places
const INDIVIDUAL_POINTS = [20, 17, 16, 15, 14, 13, 12, 11, 9, 7, 6, 5, 4, 3, 2, 1];
const RELAY_POINTS = [40, 34, 32, 30, 28, 26, 24, 22, 18, 14, 12, 10, 8, 6, 4, 2];

// Max relays that score per team per event
const MAX_SCORING_RELAYS_PER_TEAM = 2;

export interface ScoredEntry extends Entry {
  place: number;
  points: number;
}

export interface EventScore {
  event: Event;
  scoredEntries: ScoredEntry[];
}

export interface TeamScore {
  team: Team;
  totalPoints: number;
  individualPoints: number;
  relayPoints: number;
  eventBreakdown: {
    eventId: string;
    eventNumber: number;
    eventName: string;
    points: number;
    entries: ScoredEntry[];
  }[];
}

/**
 * Get points for a given place (1-indexed)
 */
export function getPoints(place: number, isRelay: boolean): number {
  if (place < 1 || place > 16) return 0;
  const table = isRelay ? RELAY_POINTS : INDIVIDUAL_POINTS;
  return table[place - 1];
}

/**
 * Format event name from event data
 */
export function formatEventName(event: Event): string {
  const gender = event.gender === "M" ? "Boys" : event.gender === "F" ? "Girls" : "Mixed";
  const ageGroup = event.ageGroup ? ` ${event.ageGroup}` : "";
  return `${gender}${ageGroup} ${event.distance} ${event.stroke}`;
}

/**
 * Score a single event - returns entries with places and points
 * For relays, only top 2 relays per team score
 */
export function scoreEvent(event: Event, entries: Entry[]): ScoredEntry[] {
  // Sort entries by seed time (fastest first, NT entries last)
  const sortedEntries = [...entries].sort((a, b) => {
    if (a.seedTimeMs === undefined && b.seedTimeMs === undefined) return 0;
    if (a.seedTimeMs === undefined) return 1;
    if (b.seedTimeMs === undefined) return -1;
    return a.seedTimeMs - b.seedTimeMs;
  });

  // Filter out NT entries for scoring
  const timedEntries = sortedEntries.filter((e) => e.seedTimeMs !== undefined);

  if (event.isRelay) {
    // Track how many relays have scored per team
    const teamRelayCount = new Map<string, number>();
    const scoredEntries: ScoredEntry[] = [];
    let scoringPlace = 1;

    for (const entry of timedEntries) {
      const teamId = entry.teamId;
      if (!teamId) continue;

      const currentCount = teamRelayCount.get(teamId) || 0;
      const canScore = currentCount < MAX_SCORING_RELAYS_PER_TEAM;

      if (canScore && scoringPlace <= 16) {
        scoredEntries.push({
          ...entry,
          place: scoringPlace,
          points: getPoints(scoringPlace, true),
        });
        teamRelayCount.set(teamId, currentCount + 1);
        scoringPlace++;
      } else if (canScore) {
        // Past 16th place, no points but still track
        scoredEntries.push({
          ...entry,
          place: scoringPlace,
          points: 0,
        });
        teamRelayCount.set(teamId, currentCount + 1);
        scoringPlace++;
      }
      // Non-scoring relays (3rd+ relay per team) are not included
    }

    return scoredEntries;
  } else {
    // Individual event - straightforward place assignment
    return timedEntries.slice(0, 16).map((entry, index) => ({
      ...entry,
      place: index + 1,
      points: getPoints(index + 1, false),
    }));
  }
}

/**
 * Calculate team scores for the entire meet
 */
export function calculateTeamScores(meet: Meet): TeamScore[] {
  const teamScores = new Map<string, TeamScore>();

  // Initialize team scores
  for (const [teamId, team] of meet.teams) {
    teamScores.set(teamId, {
      team,
      totalPoints: 0,
      individualPoints: 0,
      relayPoints: 0,
      eventBreakdown: [],
    });
  }

  // Score each event
  for (const [eventId, event] of meet.events) {
    const entries = meet.entries.filter((e) => e.eventId === eventId);
    const scoredEntries = scoreEvent(event, entries);

    // Group scored entries by team
    const entriesByTeam = new Map<string, ScoredEntry[]>();

    for (const entry of scoredEntries) {
      let teamId: string | undefined;

      if (event.isRelay) {
        teamId = entry.teamId;
      } else if (entry.swimmerId) {
        const swimmer = meet.swimmers.get(entry.swimmerId);
        teamId = swimmer?.teamId;
      }

      if (!teamId) continue;

      const existing = entriesByTeam.get(teamId) || [];
      existing.push(entry);
      entriesByTeam.set(teamId, existing);
    }

    // Add to team scores
    for (const [teamId, teamEntries] of entriesByTeam) {
      const teamScore = teamScores.get(teamId);
      if (!teamScore) continue;

      const eventPoints = teamEntries.reduce((sum, e) => sum + e.points, 0);

      if (eventPoints > 0) {
        teamScore.eventBreakdown.push({
          eventId,
          eventNumber: event.number,
          eventName: formatEventName(event),
          points: eventPoints,
          entries: teamEntries,
        });

        if (event.isRelay) {
          teamScore.relayPoints += eventPoints;
        } else {
          teamScore.individualPoints += eventPoints;
        }
        teamScore.totalPoints += eventPoints;
      }
    }
  }

  // Sort by total points descending
  const sortedScores = Array.from(teamScores.values()).sort(
    (a, b) => b.totalPoints - a.totalPoints
  );

  // Sort each team's event breakdown by event number
  for (const score of sortedScores) {
    score.eventBreakdown.sort((a, b) => a.eventNumber - b.eventNumber);
  }

  return sortedScores;
}

/**
 * Get all scored entries for an event (for event detail view)
 */
export function getScoredEntriesForEvent(meet: Meet, eventId: string): ScoredEntry[] {
  const event = meet.events.get(eventId);
  if (!event) return [];

  const entries = meet.entries.filter((e) => e.eventId === eventId);
  return scoreEvent(event, entries);
}
