import { useCallback, useEffect, useRef, useState } from "react";
import {
  Banner,
  Button,
  Card,
  EmptyState,
  Field,
  SectionTitle,
  Segmented,
  TextInput,
} from "./ui";
import { loadSyncToken, saveSyncToken } from "~/lib/storage";
import {
  listMeets,
  pullMeet,
  pushMeet,
  syncStatus,
  type MeetSummary,
} from "~/lib/sync";
import { useSyncStatus } from "~/state/auto-sync";
import { useMeetStore } from "~/state/meet-store";

function relative(timestamp: number | null): string {
  if (!timestamp) return "never";
  const seconds = Math.round((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} hr ago`;
  return new Date(timestamp).toLocaleString();
}

export function SyncPanel() {
  const { meet, markSynced, replaceMeet } = useMeetStore();
  const auto = useSyncStatus();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remote, setRemote] = useState<MeetSummary[] | null>(null);
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  /** A load that would discard unsynced local work, held for confirmation. */
  const [pending, setPending] = useState<MeetSummary | null>(null);
  const autoListed = useRef(false);

  const hasMeet = meet !== null;
  const dirty = meet !== null && meet.syncedAt !== meet.updatedAt;

  useEffect(() => {
    setToken(loadSyncToken());
    syncStatus().then((status) => {
      setEnabled(status.enabled);
      setReason(status.reason);
    });
  }, []);

  const run = useCallback(async (action: () => Promise<string>) => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      setMessage(await action());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleList = useCallback(
    () =>
      run(async () => {
        const meets = await listMeets();
        setRemote(meets);
        return meets.length
          ? `Found ${meets.length} meet${meets.length === 1 ? "" : "s"}.`
          : "No meets on the server yet.";
      }),
    [run],
  );

  // With no meet on this device, the list *is* the reason you opened the app —
  // fetch it without making anyone hunt for a button.
  useEffect(() => {
    if (enabled !== true || hasMeet || autoListed.current) return;
    autoListed.current = true;
    handleList();
  }, [enabled, hasMeet, handleList]);

  const doLoad = (summary: MeetSummary) =>
    run(async () => {
      const remoteMeet = await pullMeet(summary.id);
      if (!remoteMeet) throw new Error("That meet is no longer on the server.");
      replaceMeet({ ...remoteMeet, syncedAt: remoteMeet.updatedAt });
      setPending(null);
      return `Loaded "${remoteMeet.name}".`;
    });

  /** Overwriting un-pushed times would be unrecoverable, so ask first. */
  const requestLoad = (summary: MeetSummary) => {
    if (dirty) setPending(summary);
    else doLoad(summary);
  };

  const handlePush = () =>
    run(async () => {
      if (!meet) throw new Error("No meet loaded");
      const response = await pushMeet(meet);
      markSynced(meet.updatedAt);
      setRemote(null);
      // Clears any backoff the background sync had settled into.
      auto.syncNow();
      return response.applied
        ? "Pushed to the server."
        : "Server already had a newer copy — nothing overwritten.";
    });

  const handlePullCurrent = () => {
    if (!meet) return;
    requestLoad({
      id: meet.id,
      name: meet.name,
      date: meet.date,
      updatedAt: meet.updatedAt,
    });
  };

  const handleSaveToken = () => {
    saveSyncToken(token.trim());
    autoListed.current = false;
    setRemote(null);
    setMessage("Sync token saved on this device.");
    syncStatus().then((status) => {
      setEnabled(status.enabled);
      setReason(status.reason);
    });
  };

  return (
    <Card>
      <SectionTitle
        action={
          enabled === true ? (
            <Button size="sm" variant="ghost" onClick={handleList} disabled={busy}>
              Refresh
            </Button>
          ) : undefined
        }
      >
        {hasMeet ? "Sync" : "Meets on the server"}
      </SectionTitle>

      {enabled === false && (
        <Banner tone="warn">
          Server sync is unavailable{reason ? `: ${reason}` : ""}. Meets are
          still saved on this device and everything works offline.
        </Banner>
      )}

      {hasMeet && (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {auto.phase === "unavailable"
              ? "Server sync is unavailable — this meet is saved on the device only."
              : !auto.enabled
                ? `Auto-sync is off. ${
                    auto.pending
                      ? "This device has changes the server doesn't have."
                      : `Last pushed ${relative(meet.syncedAt)}.`
                  }`
                : auto.phase === "error"
                  ? `Couldn't reach the server, retrying. Last synced ${relative(meet.syncedAt)}.`
                  : auto.pending || auto.phase === "syncing"
                    ? "Saving to the server…"
                    : `Saved to the server ${relative(meet.syncedAt)}. Changes sync on their own.`}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={handlePush} disabled={busy}>
              Push now
            </Button>
            <Button onClick={handlePullCurrent} disabled={busy}>
              Pull this meet
            </Button>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            "Pull this meet" replaces this device's copy of{" "}
            <strong>{meet.name}</strong>. To open a different meet, pick one
            from the list below.
          </p>

          {auto.phase !== "unavailable" && (
            <div className="mt-4">
              <Field
                label="Auto-sync"
                hint="On: this device backs the meet up a couple of seconds after each change. Off: nothing leaves the device until you tap Push now. Set per device, so turning it off here won't affect your other one."
              >
                <Segmented
                  value={auto.enabled ? "on" : "off"}
                  onChange={(value) => auto.setEnabled(value === "on")}
                  options={[
                    { value: "on", label: "On" },
                    { value: "off", label: "Off" },
                  ]}
                />
              </Field>
            </div>
          )}
        </>
      )}

      {/* Confirmation gate for anything that would overwrite local work. */}
      {pending && (
        <div className="mt-3 space-y-2">
          <Banner tone="warn">
            This device has changes that were never pushed. Loading "
            {pending.name}" replaces them, and they can't be recovered.
          </Banner>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={() => doLoad(pending)} disabled={busy}>
              Discard and load
            </Button>
            <Button onClick={() => setPending(null)}>Keep local</Button>
          </div>
        </div>
      )}

      {enabled === true && (
        <div className="mt-4">
          {hasMeet && (
            <h3 className="mb-1 text-sm font-bold text-slate-600 dark:text-slate-300">
              Meets on the server
            </h3>
          )}

          {remote === null ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {busy ? "Loading…" : "Tap Refresh to see what's on the server."}
            </p>
          ) : remote.length === 0 ? (
            <EmptyState title="Nothing on the server yet">
              Push a meet from any device and it will show up here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {remote.map((summary) => {
                const current = meet?.id === summary.id;
                return (
                  <li
                    key={summary.id}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {summary.name}
                        {current && (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                            on this device
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-500">
                        {summary.date} · saved {relative(summary.updatedAt)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={hasMeet ? "secondary" : "primary"}
                      onClick={() => requestLoad(summary)}
                      disabled={busy}
                    >
                      {current ? "Reload" : "Load"}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3">
        <Button size="sm" variant="ghost" onClick={() => setShowToken((v) => !v)}>
          {showToken ? "Hide sync token" : "Sync token"}
        </Button>
      </div>

      {showToken && (
        <div className="mt-2 flex gap-2">
          <TextInput
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Sync token (if your worker requires one)"
            autoComplete="off"
          />
          <Button onClick={handleSaveToken}>Save</Button>
        </div>
      )}

      {message && (
        <div className="mt-3">
          <Banner tone="success">{message}</Banner>
        </div>
      )}
      {error && (
        <div className="mt-3">
          <Banner tone="error">{error}</Banner>
        </div>
      )}
    </Card>
  );
}
