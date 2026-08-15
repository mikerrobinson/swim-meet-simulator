import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { generateId } from "~/lib/id";
import { buildHeats, eligibleEntrants, heatsForEvent, shuffle } from "~/lib/heats";
import { clearMeet, createMeet, loadMeet, saveMeet } from "~/lib/storage";
import { isEligible } from "~/types/meet";
import type {
  Heat,
  LaneCount,
  MeetDoc,
  MeetEvent,
  Result,
  ResultStatus,
  Swimmer,
} from "~/types/meet";

type Updater = (meet: MeetDoc) => MeetDoc;

interface MeetStore {
  /** False until localStorage has been read — nothing renders before then. */
  ready: boolean;
  meet: MeetDoc | null;

  newMeet: (name?: string) => void;
  replaceMeet: (meet: MeetDoc) => void;
  deleteMeet: () => void;
  update: (updater: Updater) => void;
  markSynced: (updatedAt: number) => void;

  // Setup
  setMeetInfo: (patch: Partial<Pick<MeetDoc, "name" | "date">>) => void;
  setLaneCount: (laneCount: LaneCount) => void;
  addSwimmers: (swimmers: Swimmer[], mode: "replace" | "append") => void;
  updateSwimmer: (id: string, patch: Partial<Swimmer>) => void;
  removeSwimmer: (id: string) => void;
  setEvents: (events: MeetEvent[]) => void;
  addEvent: (event: MeetEvent) => void;
  updateEvent: (id: string, patch: Partial<MeetEvent>) => void;
  removeEvent: (id: string) => void;
  moveEvent: (id: string, direction: -1 | 1) => void;

  // Registration
  toggleEntry: (eventId: string, swimmerId: string) => void;
  setEntry: (eventId: string, swimmerId: string, registered: boolean) => void;

  // Heats
  assignToLane: (heatId: string, lane: number, swimmerId: string) => void;
  clearLane: (heatId: string, lane: number) => void;
  ensureHeats: (eventId: string) => void;
  rebuildHeats: (eventId: string, options?: { shuffle?: boolean }) => void;
  setProgress: (eventIndex: number, heatIndex: number) => void;

  // Stopwatch
  startTimer: (heatId: string) => void;
  stopLane: (heat: Heat, lane: number, elapsedMs: number) => void;
  resetHeat: (heatId: string) => void;
  recordManualTime: (
    heat: Heat,
    lane: number,
    swimmerId: string,
    timeMs: number,
  ) => void;
  setResultStatus: (resultId: string, status: ResultStatus) => void;
  removeResult: (resultId: string) => void;
}

const MeetStoreContext = createContext<MeetStore | null>(null);

