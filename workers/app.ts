import { createRequestHandler } from "react-router";

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}

const BASE_PATH = "/projects/meet-entries";

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const isProduction = import.meta.env.MODE === "production";

    // Only apply custom routing in production (Cloudflare Workers)
    if (isProduction) {
      // Redirect base path without trailing slash
      if (url.pathname === BASE_PATH) {
        return Response.redirect(`${url.origin}${BASE_PATH}/`, 301);
      }

      // Strip base path for asset lookups
      if (url.pathname.startsWith(BASE_PATH)) {
        const assetPath = url.pathname.slice(BASE_PATH.length) || "/";

        // Try to serve static assets first
        if (env.ASSETS) {
          const assetUrl = new URL(assetPath, url.origin);
          const assetResponse = await env.ASSETS.fetch(
            new Request(assetUrl, request)
          );
          if (assetResponse.status !== 404) {
            return assetResponse;
          }
        }
      }
    }

    // Fall back to React Router for non-asset requests
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
