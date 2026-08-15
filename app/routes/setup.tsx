import { useMemo, useRef, useState } from "react";
import type { Route } from "./+types/setup";
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  SectionTitle,
  Segmented,
  Select,
  TextInput,
} from "~/components/ui";
import { SwimmerSheet } from "~/components/SwimmerSheet";
import { downloadFile, parseRosterCsv, toCsv } from "~/lib/csv";
import { COMMON_DISTANCES, defaultEvents, makeEvent } from "~/lib/events";
import { useMeet } from "~/state/meet-store";
import {
  LANE_COUNTS,
  STROKES,
  eventName,
  orderedLanes,
  swimmerName,
  type EventGender,
  type LaneCount,
  type LaneLayout,
  type Stroke,
  type Swimmer,
} from "~/types/meet";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Setup · Meet Runner" }];
}

type Tab = "roster" | "events" | "options";

const TEMPLATE = toCsv([
  ["First Name", "Last Name", "Gender", "Year", "Squad"],
  ["Avery", "Nguyen", "F", "10", "Blue"],
  ["Marcus", "Hill", "M", "12", "Gold"],
]);

export default function Setup() {
  const [tab, setTab] = useState<Tab>("roster");

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-slate-200 p-1 dark:bg-slate-800">
        {(
          [
            ["roster", "Roster"],
            ["events", "Events"],
            ["options", "Options"],
          ] as Array<[Tab, string]>
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`min-h-11 flex-1 touch-manipulation rounded-lg text-base font-semibold transition-colors ${
              tab === value
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "roster" && <RosterTab />}
      {tab === "events" && <EventsTab />}
      {tab === "options" && <OptionsTab />}
    </div>
  );
}

/* ------------------------------------------------------------------ roster */

function RosterTab() {
  const { meet, addSwimmers, updateSwimmer, removeSwimmer } = useMeet();
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pending, setPending] = useState<Swimmer[] | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Swimmer | null>(null);
  const [adding, setAdding] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const { swimmers, warnings: issues } = parseRosterCsv(await file.text());
    setWarnings(issues);
    if (swimmers.length === 0) return;
    if (meet.swimmers.length === 0) {
      addSwimmers(swimmers, "replace");
    } else {
      setPending(swimmers);
    }
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return meet.swimmers;
    return meet.swimmers.filter((s) =>
      swimmerName(s).toLowerCase().includes(query),
    );
  }, [meet.swimmers, search]);

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Import roster</SectionTitle>
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          CSV with a header row. Columns can be{" "}
          <strong>First Name, Last Name, Gender, Year</strong> — plus an optional{" "}
          <strong>Squad</strong> for inter-squad sides. A single{" "}
          <strong>Name</strong> column works too.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="primary" onClick={() => fileInput.current?.click()}>
            Choose CSV
          </Button>
          <Button
            onClick={() =>
              downloadFile("roster-template.csv", TEMPLATE, "text/csv")
            }
          >
            Template
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        {pending && (
          <div className="mt-3 space-y-2">
            <Banner tone="warn">
              You already have {meet.swimmers.length} swimmers. Add the{" "}
              {pending.length} from this file, or replace the roster? Replacing
              also clears entries and recorded times.
            </Banner>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  addSwimmers(pending, "append");
                  setPending(null);
                }}
              >
                Add
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  addSwimmers(pending, "replace");
                  setPending(null);
                }}
              >
                Replace
              </Button>
              <Button onClick={() => setPending(null)}>Cancel</Button>
            </div>
          </div>
        )}

        {warnings.length > 0 && (
          <div className="mt-3">
            <Banner tone="warn">
              <p className="font-semibold">Import notes</p>
              <ul className="mt-1 list-disc pl-4">
                {warnings.slice(0, 8).map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
                {warnings.length > 8 && (
                  <li>…and {warnings.length - 8} more.</li>
                )}
              </ul>
            </Banner>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle
          action={
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
              + Swimmer
            </Button>
          }
        >
          Roster ({meet.swimmers.filter((s) => s.active).length})
        </SectionTitle>

        {meet.swimmers.length === 0 ? (
          <EmptyState title="No swimmers yet">
            Import a CSV above, or add swimmers one at a time.
          </EmptyState>
        ) : (
          <>
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search swimmers"
              className="mb-2"
            />
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {visible.map((swimmer) => (
                <li key={swimmer.id} className="flex items-center gap-2 py-1">
                  <button
                    type="button"
                    onClick={() =>
                      updateSwimmer(swimmer.id, { active: !swimmer.active })
                    }
                    aria-label={
                      swimmer.active
                        ? `Scratch ${swimmerName(swimmer)}`
                        : `Reinstate ${swimmerName(swimmer)}`
                    }
                    className={`h-9 w-9 shrink-0 touch-manipulation rounded-lg border-2 text-lg font-bold ${
                      swimmer.active
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 text-transparent dark:border-slate-600"
                    }`}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(swimmer)}
                    className="min-w-0 flex-1 py-2 text-left"
                  >
                    <span
                      className={`block truncate font-semibold ${
                        swimmer.active ? "" : "text-slate-400 line-through"
                      }`}
                    >
                      {swimmerName(swimmer)}
                    </span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {swimmer.gender}
                      {swimmer.year && ` · ${swimmer.year}`}
                      {swimmer.squad && ` · ${swimmer.squad}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {/* Mounted only while open so the form starts blank each time. */}
      {adding && (
        <SwimmerSheet
          title="Add swimmer"
          onClose={() => setAdding(false)}
          onSave={(swimmer) => {
            addSwimmers([swimmer], "append");
            setAdding(false);
          }}
        />
      )}

      {editing && (
        <SwimmerSheet
          key={editing.id}
          title="Edit swimmer"
          swimmer={editing}
          onClose={() => setEditing(null)}
          onSave={(swimmer) => {
            updateSwimmer(editing.id, swimmer);
            setEditing(null);
          }}
          onDelete={() => {
            removeSwimmer(editing.id);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ events */

function EventsTab() {
  const { meet, addEvent, updateEvent, removeEvent, moveEvent, setEvents } =
    useMeet();
  const [distance, setDistance] = useState(50);
  const [stroke, setStroke] = useState<Stroke>("Free");
  const [gender, setGender] = useState<EventGender>("Open");

  const hasResults = meet.results.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Event order</SectionTitle>
        {meet.events.length === 0 ? (
          <EmptyState title="No events yet">
            Load a standard dual-meet order below, or add events one at a time.
          </EmptyState>
        ) : (
          <ol className="divide-y divide-slate-200 dark:divide-slate-800">
            {meet.events.map((event, index) => (
              <li key={event.id} className="flex items-center gap-2 py-2">
                <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-400">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{eventName(event)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(meet.entries[event.id] ?? []).length} entered
                  </p>
                </div>
                <Select
                  aria-label={`Gender for ${eventName(event)}`}
                  value={event.gender}
                  onChange={(e) =>
                    updateEvent(event.id, {
                      gender: e.target.value as EventGender,
                    })
                  }
                  className="!w-24 !min-h-10 !text-sm"
                >
                  <option value="Open">Open</option>
                  <option value="F">Girls</option>
                  <option value="M">Boys</option>
                </Select>
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label="Move up"
                    disabled={index === 0}
                    onClick={() => moveEvent(event.id, -1)}
                    className="h-7 w-9 touch-manipulation rounded-t-lg bg-slate-200 text-xs disabled:opacity-30 dark:bg-slate-800"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    disabled={index === meet.events.length - 1}
                    onClick={() => moveEvent(event.id, 1)}
                    className="h-7 w-9 touch-manipulation rounded-b-lg bg-slate-200 text-xs disabled:opacity-30 dark:bg-slate-800"
                  >
                    ▼
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${eventName(event)}`}
                  onClick={() => removeEvent(event.id)}
                  className="h-11 w-9 shrink-0 touch-manipulation rounded-lg text-lg text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <SectionTitle>Add an event</SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <Field label="Distance">
            <Select
              value={distance}
              onChange={(e) => setDistance(Number(e.target.value))}
            >
              {COMMON_DISTANCES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Stroke">
            <Select
              value={stroke}
              onChange={(e) => setStroke(e.target.value as Stroke)}
            >
              {STROKES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Gender">
            <Select
              value={gender}
              onChange={(e) => setGender(e.target.value as EventGender)}
            >
              <option value="Open">Open</option>
              <option value="F">Girls</option>
              <option value="M">Boys</option>
            </Select>
          </Field>
        </div>
        <Button
          className="mt-3"
          variant="primary"
          size="lg"
          full
          onClick={() => addEvent(makeEvent(distance, stroke, gender))}
        >
          Add {distance} {stroke}
        </Button>
      </Card>

      <Card>
        <SectionTitle>Standard orders</SectionTitle>
        {hasResults && (
          <div className="mb-3">
            <Banner tone="warn">
              Replacing the event list clears recorded times along with it.
            </Banner>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => setEvents(defaultEvents("open"))}>
            8 open events
          </Button>
          <Button onClick={() => setEvents(defaultEvents("split"))}>
            16 girls/boys
          </Button>
        </div>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Individual events only — 200 Free, 200 IM, 50 Free, 100 Fly, 100 Free,
          500 Free, 100 Back, 100 Breast.
        </p>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------- options */

function OptionsTab() {
  const { meet, setLaneCount, setLaneLayout } = useMeet();
  const { laneCount, laneLayout } = meet.options;

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Pool</SectionTitle>
        <Field
          label="Lanes"
          hint="Sets how many swimmers go per heat, and how many buttons the stopwatch shows."
        >
          <Segmented
            value={laneCount}
            onChange={(value) => setLaneCount(value as LaneCount)}
            options={LANE_COUNTS.map((n) => ({ value: n, label: String(n) }))}
          />
        </Field>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          Changing the lane count re-seeds heats for any event that hasn't been
          swum yet. Events with recorded times keep their original lanes.
        </p>
      </Card>

      <Card>
        <SectionTitle>Stopwatch buttons</SectionTitle>
        <Field
          label="Layout"
          hint="A single column in pool order is easier to hit without looking — read the finish, drop straight down the column."
        >
          <Segmented
            value={laneLayout}
            onChange={(value) => setLaneLayout(value as LaneLayout)}
            options={[
              { value: "grid" as LaneLayout, label: "Grid" },
              { value: "list-asc" as LaneLayout, label: `1 → ${laneCount}` },
              { value: "list-desc" as LaneLayout, label: `${laneCount} → 1` },
            ]}
          />
        </Field>
        <LayoutPreview laneCount={laneCount} layout={laneLayout} />
      </Card>
    </div>
  );
}

/** Miniature of the Run screen's button arrangement, so the choice is visible. */
function LayoutPreview({
  laneCount,
  layout,
}: {
  laneCount: LaneCount;
  layout: LaneLayout;
}) {
  return (
    <div
      className={`mt-3 grid gap-1 ${
        layout === "grid" ? "grid-cols-2" : "grid-cols-1"
      }`}
    >
      {orderedLanes(laneCount, layout).map((lane) => (
        <div
          key={lane}
          className="rounded-md bg-slate-200 py-1 text-center text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300"
        >
          Lane {lane}
        </div>
      ))}
    </div>
  );
}
