/**
 * Parser for HY-TEK Meet Manager psych sheet PDFs
 *
 * Format patterns:
 * - Event headers: "#[number] [Gender] [Age Group] [Distance] Yard [Stroke]"
 * - Continuation: "#9 ... (Girls 10 & Under 100 Yard Butterfly)"
 * - Individual entries: "[Rank] [Name, Last First MI] [Age] [Team] [Time][Suffix?]"
 * - Relay entries: "[Rank] [Team] [Letter] [Time]"
 * - Time suffixes: L = long course, Y = bonus entry
 */

import type { ExtractedPdf } from "./pdf-extractor";
import {
  type Meet,
  type Event,
  type Entry,
  type Team,
  type Swimmer,
  type Stroke,
  type Gender,
  type TimeSuffix,
  createEmptyMeet,
  parseTimeToMs,
  generateId,
} from "~/types/meet";

/**
 * Parse extracted PDF content into a Meet structure
 */
export function parsePsychSheet(
  extracted: ExtractedPdf,
  meetName: string
): Meet {
  const meet = createEmptyMeet(meetName);

  const lines = extracted.fullText.split("\n").filter((line) => line.trim());

  let currentEvent: Event | null = null;
  let sawColumnHeader = false;
  let parsedMeetMetadata = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip page breaks
    if (trimmed.startsWith("---") || trimmed === "") continue;

    // Try to parse meet metadata from header (first occurrence)
    if (!parsedMeetMetadata) {
      const metadata = tryParseMeetHeader(trimmed);
      if (metadata) {
        if (metadata.hostTeam) meet.hostTeam = metadata.hostTeam;
        if (metadata.meetName) meet.name = metadata.meetName;
        if (metadata.date) meet.date = metadata.date;
        parsedMeetMetadata = true;
        continue;
      }
    }

    // Skip common header/footer lines
    if (isHeaderOrFooterLine(trimmed)) continue;

    // Try to detect event headers (primary or continuation)
    const eventMatch = tryParseEventHeader(trimmed);
    if (eventMatch) {
      currentEvent = {
        id: generateId(),
        number: eventMatch.number,
        distance: eventMatch.distance,
        stroke: eventMatch.stroke,
        gender: eventMatch.gender,
        ageGroup: eventMatch.ageGroup,
        isRelay: eventMatch.isRelay,
      };
      meet.events.set(currentEvent.id, currentEvent);
      sawColumnHeader = false;
      continue;
    }

    // Skip "Meet Qualifying:" lines
    if (trimmed.toLowerCase().startsWith("meet qualifying:")) continue;

    // Skip qualifying time standard lines (e.g., "4:58.19 13-14 A")
    if (isQualifyingTimeLine(trimmed)) continue;

    // Skip column headers
    if (isColumnHeader(trimmed)) {
      sawColumnHeader = true;
      continue;
    }

    // Try to parse entries if we have a current event
    if (currentEvent && sawColumnHeader) {
      if (currentEvent.isRelay) {
        const relayEntry = tryParseRelayEntry(trimmed);
        if (relayEntry) {
          const team = getOrCreateTeam(meet, relayEntry.teamAbbr);
          const entry: Entry = {
            id: generateId(),
            eventId: currentEvent.id,
            seedTime: relayEntry.time,
            seedTimeMs: parseTimeToMs(relayEntry.time),
            timeSuffix: relayEntry.timeSuffix,
            teamId: team.id,
            relayLetter: relayEntry.relayLetter,
          };
          meet.entries.push(entry);
        }
      } else {
        const individualEntry = tryParseIndividualEntry(trimmed);
        if (individualEntry) {
          const team = getOrCreateTeam(meet, individualEntry.teamAbbr);
          const swimmer = getOrCreateSwimmer(
            meet,
            individualEntry.swimmerName,
            team.id,
            individualEntry.age
          );
          const entry: Entry = {
            id: generateId(),
            eventId: currentEvent.id,
            seedTime: individualEntry.time,
            seedTimeMs: parseTimeToMs(individualEntry.time),
            timeSuffix: individualEntry.timeSuffix,
            swimmerId: swimmer.id,
          };
          meet.entries.push(entry);
        }
      }
    }
  }

  return meet;
}

interface MeetMetadata {
  hostTeam?: string;
  meetName?: string;
  date?: string;
}

/**
 * Try to parse meet metadata from header line
 * Example: "Flying Fish Arizona Swim Team HY-TEK's MEET MANAGER 8.0 - 12:52 PM 3/2/2026 Page 1"
 * Or: "2026 AZSI SC Age Group State Championship - 3/5/2026 to 3/8/2026"
 */
