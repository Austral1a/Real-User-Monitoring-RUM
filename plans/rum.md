# RUM: design notes

The monitor is a standalone Express app. It lives in the fabrika repo for now and will move into its own repo, so nothing here imports from the site, and the site only references it through `MONITOR_URL`.

## Flow

1. The site renders `<script src="${MONITOR_URL}/rum.js">` when `MONITOR_URL` is set.
2. `rum.js` collects timing, errors, and context, and sends batches to `/collect` on the host that served it (`navigator.sendBeacon`, `fetch` with `keepalive` as fallback, both as `text/plain` so no CORS preflight is needed).
3. `POST /collect` checks `Origin` against `MONITOR_SITE_ORIGINS`, caps the body at 8 KB, validates every field against allowlists, strips query strings, adds the country, and stores rows in SQLite.
4. The dashboard is a Svelte app (`web/`, see [svelte.md](svelte.md)). After login it reads `/api/overview?range=24h|7d&by=session|ua|ip|ua-ip` and draws Chart.js charts plus a page-views breakdown (top URLs, countries, browsers, and devices, each with a count and median page load). The `by` toggle recounts sessions from stored hashes; it does not change ingest.

## Events

| Type            | Fields                                                                                                               |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `timing`        | page load (`loadEventEnd - fetchStart`), TTFB (`responseStart - requestStart`), start render (first paint, else FCP) |
| `js_error`      | message, source (`file:line:col`), from `error` and `unhandledrejection`                                             |
| `network_error` | method, host + path, status (`0` for failed requests, otherwise `>= 400`)                                            |
| `crash`         | sent on `pagehide` when the document never reached `readyState === "complete"`                                       |

Every event carries session id (`sessionStorage`), path, `<html lang>`, device bucket, OS, and `effectiveType`. The server adds a browser family parsed from the `User-Agent` header (the raw header is not stored).

## Storage

One `events` table indexed by `received_at`. Raw IPs are never stored. Each row keeps a salted HMAC of the client IP and of the User-Agent (`MONITOR_HASH_SALT`), used only to group sessions on the dashboard. The country comes from `CF-IPCountry` or `geoip-country` (country-only data, about 18 MB in memory). Rows older than 30 days are deleted at startup and daily. Rows stored before hashes existed fall back to `session_id` when grouped by IP or user-agent.

## Hosting (one machine)

One Node process serves the dashboard, `/api`, `/collect`, and `/rum.js`. You do not need a second server for the UI.

On an EC2 (or any VPS):

1. Install Node 20+ and pnpm.
2. Copy `monitor/`, run `pnpm install`, put production values in `.env` (`NODE_ENV=production`, `MONITOR_SITE_ORIGINS`, dashboard auth, `MONITOR_HASH_SALT`).
3. `pnpm start` — that builds `web/` into `dist/` and listens on `MONITOR_PORT` (4000 by default).
4. Point a domain at that instance. Put nginx/Caddy on the **same** machine if you want TLS on 443; set `MONITOR_TRUST_PROXY` so visitor IPs still work.
5. Set the site's `MONITOR_URL` to that origin (e.g. `https://monitor.example.com`).

SQLite lives in `MONITOR_DB_PATH` on that disk. Keep the file across deploys.

## Leaving the fabrika repo

- Move the folder, run `pnpm install` and `pnpm start` (start builds the dashboard, then serves it from Express).
- In fabrika, remove `monitor` from `tsconfig.json` `exclude` and from `eslint.config.mjs` `globalIgnores`.
- Point the site's `MONITOR_URL` at the new host and add the site origins to `MONITOR_SITE_ORIGINS`.
