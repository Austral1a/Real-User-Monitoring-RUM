import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

import type { EventType, StoredEvent } from "./types";

export interface TimingRow {
  receivedAt: number;
  pageLoad: number | null;
  ttfb: number | null;
  startRender: number | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
}

export interface Totals {
  sessions: number;
  pageLoads: number;
  jsErrors: number;
  networkErrors: number;
  crashedSessions: number;
}

export interface ErrorRow {
  receivedAt: number;
  type: Exclude<EventType, "timing">;
  path: string;
  message: string | null;
  source: string | null;
  status: number | null;
  method: string | null;
  device: string;
  os: string;
  country: string | null;
}

export interface BreakdownRow {
  key: string;
  sessions: number;
}

export interface PageViewSample {
  key: string;
  pageLoad: number | null;
}

export interface EventFilter {
  path?: string;
  origin?: string;
  lang?: string;
  /** `undefined` includes both; `true` is crawlers only, `false` is humans only. */
  bot?: boolean;
}

export const PAGEVIEW_COLUMNS = {
  path: "path",
  country: "country",
  browser: "browser",
  device: "device",
  origin: "origin",
  lang: "lang",
} as const;

export type PageViewKey = keyof typeof PAGEVIEW_COLUMNS;

export const BREAKDOWN_COLUMNS = {
  device: "device",
  os: "os",
  connection: "connection",
  country: "country",
} as const;

export type BreakdownKey = keyof typeof BREAKDOWN_COLUMNS;

/**
 * How events are grouped into sessions. Rows stored before hashes existed
 * have no IP or user-agent hash, so they fall back to their session id.
 */
const SESSION_EXPRESSIONS = {
  session: "session_id",
  ua: "COALESCE(ua_hash, 's:' || session_id)",
  ip: "COALESCE(ip_hash, 's:' || session_id)",
  "ua-ip": "COALESCE(ip_hash || ':' || ua_hash, 's:' || session_id)",
} as const;

export type SessionKey = keyof typeof SESSION_EXPRESSIONS;

export const SESSION_KEYS = Object.keys(SESSION_EXPRESSIONS) as SessionKey[];

export interface Store {
  insert(events: StoredEvent[]): void;
  /** Deletes events received before `before` and returns how many were removed. */
  prune(before: number): number;
  timings(from: number, to: number, filter?: EventFilter): TimingRow[];
  totals(
    from: number,
    to: number,
    sessionKey: SessionKey,
    filter?: EventFilter,
  ): Totals;
  recentErrors(
    from: number,
    to: number,
    limit: number,
    filter?: EventFilter,
  ): ErrorRow[];
  breakdown(
    key: BreakdownKey,
    from: number,
    to: number,
    sessionKey: SessionKey,
    filter?: EventFilter,
  ): BreakdownRow[];
  pageViews(
    key: PageViewKey,
    from: number,
    to: number,
    filter?: EventFilter,
  ): PageViewSample[];
  close(): void;
}

const RANGE_AND_FILTER = `
  received_at >= ? AND received_at < ?
  AND (? = '' OR path = ?)
  AND (? = '' OR origin = ?)
  AND (? = '' OR lang = ?)
  AND (? = -1 OR bot = ?)
`;

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    received_at INTEGER NOT NULL,
    type TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    lang TEXT,
    origin TEXT,
    device TEXT NOT NULL,
    os TEXT NOT NULL,
    connection TEXT NOT NULL,
    country TEXT,
    page_load INTEGER,
    ttfb INTEGER,
    start_render INTEGER,
    lcp INTEGER,
    inp INTEGER,
    cls INTEGER,
    message TEXT,
    source TEXT,
    status INTEGER,
    method TEXT,
    ip_hash TEXT,
    ua_hash TEXT,
    browser TEXT NOT NULL DEFAULT 'Other',
    bot INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS events_received_at ON events (received_at);