function tryParseMeetHeader(line: string): MeetMetadata | null {
  // Check for HY-TEK line (contains host team)
  if (line.includes("HY-TEK")) {
    const match = line.match(/^(.+?)\s+HY-TEK/);
    if (match) {
      return { hostTeam: match[1].trim() };
    }
  }

  // Check for meet name with dates
  const dateMatch = line.match(
    /^(.+?)\s+-\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+to\s+(\d{1,2}\/\d{1,2}\/\d{4})$/
  );
  if (dateMatch) {
    return {
      meetName: dateMatch[1].trim(),
      date: `${dateMatch[2]} to ${dateMatch[3]}`,
    };
  }

  return null;
}

/**
 * Check if line is a header/footer we should skip
 */
function isHeaderOrFooterLine(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("hy-tek") ||
    lower === "psych sheet" ||
    /^page\s+\d+/.test(lower) ||
    // Skip lines that are just the meet name repeated
    (lower.includes("championship") && !lower.startsWith("#"))
  );
}

/**
 * Check if line is a column header
 */
function isColumnHeader(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    (lower.includes("name") && lower.includes("team") && lower.includes("time")) ||
    (lower.includes("team") && lower.includes("relay") && lower.includes("time"))
  );
}

/**
 * Check if line is a qualifying time standard line
 * Examples: "4:58.19 13-14 A", "32.69 A", "6:08.49 13-14 B"
 */
function isQualifyingTimeLine(line: string): boolean {
  return /^[\d:\.]+\s+(?:\d{1,2}-\d{1,2}\s+)?[ABS]$/.test(line);
}

interface EventHeaderMatch {
  number: number;
  distance: number;
  stroke: Stroke;
  gender: Gender;
  ageGroup?: string;
  isRelay: boolean;
}

/**
 * Parse event header - handles both primary and continuation formats
 * Primary: "#1 Girls 10 & Under 500 Yard Freestyle"
 * Continuation: "#9 ... (Girls 10 & Under 100 Yard Butterfly)"
 */
