# Monitor

A small Real User Monitoring app. A monitored site loads `rum.js`, which reports page timing, errors, and visitor context. One Node process stores those events in SQLite and serves a dashboard of charts and breakdowns.

## What it collects

The snippet at `/rum.js` batches events to `POST /collect` on the host that served it.

| Event | What it records |
| --- | --- |
| Timing | Page load time, time to first byte (TTFB), and start render |
| JavaScript errors | Exceptions and unhandled promise rejections |
| Network errors | Failed `fetch` and `XMLHttpRequest` calls |
| Crashes | The page was hidden before it finished loading |

Each event also includes a session id, path, page language, device type, operating system, and connection speed. The server adds country and browser family. Raw IP addresses and User-Agent strings are not stored; grouping uses salted hashes. Events older than 30 days are deleted.

The dashboard (Svelte, Chart.js) shows the last 24 hours or 7 days: timing charts, error counts, and page-view breakdowns by URL, country, browser, and device.

## Run

Requires Node.js 20.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

`pnpm dev` listens on port 4000 and rebuilds the dashboard as you edit it. `pnpm start` builds the dashboard, then serves it.

On a monitored site, add:

```html
<script src="http://localhost:4000/rum.js"></script>
```

In development, beacons are accepted from `http://localhost:3000`. The dashboard has no login until credentials are set.

## Production

Set these in `.env`:

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `production` |
| `MONITOR_PORT` | Listen port (default `4000`) |
| `MONITOR_SITE_ORIGINS` | Comma-separated origins allowed to post events |
| `MONITOR_DASHBOARD_USER` | Dashboard basic-auth user |
| `MONITOR_DASHBOARD_PASSWORD` | Dashboard basic-auth password |
| `MONITOR_HASH_SALT` | Salt for IP and User-Agent hashes (at least 16 characters) |
| `MONITOR_DB_PATH` | SQLite file (default `data/rum.sqlite`) |
| `MONITOR_TRUST_PROXY` | Set when a reverse proxy terminates TLS, so visitor IPs stay correct |

Then `pnpm start`, and point the site's script tag at this server's `/rum.js`.
