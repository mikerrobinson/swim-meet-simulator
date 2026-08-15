import { generateId } from "./id";
import type { EventGender, MeetEvent, Stroke } from "~/types/meet";

/**
 * Individual events of a standard high-school dual meet, in the usual swum
 * order. Relays are intentionally absent — this app doesn't handle them.
 */
const DUAL_MEET_ORDER: Array<{ distance: number; stroke: Stroke }> = [
  { distance: 200, stroke: "Free" },
  { distance: 200, stroke: "IM" },
  { distance: 50, stroke: "Free" },
  { distance: 100, stroke: "Fly" },
  { distance: 100, stroke: "Free" },
  { distance: 500, stroke: "Free" },
  { distance: 100, stroke: "Back" },
  { distance: 100, stroke: "Breast" },
];

export function makeEvent(
  distance: number,
  stroke: Stroke,
  gender: EventGender = "Open",
): MeetEvent {
  return { id: generateId(), distance, stroke, gender };
}

/**
 * Build a default event order.
 * "Open" gives one heat set per event; "split" alternates girls/boys like a
 * scored dual meet does.
 */
export function defaultEvents(mode: "open" | "split" = "open"): MeetEvent[] {
  if (mode === "open") {
    return DUAL_MEET_ORDER.map((e) => makeEvent(e.distance, e.stroke, "Open"));
  }
  return DUAL_MEET_ORDER.flatMap((e) => [
    makeEvent(e.distance, e.stroke, "F"),
    makeEvent(e.distance, e.stroke, "M"),
  ]);
}

/** Distances offered in the "add event" picker. */
export const COMMON_DISTANCES = [25, 50, 100, 200, 400, 500, 1000, 1650];
