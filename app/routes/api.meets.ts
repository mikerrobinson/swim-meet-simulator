import type { Route } from "./+types/api.meets";
import {
  errorResponse,
  json,
  listMeetSummaries,
  requireAuth,
  requireDb,
  type SyncEnv,
} from "~/lib/meets.server";

export async function loader({ request, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env as SyncEnv;
  try {
    requireAuth(request, env);
    return json({ meets: await listMeetSummaries(requireDb(env)) });
  } catch (error) {
    return errorResponse(error);
  }
}
