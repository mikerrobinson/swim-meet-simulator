import { loadSyncToken } from "./storage";
import { migrate } from "./storage";
import type { MeetDoc } from "~/types/meet";

export interface MeetSummary {
  id: string;
  name: string;
  date: string;
  updatedAt: number;
}

/**
 * Resolve an API path against the router basename, so the same code works at
 * `/` in dev and `/projects/meet-runner/` in production.
 */
function apiUrl(path: string): string {
  if (typeof document === "undefined") return path;
  const base = document.querySelector("base")?.getAttribute("href");
  const prefix = (base ?? import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");
  return `${prefix}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = loadSyncToken();
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { "x-sync-token": token } : {}),
      ...init?.headers,
    },
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (body as { error?: string } | null)?.error ??
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body as T;
}

/** Push the local meet to the server. Server keeps whichever copy is newer. */
export async function pushMeet(
  meet: MeetDoc,
): Promise<{ updatedAt: number; applied: boolean }> {
  return request(`/api/meets/${meet.id}`, {
    method: "PUT",
    body: JSON.stringify(meet),
  });
}

/** Fetch a meet by id. Returns null if the server doesn't have it. */
export async function pullMeet(id: string): Promise<MeetDoc | null> {
  const body = await request<{ meet: unknown | null }>(`/api/meets/${id}`);
  return body.meet ? migrate(body.meet) : null;
}

export async function listMeets(): Promise<MeetSummary[]> {
  const body = await request<{ meets: MeetSummary[] }>("/api/meets");
  return body.meets;
}

/** Whether the server has sync configured at all (i.e. a D1 binding exists). */
export async function syncStatus(): Promise<{ enabled: boolean; reason?: string }> {
  try {
    return await request("/api/sync-status");
  } catch (error) {
    return {
      enabled: false,
      reason: error instanceof Error ? error.message : "Server unreachable",
    };
  }
}
