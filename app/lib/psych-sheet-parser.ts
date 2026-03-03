/**
 * Parser for swim meet psych sheet PDFs
 *
 * This will need refinement once we see actual PDF samples.
 * The general structure expected:
 * - 3 columns per page (data flows top-to-bottom, then left-to-right)
 * - Events are sections with headers: distance, stroke, gender, age group
 * - Each entry has: swimmer name, team, entry time
 * - Pages have headers/footers
 */

import type { ExtractedPdf, PageContent, TextItem } from "./pdf-extractor";
import {
  type Meet,
  type Event,
  type Entry,
  type Team,
  type Swimmer,
  type Stroke,
  type Gender,
  createEmptyMeet,
  parseTimeToMs,
} from "~/types/meet";

/**
 * Parse extracted PDF content into a Meet structure
 *
 * TODO: This is a skeleton that will need to be refined based on actual PDF format
 */
export function parsePsychSheet(
  extracted: ExtractedPdf,
  meetName: string
): Meet {
  const meet = createEmptyMeet(meetName);

  // For now, just do a simple text-based parse
  // This will be refined once we see the actual format
  const lines = extracted.fullText.split("\n").filter((line) => line.trim());

  let currentEvent: Event | null = null;
  let eventNumber = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip page breaks and empty lines
    if (trimmed.startsWith("---") || trimmed === "") continue;

    // Try to detect event headers
    const eventMatch = tryParseEventHeader(trimmed);
    if (eventMatch) {
      eventNumber++;
      currentEvent = {
        id: crypto.randomUUID(),
        number: eventMatch.number ?? eventNumber,
        distance: eventMatch.distance,
        stroke: eventMatch.stroke,
        gender: eventMatch.gender,
        ageGroup: eventMatch.ageGroup,
        isRelay: eventMatch.isRelay,
      };
      meet.events.set(currentEvent.id, currentEvent);
      continue;
    }

    // Try to parse an entry line
    if (currentEvent) {
      const entryMatch = tryParseEntryLine(trimmed);
      if (entryMatch) {
        // Get or create team
        let team = findTeamByName(meet, entryMatch.teamName);
        if (!team) {
          team = {
            id: crypto.randomUUID(),
            name: entryMatch.teamName,
          };
          meet.teams.set(team.id, team);
        }

        if (currentEvent.isRelay) {
          // Relay entry
          const entry: Entry = {
            id: crypto.randomUUID(),
            eventId: currentEvent.id,
            seedTime: entryMatch.time,
            seedTimeMs: parseTimeToMs(entryMatch.time),
            teamId: team.id,
            relayLetter: entryMatch.relayLetter,
          };
          meet.entries.push(entry);
        } else {
          // Individual entry - get or create swimmer
          let swimmer = findSwimmerByNameAndTeam(
            meet,
            entryMatch.swimmerName,
            team.id
          );
          if (!swimmer) {
            swimmer = {
              id: crypto.randomUUID(),
              name: entryMatch.swimmerName,
              teamId: team.id,
            };
            meet.swimmers.set(swimmer.id, swimmer);
          }

          const entry: Entry = {
            id: crypto.randomUUID(),
            eventId: currentEvent.id,
            seedTime: entryMatch.time,
            seedTimeMs: parseTimeToMs(entryMatch.time),
            swimmerId: swimmer.id,
          };
          meet.entries.push(entry);
        }
      }
    }
  }

  return meet;
}

interface EventHeaderMatch {
  number?: number;
  distance: number;
  stroke: Stroke;
  gender: Gender;
  ageGroup?: string;
  isRelay: boolean;
}

/**
 * Try to parse a line as an event header
 * Examples:
 * - "Event 1 Girls 11-12 200 Yard Medley Relay"
 * - "Girls 13-14 100 Yard Freestyle"
 *
 * TODO: Refine regex patterns based on actual PDF format
 */