export function MeetStoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [meet, setMeet] = useState<MeetDoc | null>(null);
  // Skips the very first save, so simply loading the app doesn't look like an edit.
  const loaded = useRef(false);

  useEffect(() => {
    setMeet(loadMeet());
    loaded.current = true;
    setReady(true);
  }, []);

  useEffect(() => {
    if (!loaded.current || !meet) return;
    saveMeet(meet);
  }, [meet]);

  /** Every mutation goes through here so `updatedAt` can never drift. */
  const update = useCallback((updater: Updater) => {
    setMeet((current) => {
      if (!current) return current;
      const next = updater(current);
      if (next === current) return current;
      return { ...next, updatedAt: Date.now() };
    });
  }, []);

  const store = useMemo<MeetStore>(() => {
    const newMeet = (name?: string) => {
      const created = createMeet(name);
      loaded.current = true;
      setMeet(created);
      saveMeet(created);
    };

    const replaceMeet = (next: MeetDoc) => {
      loaded.current = true;
      setMeet(next);
      saveMeet(next);
    };

    const deleteMeet = () => {
      clearMeet();
      setMeet(null);
    };

    const markSynced = (updatedAt: number) =>
      setMeet((current) =>
        current ? { ...current, syncedAt: updatedAt } : current,
      );

    /**
     * Entries for an event changed, so its heats are stale. Rebuilding would
     * discard recorded times, so events that have already been swum keep the
     * heats they were swum in; the UI surfaces a "rebuild" action instead.
     */
    const invalidateHeats = (m: MeetDoc, eventId: string): MeetDoc => {
      const hasResults = m.results.some((r) => r.eventId === eventId);
      if (hasResults) return m;
      return { ...m, heats: m.heats.filter((h) => h.eventId !== eventId) };
    };

    const makeHeats = (m: MeetDoc, eventId: string, reshuffle: boolean) => {
      const entrants = eligibleEntrants(m, eventId);
      return buildHeats(
        eventId,
        reshuffle ? shuffle(entrants) : entrants,
        m.options.laneCount,
      );
    };

    return {
      ready,
      meet,
      newMeet,
      replaceMeet,
      deleteMeet,
      update,
      markSynced,

      setMeetInfo: (patch) => update((m) => ({ ...m, ...patch })),

      setLaneCount: (laneCount) =>
        update((m) => ({
          ...m,
          options: { ...m.options, laneCount },
          // Lane assignments are only meaningful for one pool width. Heats for
          // events already swum stay put; the rest are rebuilt on arrival.
          heats: m.heats.filter((h) =>
            m.results.some((r) => r.eventId === h.eventId),
          ),
        })),

      addSwimmers: (swimmers, mode) =>
        update((m) => {
          if (mode === "replace") {
            return { ...m, swimmers, entries: {}, heats: [], results: [] };
          }
          return { ...m, swimmers: [...m.swimmers, ...swimmers] };
        }),

      updateSwimmer: (id, patch) =>
        update((m) => ({
          ...m,
          swimmers: m.swimmers.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        })),

      removeSwimmer: (id) =>
        update((m) => {
          const entries: MeetDoc["entries"] = {};
          for (const [eventId, ids] of Object.entries(m.entries)) {
            entries[eventId] = ids.filter((swimmerId) => swimmerId !== id);
          }
          return {
            ...m,
            swimmers: m.swimmers.filter((s) => s.id !== id),
            entries,
            heats: m.heats.map((h) => ({
              ...h,
              lanes: h.lanes.map((slot) => (slot === id ? null : slot)),
            })),
            results: m.results.filter((r) => r.swimmerId !== id),
          };
        }),

      setEvents: (events) => update((m) => ({ ...m, events })),

      addEvent: (event) => update((m) => ({ ...m, events: [...m.events, event] })),

      updateEvent: (id, patch) =>
        update((m) => {
          const events = m.events.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          );
          const updated = events.find((e) => e.id === id);
          if (!updated) return m;

          // Narrowing an event's gender has to un-enter whoever no longer
          // qualifies, or they'd be seeded into a heat they can't swim.
          const before = m.entries[id] ?? [];
          const after = before.filter((swimmerId) => {
            const swimmer = m.swimmers.find((s) => s.id === swimmerId);
            return !swimmer || isEligible(swimmer, updated);
          });

          const next = { ...m, events, entries: { ...m.entries, [id]: after } };
          return after.length === before.length ? next : invalidateHeats(next, id);
        }),

      removeEvent: (id) =>
        update((m) => {
          const entries = { ...m.entries };
          delete entries[id];
          return {
            ...m,
            events: m.events.filter((e) => e.id !== id),
            entries,
            heats: m.heats.filter((h) => h.eventId !== id),
            results: m.results.filter((r) => r.eventId !== id),
            progress: { eventIndex: 0, heatIndex: 0 },
          };
        }),

      moveEvent: (id, direction) =>
        update((m) => {
          const index = m.events.findIndex((e) => e.id === id);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= m.events.length) return m;
          const events = [...m.events];
          [events[index], events[target]] = [events[target], events[index]];
          return { ...m, events };
        }),

      toggleEntry: (eventId, swimmerId) =>
        update((m) => {
          const current = m.entries[eventId] ?? [];
          const next = current.includes(swimmerId)
            ? current.filter((id) => id !== swimmerId)
            : [...current, swimmerId];
          return invalidateHeats(
            { ...m, entries: { ...m.entries, [eventId]: next } },
            eventId,
          );
        }),

      setEntry: (eventId, swimmerId, registered) =>
        update((m) => {
          const current = m.entries[eventId] ?? [];
          if (current.includes(swimmerId) === registered) return m;
          const next = registered
            ? [...current, swimmerId]
            : current.filter((id) => id !== swimmerId);
          return invalidateHeats(
            { ...m, entries: { ...m.entries, [eventId]: next } },
            eventId,
          );
        }),

      /**
       * Seat a swimmer in a lane during the meet, entering them in the event if
       * they weren't already. Deliberately does not go through `setEntry`:
       * that invalidates the event's heats, which would delete the very heat
       * being edited.
       */
      assignToLane: (heatId, lane, swimmerId) =>
        update((m) => {
          const target = m.heats.find((h) => h.id === heatId);
          if (!target) return m;
          if (lane < 1 || lane > target.lanes.length) return m;

          const entered = m.entries[target.eventId] ?? [];

          return {
            ...m,
            heats: m.heats.map((h) => {
              if (h.eventId !== target.eventId) return h;
              // Nobody swims an event twice, so vacate whatever lane they
              // already held before seating them here.
              const lanes = h.lanes.map((id) => (id === swimmerId ? null : id));
              if (h.id === heatId) lanes[lane - 1] = swimmerId;
              return { ...h, lanes };
            }),
            entries: entered.includes(swimmerId)
              ? m.entries
              : { ...m.entries, [target.eventId]: [...entered, swimmerId] },
          };
        }),

      clearLane: (heatId, lane) =>
        update((m) => {
          const target = m.heats.find((h) => h.id === heatId);
          const swimmerId = target?.lanes[lane - 1];
          if (!target || !swimmerId) return m;
          // A lane with a time on it is history; clear the time first.
          if (m.results.some((r) => r.heatId === heatId && r.lane === lane)) {
            return m;
          }

          const heats = m.heats.map((h) =>
            h.id === heatId
              ? {
                  ...h,
                  lanes: h.lanes.map((id, i) => (i === lane - 1 ? null : id)),
                }
              : h,
          );

          // Drop the entry as well, unless they hold a lane elsewhere in the
          // event or already have a time in it — otherwise a reseed would put
          // them straight back.
          const seededElsewhere = heats.some(
            (h) => h.eventId === target.eventId && h.lanes.includes(swimmerId),
          );
          const hasResult = m.results.some(
            (r) => r.eventId === target.eventId && r.swimmerId === swimmerId,
          );

          return {
            ...m,
            heats,
            entries:
              seededElsewhere || hasResult
                ? m.entries
                : {
                    ...m.entries,
                    [target.eventId]: (m.entries[target.eventId] ?? []).filter(
                      (id) => id !== swimmerId,
                    ),
                  },
          };
        }),

      ensureHeats: (eventId) =>
        update((m) => {
          if (m.heats.some((h) => h.eventId === eventId)) return m;
          const heats = makeHeats(m, eventId, false);
          if (heats.length === 0) return m;
          return { ...m, heats: [...m.heats, ...heats] };
        }),

      rebuildHeats: (eventId, options) =>
        update((m) => ({
          ...m,
          heats: [
            ...m.heats.filter((h) => h.eventId !== eventId),
            ...makeHeats(m, eventId, options?.shuffle ?? false),
          ],
          results: m.results.filter((r) => r.eventId !== eventId),
          timer: null,
        })),

      setProgress: (eventIndex, heatIndex) =>
        update((m) => ({
          ...m,
          progress: { eventIndex, heatIndex },
          // Never carry a running clock across a heat change.
          timer: null,
        })),

      startTimer: (heatId) =>
        update((m) => ({
          ...m,
          timer: { heatId, startedAt: Date.now() },
          results: m.results.filter((r) => r.heatId !== heatId),
        })),

      stopLane: (heat, lane, elapsedMs) =>
        update((m) => {
          const swimmerId = heat.lanes[lane - 1];
          if (!swimmerId) return m;
          if (
            m.results.some((r) => r.heatId === heat.id && r.lane === lane)
          ) {
            return m;
          }
          const result: Result = {
            id: generateId(),
            eventId: heat.eventId,
            heatId: heat.id,
            swimmerId,
            lane,
            timeMs: elapsedMs,
            status: "OK",
            recordedAt: Date.now(),
          };
          return { ...m, results: [...m.results, result] };
        }),

      resetHeat: (heatId) =>
        update((m) => ({
          ...m,
          timer: null,
          results: m.results.filter((r) => r.heatId !== heatId),
        })),

      recordManualTime: (heat, lane, swimmerId, timeMs) =>
        update((m) => {
          const existing = m.results.find(
            (r) => r.heatId === heat.id && r.lane === lane,
          );
          if (existing) {
            return {
              ...m,
              results: m.results.map((r) =>
                r.id === existing.id
                  ? { ...r, timeMs, status: "OK", manual: true }
                  : r,
              ),
            };
          }
          const result: Result = {
            id: generateId(),
            eventId: heat.eventId,
            heatId: heat.id,
            swimmerId,
            lane,
            timeMs,
            status: "OK",
            recordedAt: Date.now(),
            manual: true,
          };
          return { ...m, results: [...m.results, result] };
        }),

      setResultStatus: (resultId, status) =>
        update((m) => ({
          ...m,
          results: m.results.map((r) =>
            r.id === resultId ? { ...r, status } : r,
          ),
        })),

      removeResult: (resultId) =>
        update((m) => ({
          ...m,
          results: m.results.filter((r) => r.id !== resultId),
        })),
    };
  }, [meet, ready, update]);

  return (
    <MeetStoreContext.Provider value={store}>
      {children}
    </MeetStoreContext.Provider>
  );
}

export function useMeetStore(): MeetStore {
  const store = useContext(MeetStoreContext);
  if (!store) {
    throw new Error("useMeetStore must be used inside a MeetStoreProvider");
  }
  return store;
}

/**
 * Same as `useMeetStore` but narrowed to a loaded meet. Routes behind the
 * meet layout can rely on this rather than null-checking everywhere.
 */
export function useMeet(): MeetStore & { meet: MeetDoc } {
  const store = useMeetStore();
  if (!store.meet) {
    throw new Error("useMeet requires a loaded meet");
  }
  return store as MeetStore & { meet: MeetDoc };
}

export { heatsForEvent };
