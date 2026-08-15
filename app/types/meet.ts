/**
 * Core data model for an inter-squad dual meet.
 *
 * The entire meet is a single JSON document. It lives in localStorage on the
 * device and is pushed/pulled verbatim to the server (D1) when syncing, so
 * every type here must be plain JSON — no Map, Set, or Date instances.
 */

export type Gender = "M" | "F";

/** Events can be restricted to one gender, or open to everyone. */
export type EventGender = Gender | "Open";

export type Stroke = "Free" | "Back" | "Breast" | "Fly" | "IM";

export const STROKES: Stroke[] = ["Free", "Back", "Breast", "Fly", "IM"];

export type LaneCount = 4 | 6 | 8;

export const LANE_COUNTS: LaneCount[] = [4, 6, 8];

export interface Swimmer {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  /** School year as entered — "9", "Fr", "Senior", whatever the CSV had. */
  year: string;
  /** Optional squad/side for an inter-squad meet (e.g. "Blue" / "Gold"). */
  squad?: string;
  /** Scratched swimmers stay in the roster but drop out of heats. */
  active: boolean;
}

export interface MeetEvent {
  id: string;
  distance: number;
  stroke: Stroke;
  gender: EventGender;
  /** Optional label override; otherwise derived from distance/stroke/gender. */
  name?: string;
}

/** eventId -> swimmerIds registered in that event. */
export type Entries = Record<string, string[]>;

export interface Heat {
  id: string;
  eventId: string;
  /** 0-based position within the event. */
  index: number;
  /** One slot per lane, index 0 = lane 1. `null` = empty lane. */
  lanes: (string | null)[];
}

export type ResultStatus = "OK" | "DQ" | "NS";

export interface Result {
  id: string;
  eventId: string;
  heatId: string;
  swimmerId: string;
  /** 1-based lane number. */
  lane: number;
  /** Elapsed time in milliseconds. */
  timeMs: number;
  status: ResultStatus;
  recordedAt: number;
  /** True when the time was typed in rather than captured by the stopwatch. */
  manual?: boolean;
}

export interface MeetOptions {
  laneCount: LaneCount;
}

/**
 * A stopwatch run in progress. Anchored to an absolute epoch timestamp rather
 * than an accumulating counter so the clock stays correct across a reload, a
 * backgrounded tab, or an iOS screen lock.
 */
export interface TimerState {
  heatId: string;
  startedAt: number;
}

export interface Progress {
  eventIndex: number;
  heatIndex: number;
}

export interface MeetDoc {
  /** Bumped when the shape changes so `migrate` can upgrade old saves. */
  version: number;
  id: string;
  name: string;
  /** ISO date (yyyy-mm-dd). */
  date: string;
  options: MeetOptions;
  swimmers: Swimmer[];
  /** Order of this array is the order events are swum. */
  events: MeetEvent[];
  entries: Entries;
  heats: Heat[];
  results: Result[];
  progress: Progress;
  timer: TimerState | null;
  /** Local last-modified time, used to resolve sync conflicts. */
  updatedAt: number;
  /** `updatedAt` as of the last successful sync, or null if never synced. */
  syncedAt: number | null;
}

export const MEET_DOC_VERSION = 1;

export function swimmerName(s: Swimmer): string {
  return `${s.firstName} ${s.lastName}`.trim();
}

/** "Smith, J." — fits in a lane button without wrapping. */
export function shortName(s: Swimmer): string {
  const initial = s.firstName ? `${s.firstName[0]}.` : "";
  return `${s.lastName}${initial ? `, ${initial}` : ""}`;
}

export function eventName(e: MeetEvent): string {
  if (e.name) return e.name;
  const prefix = e.gender === "Open" ? "" : e.gender === "M" ? "Boys " : "Girls ";
  return `${prefix}${e.distance} ${e.stroke}`;
}

/** Whether a swimmer is eligible for an event, given its gender restriction. */
export function isEligible(swimmer: Swimmer, event: MeetEvent): boolean {
  return event.gender === "Open" || event.gender === swimmer.gender;
}
