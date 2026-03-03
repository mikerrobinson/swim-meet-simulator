/**
 * Core data types for swim meet representation
 */

export type Gender = "M" | "F" | "Mixed";

export type Stroke =
  | "Freestyle"
  | "Backstroke"
  | "Breaststroke"
  | "Butterfly"
  | "IM" // Individual Medley
  | "Medley Relay"
  | "Freestyle Relay";

export interface Team {
  id: string;
  name: string;
  abbreviation?: string;
}

export interface Swimmer {
  id: string;
  name: string;
  teamId: string;
}

export interface Event {
  id: string;
  number: number;
  distance: number; // in yards or meters
  stroke: Stroke;
  gender: Gender;
  ageGroup?: string; // e.g., "13-14", "Open", "Senior"
  isRelay: boolean;
}

export interface Entry {
  id: string;
  eventId: string;
  seedTime: string; // Keep as string to preserve formatting like "1:23.45" or "NT"
  seedTimeMs?: number; // Parsed time in milliseconds for sorting (undefined for NT)

  // For individual events
  swimmerId?: string;

  // For relay events
  teamId?: string;
  relayLetter?: string; // A, B, C, etc.
}

export interface Meet {
  id: string;
  name: string;
  date?: string;
  location?: string;

  // Indexed collections for easy lookup
  teams: Map<string, Team>;
  swimmers: Map<string, Swimmer>;
  events: Map<string, Event>;
  entries: Entry[];
}

/**
 * Helper to create a new empty meet
 */
export function createEmptyMeet(name: string): Meet {
  return {
    id: crypto.randomUUID(),
    name,
    teams: new Map(),
    swimmers: new Map(),
    events: new Map(),
    entries: [],
  };
}

/**
 * Parse a time string like "1:23.45" or "23.45" into milliseconds
 * Returns undefined for "NT" (no time) entries
 */
export function parseTimeToMs(timeStr: string): number | undefined {
  const trimmed = timeStr.trim().toUpperCase();
  if (trimmed === "NT" || trimmed === "NS" || trimmed === "") {
    return undefined;
  }

  // Handle formats: "1:23.45", "23.45", "1:23:45.67" (for very long events)
  const parts = trimmed.split(":");
  let totalMs = 0;

  if (parts.length === 1) {
    // Just seconds: "23.45"
    totalMs = parseFloat(parts[0]) * 1000;
  } else if (parts.length === 2) {
    // Minutes:seconds: "1:23.45"
    totalMs = parseInt(parts[0], 10) * 60 * 1000 + parseFloat(parts[1]) * 1000;
  } else if (parts.length === 3) {
    // Hours:minutes:seconds: "1:23:45.67"
    totalMs =
      parseInt(parts[0], 10) * 60 * 60 * 1000 +
      parseInt(parts[1], 10) * 60 * 1000 +
      parseFloat(parts[2]) * 1000;
  }

  return isNaN(totalMs) ? undefined : Math.round(totalMs);
}

/**
 * Format milliseconds back to a time string
 */
export function formatMsToTime(ms: number): string {
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toFixed(2).padStart(5, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, "0")}`;
  } else {
    return seconds.toFixed(2);
  }
}
