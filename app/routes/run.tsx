import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/run";
import { Banner, Button, EmptyState, Field, Sheet, TextInput } from "~/components/ui";
import { useElapsed, useWakeLock } from "~/hooks/use-stopwatch";
import { heatsForEvent } from "~/lib/heats";
import { formatClock, formatTime, parseTime } from "~/lib/time";
import { useMeet } from "~/state/meet-store";
import {
  eventName,
  shortName,
  swimmerName,
  type Heat,
  type Result,
} from "~/types/meet";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Run Meet · Meet Runner" }];
}

/** Tiles shrink as lanes multiply so 8 lanes still fit one phone screen. */
const TILE_HEIGHT: Record<number, string> = {
  4: "h-32",
  6: "h-28",
  8: "h-24",
};

export default function RunMeet() {
  const {
    meet,
    ensureHeats,
    rebuildHeats,
    setProgress,
    startTimer,
    stopLane,
    resetHeat,
    recordManualTime,
    setResultStatus,
    removeResult,
  } = useMeet();

  const [editingLane, setEditingLane] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const eventIndex = Math.min(meet.progress.eventIndex, meet.events.length - 1);
  const event = meet.events[eventIndex];
  const heats = useMemo(
    () => (event ? heatsForEvent(meet, event.id) : []),
    [meet, event],
  );
  const heatIndex = Math.min(
    meet.progress.heatIndex,
    Math.max(0, heats.length - 1),
  );
  const heat: Heat | undefined = heats[heatIndex];

  // Seed heats the first time we land on an event.
  useEffect(() => {
    if (event) ensureHeats(event.id);
  }, [event, ensureHeats]);

  const running = heat != null && meet.timer?.heatId === heat.id;

  const resultsByLane = useMemo(() => {
    const map = new Map<number, Result>();
    if (!heat) return map;
    for (const result of meet.results) {
      if (result.heatId === heat.id) map.set(result.lane, result);
    }
    return map;
  }, [meet.results, heat]);

  const occupiedLanes = heat
    ? heat.lanes.map((id, i) => (id ? i + 1 : null)).filter((n): n is number => n !== null)
    : [];
  const allStopped =
    occupiedLanes.length > 0 &&
    occupiedLanes.every((lane) => resultsByLane.has(lane));

  /**
   * The three states of the action panel below the lanes: swimmers are still
   * in the water, the heat is complete, or nothing has been started. Exactly
   * one of these owns that space at any moment.
   */
  const clockRunning = running && !allStopped;
  const heatComplete = running && allStopped;

  // Anchored to the wall clock, and the frame loop stops as soon as the last
  // lane is in — there's nothing left to animate.
  const elapsed = useElapsed(clockRunning ? meet.timer!.startedAt : null);
  useWakeLock(running);

  useEffect(() => {
    if (!heatComplete) setConfirmReset(false);
  }, [heatComplete]);

  const goToHeat = (nextEvent: number, nextHeat: number) => {
    setProgress(nextEvent, nextHeat);
    setEditingLane(null);
  };

  const nextHeat = () => {
    if (heatIndex + 1 < heats.length) {
      goToHeat(eventIndex, heatIndex + 1);
    } else if (eventIndex + 1 < meet.events.length) {
      goToHeat(eventIndex + 1, 0);
    }
  };

  const prevHeat = () => {
    if (heatIndex > 0) goToHeat(eventIndex, heatIndex - 1);
    else if (eventIndex > 0) goToHeat(eventIndex - 1, 0);
  };

  if (!event) {
    return (
      <EmptyState title="No events yet">
        <Link to="/setup" className="font-semibold text-blue-600 underline">
          Add events in setup
        </Link>{" "}
        before running the meet.
      </EmptyState>
    );
  }

  const isLastHeat =
    heatIndex + 1 >= heats.length && eventIndex + 1 >= meet.events.length;

  return (
    <div className="space-y-3">
      {/* Event navigation */}
      <div className="flex items-center gap-2">
        <Button
          size="md"
          aria-label="Previous event"
          disabled={clockRunning || eventIndex === 0}
          onClick={() => goToHeat(eventIndex - 1, 0)}
        >
          ‹
        </Button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xl font-bold leading-tight">
            {eventName(event)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Event {eventIndex + 1} of {meet.events.length}
            {heats.length > 0 && ` · Heat ${heatIndex + 1} of ${heats.length}`}
          </p>
        </div>
        <Button
          size="md"
          aria-label="Next event"
          disabled={clockRunning || eventIndex + 1 >= meet.events.length}
          onClick={() => goToHeat(eventIndex + 1, 0)}
        >
          ›
        </Button>
      </div>

      {heats.length === 0 || !heat ? (
        <EmptyState title="Nobody is entered in this event">
          <Link
            to="/registration"
            className="font-semibold text-blue-600 underline"
          >
            Enter swimmers
          </Link>
          , then come back. You can also skip ahead with the arrows above.
        </EmptyState>
      ) : (
        <>
          {/* Lane grid */}
          <div className="grid grid-cols-2 gap-2">
            {heat.lanes.map((swimmerId, i) => {
              const lane = i + 1;
              const swimmer = meet.swimmers.find((s) => s.id === swimmerId);
              const result = resultsByLane.get(lane);
              const height = TILE_HEIGHT[meet.options.laneCount] ?? "h-28";

              if (!swimmer) {
                return (
                  <div
                    key={lane}
                    className={`${height} flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 text-slate-400 dark:border-slate-700`}
                  >
                    <span className="text-sm font-semibold">Lane {lane}</span>
                    <span className="text-xs">empty</span>
                  </div>
                );
              }

              const stopped = result !== undefined;
              const canStop = running && !stopped;

              return (
                <button
                  key={lane}
                  type="button"
                  onClick={() => {
                    if (canStop) stopLane(heat, lane, Date.now() - meet.timer!.startedAt);
                    else setEditingLane(lane);
                  }}
                  className={`${height} flex touch-manipulation flex-col items-center justify-center rounded-2xl px-2 text-center transition-colors ${
                    stopped
                      ? result.status === "OK"
                        ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100"
                        : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100"
                      : running
                        ? "bg-red-600 text-white active:bg-red-700"
                        : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  }`}
                >
                  <span className="text-xs font-bold opacity-70">
                    Lane {lane}
                  </span>
                  <span className="w-full truncate text-base font-bold leading-tight">
                    {shortName(swimmer)}
                  </span>
                  <span className="mt-0.5 text-2xl font-bold tabular-nums leading-none">
                    {stopped
                      ? result.status === "OK"
                        ? formatTime(result.timeMs)
                        : result.status
                      : running
                        ? "STOP"
                        : "—"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action panel. One fixed-height block in the easiest place to
              reach with a thumb, holding whichever of the three states is
              current — so the lane grid above it never shifts. */}
          {clockRunning ? (
            <div className="flex min-h-24 items-center justify-center rounded-2xl bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white">
              <span className="text-6xl font-bold leading-none tabular-nums">
                {formatClock(elapsed)}
              </span>
            </div>
          ) : heatComplete && confirmReset ? (
            /* Cancel sits where Reset just was, so a double tap lands on the
               harmless half rather than erasing the heat. */
            <div className="grid min-h-24 grid-cols-2 gap-2">
              <Button
                size="xl"
                className="!min-h-24 !text-xl"
                onClick={() => setConfirmReset(false)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="xl"
                className="!min-h-24 !text-xl"
                onClick={() => {
                  resetHeat(heat.id);
                  setConfirmReset(false);
                }}
              >
                Erase {resultsByLane.size} time
                {resultsByLane.size === 1 ? "" : "s"}
              </Button>
            </div>
          ) : heatComplete ? (
            <div className="grid min-h-24 grid-cols-2 gap-2">
              <Button
                size="xl"
                className="!min-h-24"
                onClick={() => setConfirmReset(true)}
              >
                Reset
              </Button>
              <Button
                variant="primary"
                size="xl"
                className="!min-h-24"
                onClick={nextHeat}
                disabled={isLastHeat}
              >
                {heatIndex + 1 < heats.length ? "Next heat" : "Next event"}
              </Button>
            </div>
          ) : (
            <Button
              variant="success"
              size="xl"
              full
              className="!min-h-24 !text-4xl"
              onClick={() => startTimer(heat.id)}
            >
              START
            </Button>
          )}

          {!running && (
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" onClick={prevHeat} disabled={eventIndex === 0 && heatIndex === 0}>
                ‹ Back
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => rebuildHeats(event.id, { shuffle: true })}
              >
                Reseed lanes
              </Button>
              <Button size="sm" onClick={nextHeat} disabled={isLastHeat}>
                Skip ›
              </Button>
            </div>
          )}

          {!running && resultsByLane.size > 0 && (
            <Banner tone="info">
              This heat already has {resultsByLane.size} time
              {resultsByLane.size === 1 ? "" : "s"}. Starting again clears them.
            </Banner>
          )}
        </>
      )}

      {heat && editingLane !== null && (
        <LaneSheet
          heat={heat}
          lane={editingLane}
          onClose={() => setEditingLane(null)}
          result={resultsByLane.get(editingLane)}
          swimmerLabel={(() => {
            const s = meet.swimmers.find(
              (x) => x.id === heat.lanes[editingLane - 1],
            );
            return s ? swimmerName(s) : `Lane ${editingLane}`;
          })()}
          onSaveTime={(timeMs) => {
            const swimmerId = heat.lanes[editingLane - 1];
            if (swimmerId) recordManualTime(heat, editingLane, swimmerId, timeMs);
            setEditingLane(null);
          }}
          onStatus={(status) => {
            const existing = resultsByLane.get(editingLane);
            if (existing) setResultStatus(existing.id, status);
            setEditingLane(null);
          }}
          onClear={() => {
            const existing = resultsByLane.get(editingLane);
            if (existing) removeResult(existing.id);
            setEditingLane(null);
          }}
        />
      )}
    </div>
  );
}

/**
 * Fix a lane after the fact: a missed stop button, a fat-fingered tap, or a DQ.
 * Without this a single mistake would cost the whole heat.
 */
function LaneSheet({
  heat,
  lane,
  swimmerLabel,
  result,
  onClose,
  onSaveTime,
  onStatus,
  onClear,
}: {
  heat: Heat;
  lane: number;
  swimmerLabel: string;
  result?: Result;
  onClose: () => void;
  onSaveTime: (timeMs: number) => void;
  onStatus: (status: "OK" | "DQ" | "NS") => void;
  onClear: () => void;
}) {
  const [value, setValue] = useState(
    result && result.status === "OK" ? formatTime(result.timeMs) : "",
  );
  const empty = heat.lanes[lane - 1] === null;

  // Parsed on every keystroke so the sheet can show what will actually be
  // saved — "101.45" becoming 1:01.45 should never be a surprise.
  const parsed = parseTime(value);
  const typed = value.trim() !== "";

  return (
    <Sheet open title={`Lane ${lane} · ${swimmerLabel}`} onClose={onClose}>
      {empty ? (
        <p className="text-slate-500">This lane is empty for this heat.</p>
      ) : (
        <div className="space-y-3">
          <Field
            label="Time"
            hint={'No colon needed \u2014 "101.45" saves as 1:01.45.'}
          >
            <TextInput
              value={value}
              onChange={(e) => setValue(e.target.value)}
              inputMode="decimal"
              placeholder="101.45"
              autoFocus
            />
          </Field>

          {typed &&
            (parsed !== null ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Saves as{" "}
                <strong className="text-base tabular-nums text-slate-900 dark:text-white">
                  {formatTime(parsed)}
                </strong>
              </p>
            ) : (
              <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                Can&rsquo;t read that as a time. Try 28.91, or 101.45 for
                1:01.45.
              </p>
            ))}

          <Button
            variant="primary"
            size="lg"
            full
            disabled={parsed === null}
            onClick={() => parsed !== null && onSaveTime(parsed)}
          >
            Save time
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => onStatus("DQ")} disabled={!result}>
              Mark DQ
            </Button>
            <Button onClick={() => onStatus("NS")} disabled={!result}>
              Mark no-show
            </Button>
          </div>
          {result && (
            <Button variant="ghost" full onClick={onClear}>
              Clear this lane's time
            </Button>
          )}
        </div>
      )}
    </Sheet>
  );
}
