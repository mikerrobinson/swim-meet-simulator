import { useRef, useState } from "react";
import { Link } from "react-router";
import type { Route } from "./+types/home";
import { SyncPanel } from "~/components/SyncPanel";
import {
  Banner,
  Button,
  Card,
  Field,
  SectionTitle,
  TextInput,
} from "~/components/ui";
import { downloadFile } from "~/lib/csv";
import { migrate } from "~/lib/storage";
import { useMeetStore } from "~/state/meet-store";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Meet Runner" },
    {
      name: "description",
      content: "Set up, register, and run an inter-squad dual swim meet.",
    },
  ];
}

const MODES = [
  {
    to: "/setup",
    title: "Setup",
    detail: "Roster, event order, and pool options",
  },
  {
    to: "/registration",
    title: "Registration",
    detail: "Enter swimmers in events",
  },
  { to: "/run", title: "Run Meet", detail: "Heat-by-heat stopwatch" },
];

export default function Home() {
  const { meet, newMeet, replaceMeet, deleteMeet, setMeetInfo } = useMeetStore();
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleImport = async (file: File) => {
    setImportError(null);
    try {
      const parsed = migrate(JSON.parse(await file.text()));
      if (!parsed) throw new Error("That file isn't a Meet Runner backup.");
      replaceMeet({ ...parsed, syncedAt: null });
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Could not read that file.",
      );
    }
  };

  if (!meet) {
    return (
      <div className="space-y-4">
        {/* Server list first: on a second device this is what you came for,
            and it keeps "New meet" from being the obvious thing to tap. */}
        <SyncPanel />
        <Card>
          <SectionTitle>Start a meet</SectionTitle>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
            Everything is stored on this device, so the app keeps working with no
            signal on the pool deck. Sync to the server whenever you want a
            backup.
          </p>
          <Button variant="primary" size="lg" full onClick={() => newMeet()}>
            New meet
          </Button>
          <Button
            className="mt-2"
            size="lg"
            full
            onClick={() => fileInput.current?.click()}
          >
            Restore from a backup file
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImport(file);
              e.target.value = "";
            }}
          />
          {importError && (
            <div className="mt-3">
              <Banner tone="error">{importError}</Banner>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const entryCount = Object.values(meet.entries).reduce(
    (total, ids) => total + ids.length,
    0,
  );
  const stats = [
    { label: "Swimmers", value: meet.swimmers.filter((s) => s.active).length },
    { label: "Events", value: meet.events.length },
    { label: "Entries", value: entryCount },
    { label: "Times", value: meet.results.length },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Meet details</SectionTitle>
        <div className="space-y-3">
          <Field label="Meet name">
            <TextInput
              value={meet.name}
              onChange={(e) => setMeetInfo({ name: e.target.value })}
            />
          </Field>
          <Field label="Date">
            <TextInput
              type="date"
              value={meet.date}
              onChange={(e) => setMeetInfo({ date: e.target.value })}
            />
          </Field>
        </div>

        <dl className="mt-4 grid grid-cols-4 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl bg-slate-100 p-2 text-center dark:bg-slate-800"
            >
              <dd className="text-xl font-bold">{stat.value}</dd>
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </Card>

      <div className="space-y-2">
        {MODES.map((mode) => (
          <Link
            key={mode.to}
            to={mode.to}
            className="flex touch-manipulation items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 active:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:active:bg-slate-800"
          >
            <span>
              <span className="block text-lg font-bold">{mode.title}</span>
              <span className="block text-sm text-slate-500 dark:text-slate-400">
                {mode.detail}
              </span>
            </span>
            <span aria-hidden className="text-2xl text-slate-400">
              ›
            </span>
          </Link>
        ))}
      </div>

      <SyncPanel />

      <Card>
        <SectionTitle>Backup</SectionTitle>
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() =>
              downloadFile(
                `${meet.name.replace(/[^\w-]+/g, "-").toLowerCase()}-${meet.date}.json`,
                JSON.stringify(meet, null, 2),
                "application/json",
              )
            }
          >
            Export file
          </Button>
          <Button onClick={() => fileInput.current?.click()}>Import file</Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
        />
        {importError && (
          <div className="mt-3">
            <Banner tone="error">{importError}</Banner>
          </div>
        )}

        <hr className="my-4 border-slate-200 dark:border-slate-800" />

        {confirmDelete ? (
          <div className="space-y-2">
            <Banner tone="error">
              This erases the roster, entries, and every recorded time on this
              device. Push to the server first if you want to keep it.
            </Banner>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="danger"
                onClick={() => {
                  deleteMeet();
                  setConfirmDelete(false);
                }}
              >
                Delete it
              </Button>
              <Button onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <Button variant="ghost" full onClick={() => setConfirmDelete(true)}>
            Delete this meet from the device
          </Button>
        )}
      </Card>
    </div>
  );
}
