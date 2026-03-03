import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  layout("routes/meet-layout.tsx", [
    route("events", "routes/events.tsx"),
    route("events/:eventId", "routes/event-detail.tsx"),
    route("teams", "routes/teams.tsx"),
    route("teams/:teamId", "routes/team-detail.tsx"),
    route("swimmers", "routes/swimmers.tsx"),
    route("swimmers/:swimmerId", "routes/swimmer-detail.tsx"),
  ]),
] satisfies RouteConfig;