function tryParseEventHeader(line: string): EventHeaderMatch | null {
  // Must start with #
  if (!line.startsWith("#")) return null;

  // Try continuation format first: "#9 ... (Girls 10 & Under 100 Yard Butterfly)"
  const continuationMatch = line.match(
    /^#(\d+)\s+\.\.\.\s+\((.+)\)$/
  );
  if (continuationMatch) {
    const eventNumber = parseInt(continuationMatch[1], 10);
    const innerContent = continuationMatch[2];
    return parseEventDetails(innerContent, eventNumber);
  }

  // Try primary format: "#1 Girls 10 & Under 500 Yard Freestyle"
  const primaryMatch = line.match(/^#(\d+)\s+(.+)$/);
  if (primaryMatch) {
    const eventNumber = parseInt(primaryMatch[1], 10);
    const content = primaryMatch[2];
    return parseEventDetails(content, eventNumber);
  }

  return null;
}

/**
 * Parse event details from the content after event number
 */
function parseEventDetails(
  content: string,
  eventNumber: number
): EventHeaderMatch | null {
  const upper = content.toUpperCase();

  // Must contain Yard or Meter
  if (!upper.includes("YARD") && !upper.includes("METER")) return null;

  // Extract distance
  const distanceMatch = content.match(/(\d+)\s*(YARD|METER)/i);
  if (!distanceMatch) return null;
  const distance = parseInt(distanceMatch[1], 10);

  // Determine if relay
  const isRelay = upper.includes("RELAY");

  // Parse gender
  let gender: Gender = "Mixed";
  if (upper.includes("GIRL") || upper.includes("WOMEN")) {
    gender = "F";
  } else if (upper.includes("BOY") || upper.includes("MEN")) {
    gender = "M";
  } else if (upper.includes("MIXED")) {
    gender = "Mixed";
  }

  // Parse age group - look for patterns like "10 & Under", "11-12", "13-14"
  let ageGroup: string | undefined;
  const ageGroupMatch = content.match(
    /(\d{1,2}\s*&\s*Under|\d{1,2}-\d{1,2}|\d{1,2}\s*&\s*Under)/i
  );
  if (ageGroupMatch) {
    ageGroup = ageGroupMatch[1];
  }

  // Parse stroke
  const stroke = parseStroke(upper, isRelay);

  return {
    number: eventNumber,
    distance,
    stroke,
    gender,
    ageGroup,
    isRelay,
  };
}

function parseStroke(line: string, isRelay: boolean): Stroke {
  if (isRelay) {
    if (line.includes("MEDLEY")) return "Medley Relay";
    return "Freestyle Relay";
  }
  if (line.includes("BACK")) return "Backstroke";
  if (line.includes("BREAST")) return "Breaststroke";
  if (line.includes("FLY") || line.includes("BUTTER")) return "Butterfly";
  if (line.includes("INDIVIDUAL MEDLEY") || /\bIM\b/.test(line)) return "IM";
  return "Freestyle";
}

interface IndividualEntryMatch {
  rank: number;
  swimmerName: string;
  age: number;
  teamAbbr: string;
  time: string;
  timeSuffix?: TimeSuffix;
}

/**
 * Parse individual entry line
 * Format: "[Rank] [Name, Last First MI] [Age] [Team] [Time][Suffix?] [Qualifier?]"
 * Examples:
 *   "1 Rial, Siobhan D 10 FAST-AZ 5:57.81"
 *   "13 Montagnino, Hudson L 12 BEAR-AZ 21:09.71L"
 *   "1 Sarracino, Sienna K 16 PSC-AZ 4:56.25 B" (with trailing qualifier)
 *   "6 Domingos, Scarlett E13 HEAT-AZ 5:51.20 B" (concatenated MI+age)
 */
function tryParseIndividualEntry(line: string): IndividualEntryMatch | null {
  // First, try to match the overall structure:
  // rank, name+age combo, team, time, optional suffix, optional qualifier (A/B/S, possibly BB)
  const overallMatch = line.match(
    /^(\d+)\s+(.+?)\s+([A-Z0-9]+-[A-Z]{2})\s+([\d:\.]+|NT)([LYSB])?(?:\s+[ABS]{1,2})?$/
  );

  if (!overallMatch) return null;

  const rank = parseInt(overallMatch[1], 10);
  const nameAgePart = overallMatch[2].trim();
  const teamAbbr = overallMatch[3];
  const time = overallMatch[4];
  const timeSuffix = overallMatch[5] as TimeSuffix | undefined;

  // Now parse nameAgePart to extract name and age
  // Pattern 1: "Last, First MI age" (space before age)
  // e.g., "Sarracino, Sienna K 16" or "Zela, Priam 9"
  let nameMatch = nameAgePart.match(
    /^([A-Za-z][A-Za-z'\-\.\s]+,\s*[A-Za-z][A-Za-z'\-\.\s]*(?:\s+[A-Z])?)\s+(\d{1,2})$/
  );

  if (nameMatch) {
    return {
      rank,
      swimmerName: nameMatch[1].trim(),
      age: parseInt(nameMatch[2], 10),
      teamAbbr,
      time,
      timeSuffix,
    };
  }

  // Pattern 2: "Last, First MIage" (concatenated MI+age, no space)
  // e.g., "Domingos, Scarlett E13" or "Singbartl, Karolina M11"
  nameMatch = nameAgePart.match(
    /^([A-Za-z][A-Za-z'\-\.\s]+,\s*[A-Za-z][A-Za-z'\-\.\s]*)\s?([A-Z])(\d{1,2})$/
  );

  if (nameMatch) {
    return {
      rank,
      swimmerName: (nameMatch[1].trim() + " " + nameMatch[2]).trim(),
      age: parseInt(nameMatch[3], 10),
      teamAbbr,
      time,
      timeSuffix,
    };
  }

  return null;
}

interface RelayEntryMatch {
  rank: number;
  teamAbbr: string;
  relayLetter: string;
  time: string;
  timeSuffix?: TimeSuffix;
}

/**
 * Parse relay entry line
 * Format: "[Rank] [Team] [Letter] [Time]"
 * Example: "1 PSC-AZ A 3:48.87"
 */
function tryParseRelayEntry(line: string): RelayEntryMatch | null {
  const match = line.match(
    /^(\d+)\s+([A-Z0-9]+-[A-Z]{2})\s+([A-Z])\s+([\d:\.]+|NT)([LYSB])?$/
  );

  if (!match) return null;

  return {
    rank: parseInt(match[1], 10),
    teamAbbr: match[2],
    relayLetter: match[3],
    time: match[4],
    timeSuffix: match[5] as TimeSuffix | undefined,
  };
}

/**
 * Get or create a team by abbreviation
 */
function getOrCreateTeam(meet: Meet, abbr: string): Team {
  for (const team of meet.teams.values()) {
    if (team.abbreviation === abbr || team.name === abbr) {
      return team;
    }
  }

  const team: Team = {
    id: generateId(),
    name: abbr,
    abbreviation: abbr,
  };
  meet.teams.set(team.id, team);
  return team;
}

/**
 * Get or create a swimmer by name and team
 */
function getOrCreateSwimmer(
  meet: Meet,
  name: string,
  teamId: string,
  age: number
): Swimmer {
  for (const swimmer of meet.swimmers.values()) {
    if (swimmer.name === name && swimmer.teamId === teamId) {
      // Update age if we have a more recent value
      if (age && (!swimmer.age || age > swimmer.age)) {
        swimmer.age = age;
      }
      return swimmer;
    }
  }

  const swimmer: Swimmer = {
    id: generateId(),
    name,
    teamId,
    age,
  };
  meet.swimmers.set(swimmer.id, swimmer);
  return swimmer;
}
