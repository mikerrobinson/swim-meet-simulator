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
  const elapsed = useElapsed(running ? meet.timer!.startedAt : null);
  useWakeLock(running);

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

  // Once every lane is in, freeze the display at the last finish.
  const lastFinish = Math.max(
    0,
    ...[...resultsByLane.values()].map((r) => r.timeMs),
  );
  const clockMs = running ? (allStopped ? lastFinish : elapsed) : 0;

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
          disabled={eventIndex === 0}
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
          disabled={eventIndex + 1 >= meet.events.length}
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
          {/* Master clock */}
          <div
            className={`rounded-2xl py-3 text-center tabular-nums ${
              running
                ? allStopped
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-900 text-white dark:bg-slate-800"
                : "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
            }`}
          >
            <span className="text-5xl font-bold">{formatClock(clockMs)}</span>
            {allStopped && (
              <span className="mt-1 block text-sm font-semibold">
                All lanes in
              </span>
            )}
          </div>

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

          {/* Primary action */}
          {!running ? (
            <Button
              variant="success"
              size="xl"
              full
              className="!min-h-24 !text-4xl"
              onClick={() => startTimer(heat.id)}
            >
              START
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <Button size="lg" onClick={() => resetHeat(heat.id)}>
                Reset
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={nextHeat}
                disabled={isLastHeat}
              >
                {heatIndex + 1 < heats.length ? "Next heat" : "Next event"}
              </Button>
            </div>
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
  const [error, setError] = useState<string | null>(null);
  const empty = heat.lanes[lane - 1] === null;

  const save = () => {
    const parsed = parseTime(value);
    if (parsed === null) {
      setError('Enter a time like "28.91" or "1:23.45".');
      return;
    }
    onSaveTime(parsed);
  };

  return (
    <Sheet open title={`Lane ${lane} · ${swimmerLabel}`} onClose={onClose}>
      {empty ? (
        <p className="text-slate-500">This lane is empty for this heat.</p>
      ) : (
        <div className="space-y-3">
          <Field label="Time" hint="Type it in if the stopwatch missed the touch.">
            <TextInput
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null);
              }}
              inputMode="decimal"
              placeholder="1:23.45"
              autoFocus
            />
          </Field>
          {error && <Banner tone="error">{error}</Banner>}
          <Button variant="primary" size="lg" full onClick={save}>
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
