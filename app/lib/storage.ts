import { generateId } from "./id";
import { defaultEvents } from "./events";
import { MEET_DOC_VERSION, type MeetDoc } from "~/types/meet";

const MEET_KEY = "meet-runner:meet";
const TOKEN_KEY = "meet-runner:sync-token";

export function createMeet(name = "Inter-Squad Dual Meet"): MeetDoc {
  return {
    version: MEET_DOC_VERSION,
    id: generateId(),
    name,
    date: new Date().toISOString().slice(0, 10),
    options: { laneCount: 6, laneLayout: "grid" },
    swimmers: [],
    events: defaultEvents("open"),
    entries: {},
    heats: [],
    results: [],
    progress: { eventIndex: 0, heatIndex: 0 },
    timer: null,
    updatedAt: Date.now(),
    syncedAt: null,
  };
}

/** Fill in anything a doc from an older version (or another device) is missing. */
export function migrate(input: unknown): MeetDoc | null {
  if (!input || typeof input !== "object") return null;
  const doc = input as Partial<MeetDoc>;
  if (!doc.id || !Array.isArray(doc.swimmers) || !Array.isArray(doc.events)) {
    return null;
  }

  const laneCount = doc.options?.laneCount;
  const laneLayout = doc.options?.laneLayout;
  return {
    version: MEET_DOC_VERSION,
    id: doc.id,
    name: doc.name ?? "Untitled Meet",
    date: doc.date ?? new Date().toISOString().slice(0, 10),
    options: {
      laneCount: laneCount === 4 || laneCount === 8 ? laneCount : 6,
      // Saves from before the layout option existed default to the grid.
      laneLayout:
        laneLayout === "list-asc" || laneLayout === "list-desc"
          ? laneLayout
          : "grid",
    },
    swimmers: doc.swimmers.map((s) => ({ ...s, active: s.active !== false })),
    events: doc.events,
    entries: doc.entries ?? {},
    heats: doc.heats ?? [],
    results: doc.results ?? [],
    progress: doc.progress ?? { eventIndex: 0, heatIndex: 0 },
    timer: doc.timer ?? null,
    updatedAt: doc.updatedAt ?? Date.now(),
    syncedAt: doc.syncedAt ?? null,
  };
}

export function loadMeet(): MeetDoc | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(MEET_KEY);
    if (!raw) return null;
    return migrate(JSON.parse(raw));
  } catch (error) {
    console.error("Could not read the saved meet:", error);
    return null;
  }
}

export function saveMeet(meet: MeetDoc): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(MEET_KEY, JSON.stringify(meet));
  } catch (error) {
    // Quota errors here mean times could be lost, so make it loud.
    console.error("Could not save the meet:", error);
  }
}

export function clearMeet(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(MEET_KEY);
}

/** The sync token lives outside the meet doc so it never lands in an export. */
export function loadSyncToken(): string {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function saveSyncToken(token: string): void {
  if (typeof localStorage === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}
