# Dashboard: Svelte + Vite

The dashboard is a Vite + Svelte 5 app in `web/`. It is not SvelteKit, so Express still owns `/`, `/api`, `/collect`, and `/rum.js`.

Layout follows [sveltejs/realworld](https://github.com/sveltejs/realworld): `$lib` is shared library code, reusable widgets live at `$lib` root, and a feature folder uses `index.svelte` plus colocated pieces.

## Layout

- `web/` is the Vite root. `pnpm build` writes hashed assets to `dist/` (gitignored).
- `public/rum.js` stays a static snippet served by Express.
- Chart.js is imported as a module from Svelte. Express no longer serves `chart.umd.min.js`.
- `web/src/App.svelte` mounts the dashboard.
- `$lib` (`web/src/lib`) holds `api`, `constants`, `format`, `charts`, `types`, `search`, and shared widgets (`ChartPane`, `RankedTable`, `ToggleGroup`).
- `$lib/components/ui` is shadcn-svelte (Card, Table, Badge, Alert, ToggleGroup). Dashboard layout uses Tailwind v4.
- `$lib/Dashboard/` is the overview feature: `index.svelte` plus Header, SummaryCards, PageViews, ContextCharts, ErrorTable.

## Dev and production

View and server are one Express process on one origin (`/`, `/api`, `/collect`, `/rum.js`).

- `pnpm dev` mounts Vite behind Express on `MONITOR_PORT` (4000 by default). Open http://localhost:4000.
- `pnpm start` builds the dashboard into `dist/` and serves it from that same Express origin (basic auth and CSP included).
- If `dist/index.html` is missing and Vite is not mounted, `GET /` returns 503.

## Rule

Nothing in `web/` imports `src/store.ts` or other server modules that pull in `better-sqlite3`. The overview JSON shape is copied in `web/src/lib/types.ts`.
