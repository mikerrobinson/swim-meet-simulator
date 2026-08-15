/**
 * Server side of sync. The whole meet is stored as one JSON blob — it's a few
 * hundred KB at most, only one person edits it, and keeping it as a document
 * means the client and server never disagree about shape.
 */

import { migrate } from "./storage";
import type { MeetDoc } from "~/types/meet";

export interface SyncEnv {
  DB?: D1Database;
  SYNC_TOKEN?: string;
}

export class SyncError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof SyncError) {
    return json({ error: error.message }, error.status);
  }
  console.error("Sync failure:", error);
  return json({ error: "Server error" }, 500);
}

/**
 * If SYNC_TOKEN is configured, callers must present it. Without it the
 * endpoints are open — fine for a private worker route, not for a public one.
 */
export function requireAuth(request: Request, env: SyncEnv): void {
  const expected = env.SYNC_TOKEN;
  if (!expected) return;
  if (request.headers.get("x-sync-token") !== expected) {
    throw new SyncError("Sync token missing or incorrect", 401);
  }
}

export function requireDb(env: SyncEnv): D1Database {
  if (!env.DB) {
    throw new SyncError(
      "No D1 database is bound to this worker (expected a binding named DB)",
      503,
    );
  }
  return env.DB;
}

let schemaReady = false;

async function ensureSchema(db: D1Database): Promise<void> {
  if (schemaReady) return;
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS meets (
         id TEXT PRIMARY KEY,
         name TEXT NOT NULL,
         date TEXT NOT NULL,
         updated_at INTEGER NOT NULL,
         data TEXT NOT NULL
       )`,
    )
    .run();
  schemaReady = true;
}

export interface MeetSummaryRow {
  id: string;
  name: string;
  date: string;
  updated_at: number;
}

export async function listMeetSummaries(db: D1Database) {
  await ensureSchema(db);
  const { results } = await db
    .prepare(
      "SELECT id, name, date, updated_at FROM meets ORDER BY updated_at DESC LIMIT 50",
    )
    .all<MeetSummaryRow>();
  return results.map((row) => ({
    id: row.id,
    name: row.name,
    date: row.date,
    updatedAt: row.updated_at,
  }));
}

export async function getMeet(
  db: D1Database,
  id: string,
): Promise<MeetDoc | null> {
  await ensureSchema(db);
  const row = await db
    .prepare("SELECT data FROM meets WHERE id = ?")
    .bind(id)
    .first<{ data: string }>();
  if (!row) return null;
  try {
    return migrate(JSON.parse(row.data));
  } catch {
    throw new SyncError("Stored meet is corrupt", 500);
  }
}

/**
 * Last-write-wins on `updatedAt`. A stale push is rejected rather than applied,
 * so an old tab left open on another device can't clobber the live copy.
 */
export async function putMeet(
  db: D1Database,
  incoming: MeetDoc,
): Promise<{ updatedAt: number; applied: boolean }> {
  await ensureSchema(db);

  const existing = await db
    .prepare("SELECT updated_at FROM meets WHERE id = ?")
    .bind(incoming.id)
    .first<{ updated_at: number }>();

  if (existing && existing.updated_at > incoming.updatedAt) {
    return { updatedAt: existing.updated_at, applied: false };
  }

  await db
    .prepare(
      `INSERT INTO meets (id, name, date, updated_at, data)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         date = excluded.date,
         updated_at = excluded.updated_at,
         data = excluded.data`,
    )
    .bind(
      incoming.id,
      incoming.name,
      incoming.date,
      incoming.updatedAt,
      JSON.stringify(incoming),
    )
    .run();

  return { updatedAt: incoming.updatedAt, applied: true };
}

export async function parseMeetBody(request: Request): Promise<MeetDoc> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new SyncError("Request body wasn't valid JSON", 400);
  }
  const meet = migrate(body);
  if (!meet) throw new SyncError("Request body isn't a meet document", 400);
  return meet;
}