`;

const ADDED_COLUMNS: ReadonlyArray<{ name: string; ddl: string }> = [
  { name: "ip_hash", ddl: "TEXT" },
  { name: "ua_hash", ddl: "TEXT" },
  { name: "browser", ddl: "TEXT NOT NULL DEFAULT 'Other'" },
  { name: "lcp", ddl: "INTEGER" },
  { name: "inp", ddl: "INTEGER" },
  { name: "cls", ddl: "INTEGER" },
  { name: "origin", ddl: "TEXT" },
  { name: "bot", ddl: "INTEGER NOT NULL DEFAULT 0" },
];

type RangeParams = [
  number,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  number,
];

export function bindFilter(
  from: number,
  to: number,
  filter: EventFilter = {},
): RangeParams {
  const path = filter.path ?? "";
  const origin = filter.origin ?? "";
  const lang = filter.lang ?? "";
  const bot = filter.bot === undefined ? -1 : filter.bot ? 1 : 0;
  return [from, to, path, path, origin, origin, lang, lang, bot, bot];
}

export function openStore(path: string): Store {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  addMissingColumns(db);
  db.exec(`
    CREATE INDEX IF NOT EXISTS events_received_at_type ON events (received_at, type);
    CREATE INDEX IF NOT EXISTS events_received_at_bot ON events (received_at, bot);
  `);

  const insertEvent = db.prepare(`
    INSERT INTO events (
      received_at, type, session_id, path, lang, origin, device, os, connection, country,
      page_load, ttfb, start_render, lcp, inp, cls, message, source, status, method,
      ip_hash, ua_hash, browser, bot
    ) VALUES (
      @receivedAt, @type, @sessionId, @path, @lang, @origin, @device, @os, @connection, @country,
      @pageLoad, @ttfb, @startRender, @lcp, @inp, @cls, @message, @source, @status, @method,
      @ipHash, @uaHash, @browser, @bot
    )
  `);
  const insertMany = db.transaction((events: StoredEvent[]) => {
    for (const event of events) {
      insertEvent.run({ ...event, bot: event.bot ? 1 : 0 });
    }
  });

  const pruneEvents = db.prepare("DELETE FROM events WHERE received_at < ?");

  const selectTimings = db.prepare<RangeParams, TimingRow>(`
    SELECT received_at AS receivedAt, page_load AS pageLoad, ttfb, start_render AS startRender,
           lcp, inp, cls
    FROM events
    WHERE type = 'timing' AND ${RANGE_AND_FILTER}
  `);

  const selectTotals = bySessionKey((session) =>
    db.prepare<RangeParams, Totals>(`
      SELECT
        COUNT(DISTINCT ${session}) AS sessions,
        COALESCE(SUM(type = 'timing' AND page_load IS NOT NULL), 0) AS pageLoads,
        COALESCE(SUM(type = 'js_error'), 0) AS jsErrors,
        COALESCE(SUM(type = 'network_error'), 0) AS networkErrors,
        COUNT(DISTINCT CASE WHEN type = 'crash' THEN ${session} END) AS crashedSessions
      FROM events
      WHERE ${RANGE_AND_FILTER}
    `),
  );

  const selectErrors = db.prepare<
    [...RangeParams, number],
    ErrorRow
  >(`
    SELECT
      received_at AS receivedAt, type, path, message, source, status, method,
      device, os, country
    FROM events
    WHERE type != 'timing' AND ${RANGE_AND_FILTER}
    ORDER BY received_at DESC
    LIMIT ?
  `);

  const selectBreakdown = bySessionKey(
    (session) =>
      Object.fromEntries(
        Object.entries(BREAKDOWN_COLUMNS).map(([key, column]) => [
          key,
          db.prepare<RangeParams, BreakdownRow>(`
            SELECT COALESCE(${column}, 'unknown') AS key, COUNT(DISTINCT ${session}) AS sessions
            FROM events
            WHERE ${RANGE_AND_FILTER}
            GROUP BY 1
            ORDER BY sessions DESC
            LIMIT 10
          `),
        ]),
      ) as Record<
        BreakdownKey,
        Database.Statement<RangeParams, BreakdownRow>
      >,
  );

  const selectPageViews = Object.fromEntries(
    Object.entries(PAGEVIEW_COLUMNS).map(([key, column]) => [
      key,
      db.prepare<RangeParams, PageViewSample>(`
        SELECT COALESCE(NULLIF(${column}, ''), '${fallbackLabel(key as PageViewKey)}') AS key,
               page_load AS pageLoad
        FROM events
        WHERE type = 'timing' AND page_load IS NOT NULL AND ${RANGE_AND_FILTER}
      `),
    ]),
  ) as Record<PageViewKey, Database.Statement<RangeParams, PageViewSample>>;

  return {
    insert: (events) => insertMany(events),
    prune: (before) => pruneEvents.run(before).changes,
    timings: (from, to, filter) =>
      selectTimings.all(...bindFilter(from, to, filter)),
    totals: (from, to, sessionKey, filter) =>
      selectTotals[sessionKey].get(...bindFilter(from, to, filter)) as Totals,
    recentErrors: (from, to, limit, filter) =>
      selectErrors.all(...bindFilter(from, to, filter), limit),
    breakdown: (key, from, to, sessionKey, filter) =>
      selectBreakdown[sessionKey][key].all(...bindFilter(from, to, filter)),
    pageViews: (key, from, to, filter) =>
      selectPageViews[key].all(...bindFilter(from, to, filter)),
    close: () => db.close(),
  };
}

function fallbackLabel(key: PageViewKey): string {
  return key === "browser" ? "Other" : "unknown";
}

/** Prepares one variant of a query per session key, from a fixed set of SQL expressions. */
function bySessionKey<T>(
  build: (sessionExpression: string) => T,
): Record<SessionKey, T> {
  return Object.fromEntries(
    SESSION_KEYS.map((key) => [key, build(SESSION_EXPRESSIONS[key])]),
  ) as Record<SessionKey, T>;
}

/** Brings databases created before a column existed up to the current schema. */
function addMissingColumns(db: Database.Database) {
  const existing = new Set(
    db
      .prepare<[], { name: string }>(
        "SELECT name FROM pragma_table_info('events')",
      )
      .all()
      .map((column) => column.name),
  );
  for (const column of ADDED_COLUMNS) {
    if (!existing.has(column.name)) {
      db.exec(`ALTER TABLE events ADD COLUMN ${column.name} ${column.ddl}`);
    }
  }
}
