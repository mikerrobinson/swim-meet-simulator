import type { Route } from "./+types/api.meet";
import {
  SyncError,
  errorResponse,
  getMeet,
  json,
  parseMeetBody,
  putMeet,
  requireAuth,
  requireDb,
  type SyncEnv,
} from "~/lib/meets.server";

export async function loader({ request, params, context }: Route.LoaderArgs) {
  const env = context.cloudflare.env as SyncEnv;
  try {
    requireAuth(request, env);
    return json({ meet: await getMeet(requireDb(env), params.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function action({ request, params, context }: Route.ActionArgs) {
  const env = context.cloudflare.env as SyncEnv;
  try {
    requireAuth(request, env);
    if (request.method !== "PUT" && request.method !== "POST") {
      throw new SyncError("Use PUT to save a meet", 405);
    }

    const meet = await parseMeetBody(request);
    if (meet.id !== params.id) {
      throw new SyncError("Meet id in the URL and body don't match", 400);
    }

    return json(await putMeet(requireDb(env), meet));
  } catch (error) {
    return errorResponse(error);
  }
}
