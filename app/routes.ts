import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/shell.tsx", [
    index("routes/home.tsx"),
    route("setup", "routes/setup.tsx"),
    route("registration", "routes/registration.tsx"),
    route("run", "routes/run.tsx"),
    route("results", "routes/results.tsx"),
  ]),

  // Resource routes for syncing to D1.
  route("api/sync-status", "routes/api.sync-status.ts"),
  route("api/meets", "routes/api.meets.ts"),
  route("api/meets/:id", "routes/api.meet.ts"),
] satisfies RouteConfig;
