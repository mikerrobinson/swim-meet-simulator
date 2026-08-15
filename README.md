# Meet Runner

A phone/iPad app for running an inter-squad dual swim meet: build the roster,
enter swimmers in events, then work through the meet heat by heat with a
multi-lane stopwatch. Individual events only — no relays.

Local-first. Everything lives on the device, so the app keeps working on a pool
deck with no signal. Syncing to the server is a button you press when you want
a backup.

## The three modes

**Setup** — three tabs.

- _Roster_: import a CSV, or add swimmers one at a time. The header row can be
  `First Name, Last Name, Gender, Year` plus an optional `Squad`, or a single
  `Name` column (`Last, First` or `First Last`). Column names are matched
  loosely (`sex`, `grade`, `team`, … all work). Rows that can't be read are
  reported rather than dropped silently. The green check scratches a swimmer
  without deleting them.
- _Events_: reorder with the arrows, set each event to Open / Girls / Boys, or
  load a standard 8- or 16-event dual meet order.
- _Options_: 4, 6, or 8 lanes.

**Registration** — swimmers down the side, events across the top, tap a cell to
enter or scratch. The whole screen is grid: the name column and the header row
stay pinned however you scroll, and event columns divide the window evenly,
falling back to sideways scrolling once there are more events than will fit at a
tappable width. Cells grey out where a swimmer isn't eligible for a gendered
event. Counts update live: entries per event in the header, events per swimmer
in the row. Swimmers who turn up on the day get added under Setup → Roster — the
in-grid search box and `+ Swimmer` button are hidden behind
`SHOW_ROSTER_CONTROLS` in `app/routes/registration.tsx`, so flip that to `true`
to bring them back.

**Run Meet** — one heat on screen at a time.

- `START` starts every occupied lane at once.
- Each lane becomes its own big `STOP` button showing the swimmer's name; tap it
  as they touch. The lane freezes at its time, the master clock keeps running.
- When every lane is in, the clock turns green and holds the last finish.
- `Reset` re-runs the current heat (clears its times). `Next heat` advances,
  rolling on to the next event after the last heat.
- Tap a lane that's already stopped to type a time in, mark a DQ or no-show, or
  clear it — one missed stop button shouldn't cost the whole heat. Times are
  typed the way a scoreboard reads them, no colon required: `101.45` is 1:01.45
  and `28.91` is 28.91. The sheet shows what it will save as you type.
- The event arrows are locked while a heat is still in the water, so a stray tap
  can't throw away a running race. They unlock once every lane is in.

**Results** shows each event ranked across all its heats, and exports a results
CSV or a full JSON backup.

## Adding it to a home screen

On the iPhone or iPad, open the site in Safari and pick **Share → Add to Home
Screen**. It launches without the address bar or tabs, which is worth roughly
another heat's worth of rows on the registration grid. Android and desktop
Chrome offer the same thing via the install prompt.

`public/manifest.webmanifest` declares `display: standalone`, and `app/root.tsx`
carries the `apple-*` meta tags plus the touch icon iOS needs — without one it
uses a screenshot of the page as the icon. Icons are generated, not hand-drawn;
see "Regenerating the icons" below.

Two things to know:

- **The installed app has its own storage.** iOS keeps home-screen web apps in a
  separate container from Safari, so a meet you set up in the browser won't be
  in the installed app. Push it to the server first, then pull it down from the
  server list on the first launch.
- **It isn't offline-capable yet.** Once loaded, everything runs locally, but
  the first load of a session still fetches the page from the server. There's no
  service worker, so launching from the home screen with no signal at all will
  fail. Load the app once on the way to the pool and it'll be fine.

### Regenerating the icons

```sh
npm run icons
```

`scripts/make-icons.mjs` writes `public/icon-*.png` directly — Node's `zlib` is
all a PNG encoder actually needs, so there's no image library in the dependency
tree. To change the artwork, edit `waveCoverage` and re-run. Or ignore the
script and drop in real exports at 180, 192, and 512 px, plus a 512 px maskable
version that keeps its content inside the middle 80%.

## How it's put together

React Router 7 (framework mode) on a Cloudflare Worker, Tailwind 4, served under
`/projects/meet-runner/`.

- `app/types/meet.ts` — the whole meet is one JSON document (`MeetDoc`): plain
  JSON only, no `Map`/`Set`/`Date`, so the same value round-trips through
  localStorage and the server unchanged.
- `app/state/meet-store.tsx` — context store. Every mutation goes through
  `update()`, which stamps `updatedAt`; a `useEffect` writes to localStorage on
  change. Routes render nothing until the store has read localStorage, which
  keeps SSR and the client in agreement.
- `app/lib/heats.ts` — seeding. Heats are filled so the short heat comes first
  and the last heat is full, and lanes fill from the middle of the pool outward
  (6 lanes: 3, 4, 2, 5, 1, 6).
- `app/hooks/use-stopwatch.ts` — the clock is always `Date.now() - startedAt`,
  never an accumulated counter, so it stays accurate through dropped frames, a
  backgrounded tab, a screen lock, or a reload mid-heat. Also holds a screen
  wake lock while a heat is running.
- `app/lib/meets.server.ts` + `app/routes/api.*.ts` — sync endpoints.

Times are stored as integer milliseconds and only formatted for display.

### Sync

Whole-document push/pull against D1, resolved by `updatedAt` — a push older than
what the server holds is rejected rather than applied, so a stale tab on another
device can't clobber the live copy. The table is created on first use; there's
no migration step.

| Route | Purpose |
| --- | --- |
| `GET /api/sync-status` | Whether a D1 binding exists |
| `GET /api/meets` | List meets on the server |
| `GET /api/meets/:id` | Fetch one meet |
| `PUT /api/meets/:id` | Push a meet |

## Running it

```sh
npm install
npm run dev          # http://localhost:5173/projects/meet-runner/
npm run typecheck
npm run build
```

`wrangler dev` creates a local D1 automatically, so sync works in development
with no setup.

### Deploying

1. Create the database and paste the returned id into `wrangler.jsonc` in place
   of `REPLACE_WITH_D1_DATABASE_ID`:

   ```sh
   npx wrangler d1 create meet-runner
   ```

2. The sync endpoints are open by default. Since the worker is on a public
   route, set a shared secret and enter the same value under **Sync → Sync
   token** in the app on each device:

   ```sh
   npx wrangler secret put SYNC_TOKEN
   ```

3. `npm run deploy`

Without step 1 the app still deploys and runs; only the sync buttons report
themselves unavailable.

## Not built

- Relays.
- Meet scoring. Swimmers carry an optional `squad`, which is imported, shown,
  and exported, but nothing totals points per squad yet — that's the natural
  next step if you want a running score during an inter-squad meet.
- Seed times, so heats are seeded in roster order rather than by speed.
  "Reseed lanes" in Run mode reshuffles at random.