function tryParseEventHeader(line: string): EventHeaderMatch | null {
  const upper = line.toUpperCase();

  // Check for common event indicators
  const hasEvent = upper.includes("EVENT");
  const hasYard = upper.includes("YARD") || upper.includes("YD");
  const hasMeter = upper.includes("METER") || upper.includes("MTR");

  if (!hasYard && !hasMeter) return null;

  // Try to extract components
  const numberMatch = line.match(/EVENT\s*#?\s*(\d+)/i);
  const distanceMatch = line.match(/(\d+)\s*(YARD|YD|METER|MTR)/i);
  const genderMatch = line.match(/\b(GIRLS?|BOYS?|WOMEN|MEN|MIXED)\b/i);
  const ageGroupMatch = line.match(/\b(\d{1,2}-\d{1,2}|OPEN|SENIOR|JR|SR)\b/i);

  if (!distanceMatch || !genderMatch) return null;

  const distance = parseInt(distanceMatch[1], 10);
  const gender = parseGender(genderMatch[1]);
  const isRelay = upper.includes("RELAY");
  const stroke = parseStroke(upper, isRelay);

  return {
    number: numberMatch ? parseInt(numberMatch[1], 10) : undefined,
    distance,
    stroke,
    gender,
    ageGroup: ageGroupMatch?.[1],
    isRelay,
  };
}

function parseGender(str: string): Gender {
  const upper = str.toUpperCase();
  if (upper.includes("GIRL") || upper.includes("WOMEN")) return "F";
  if (upper.includes("BOY") || upper.includes("MEN")) return "M";
  return "Mixed";
}

function parseStroke(line: string, isRelay: boolean): Stroke {
  if (isRelay) {
    if (line.includes("MEDLEY")) return "Medley Relay";
    return "Freestyle Relay";
  }
  if (line.includes("BACK")) return "Backstroke";
  if (line.includes("BREAST")) return "Breaststroke";
  if (line.includes("FLY") || line.includes("BUTTER")) return "Butterfly";
  if (line.includes("IM") || line.includes("INDIVIDUAL MEDLEY")) return "IM";
  return "Freestyle";
}

interface EntryLineMatch {
  swimmerName: string;
  teamName: string;
  time: string;
  relayLetter?: string;
}

/**
 * Try to parse a line as an entry
 *
 * TODO: This needs significant refinement based on actual PDF format
 * Common formats might be:
 * - "1 Smith, John              TEAM  1:23.45"
 * - "Smith, John | Team Name | 1:23.45"
 */
function tryParseEntryLine(line: string): EntryLineMatch | null {
  // Look for time pattern at the end: M:SS.ss or SS.ss or NT
  const timePattern = /(\d{1,2}:\d{2}\.\d{2}|\d{1,2}\.\d{2}|NT)\s*$/i;
  const timeMatch = line.match(timePattern);

  if (!timeMatch) return null;

  const time = timeMatch[1];
  const beforeTime = line.slice(0, timeMatch.index).trim();

  // Try to split the remaining content into name and team
  // This is very format-dependent and will need refinement
  // Try common separators
  const parts = beforeTime.split(/\s{2,}|\t|[|]/);
  const filtered = parts.map((p) => p.trim()).filter((p) => p.length > 0);

  if (filtered.length < 2) return null;

  // Remove leading rank number if present
  let nameIdx = 0;
  if (/^\d+$/.test(filtered[0])) {
    nameIdx = 1;
  }

  // Check for relay letter pattern (e.g., "A", "B", "C" as a separate field)
  let relayLetter: string | undefined;
  const lastPart = filtered[filtered.length - 1];
  if (/^[A-Z]$/.test(lastPart)) {
    relayLetter = lastPart;
    filtered.pop();
  }

  if (filtered.length < nameIdx + 2) return null;

  return {
    swimmerName: filtered[nameIdx],
    teamName: filtered[nameIdx + 1],
    time,
    relayLetter,
  };
}

function findTeamByName(meet: Meet, name: string): Team | undefined {
  for (const team of meet.teams.values()) {
    if (team.name.toLowerCase() === name.toLowerCase()) {
      return team;
    }
  }
  return undefined;
}

function findSwimmerByNameAndTeam(
  meet: Meet,
  name: string,
  teamId: string
): Swimmer | undefined {
  for (const swimmer of meet.swimmers.values()) {
    if (
      swimmer.name.toLowerCase() === name.toLowerCase() &&
      swimmer.teamId === teamId
    ) {
      return swimmer;
    }
  }
  return undefined;
}
