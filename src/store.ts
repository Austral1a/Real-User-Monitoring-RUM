import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

import type { EventType, StoredEvent } from "./types";

export interface TimingRow {
  receivedAt: number;
  pageLoad: number | null;
  ttfb: number | null;
  startRender: number | null;
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

export const PAGEVIEW_COLUMNS = {
  path: "path",
  country: "country",
  browser: "browser",
  device: "device",
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
  timings(from: number, to: number): TimingRow[];
  totals(from: number, to: number, sessionKey: SessionKey): Totals;
  recentErrors(from: number, to: number, limit: number): ErrorRow[];
  breakdown(
    key: BreakdownKey,
    from: number,
    to: number,
    sessionKey: SessionKey,
  ): BreakdownRow[];
  pageViews(key: PageViewKey, from: number, to: number): PageViewSample[];
  close(): void;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    received_at INTEGER NOT NULL,
    type TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    lang TEXT,
    device TEXT NOT NULL,
    os TEXT NOT NULL,
    connection TEXT NOT NULL,
    country TEXT,
    page_load INTEGER,
    ttfb INTEGER,
    start_render INTEGER,
    message TEXT,
    source TEXT,
    status INTEGER,
    method TEXT,
    ip_hash TEXT,
    ua_hash TEXT,
    browser TEXT NOT NULL DEFAULT 'Other'
  );
  CREATE INDEX IF NOT EXISTS events_received_at ON events (received_at);
`;

const ADDED_COLUMNS = ["ip_hash", "ua_hash", "browser"];

export function openStore(path: string): Store {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  addMissingColumns(db);

  const insertEvent = db.prepare(`
    INSERT INTO events (
      received_at, type, session_id, path, lang, device, os, connection, country,
      page_load, ttfb, start_render, message, source, status, method, ip_hash, ua_hash, browser
    ) VALUES (
      @receivedAt, @type, @sessionId, @path, @lang, @device, @os, @connection, @country,
      @pageLoad, @ttfb, @startRender, @message, @source, @status, @method, @ipHash, @uaHash, @browser
    )
  `);
  const insertMany = db.transaction((events: StoredEvent[]) => {
    for (const event of events) insertEvent.run(event);
  });

  const pruneEvents = db.prepare("DELETE FROM events WHERE received_at < ?");

  const selectTimings = db.prepare<[number, number], TimingRow>(`
    SELECT received_at AS receivedAt, page_load AS pageLoad, ttfb, start_render AS startRender
    FROM events
    WHERE type = 'timing' AND received_at >= ? AND received_at < ?
  `);

  const selectTotals = bySessionKey((session) =>
    db.prepare<[number, number], Totals>(`
      SELECT
        COUNT(DISTINCT ${session}) AS sessions,
        COALESCE(SUM(type = 'timing'), 0) AS pageLoads,
        COALESCE(SUM(type = 'js_error'), 0) AS jsErrors,
        COALESCE(SUM(type = 'network_error'), 0) AS networkErrors,
        COUNT(DISTINCT CASE WHEN type = 'crash' THEN ${session} END) AS crashedSessions
      FROM events
      WHERE received_at >= ? AND received_at < ?
    `),
  );

  const selectErrors = db.prepare<[number, number, number], ErrorRow>(`
    SELECT
      received_at AS receivedAt, type, path, message, source, status, method,
      device, os, country
    FROM events
    WHERE type != 'timing' AND received_at >= ? AND received_at < ?
    ORDER BY received_at DESC
    LIMIT ?
  `);

  const selectBreakdown = bySessionKey(
    (session) =>
      Object.fromEntries(
        Object.entries(BREAKDOWN_COLUMNS).map(([key, column]) => [
          key,
          db.prepare<[number, number], BreakdownRow>(`
            SELECT COALESCE(${column}, 'unknown') AS key, COUNT(DISTINCT ${session}) AS sessions
            FROM events
            WHERE received_at >= ? AND received_at < ?
            GROUP BY 1
            ORDER BY sessions DESC
            LIMIT 10
          `),
        ]),
      ) as Record<
        BreakdownKey,
        Database.Statement<[number, number], BreakdownRow>
      >,
  );

  const selectPageViews = Object.fromEntries(
    Object.entries(PAGEVIEW_COLUMNS).map(([key, column]) => [
      key,
      db.prepare<[number, number], PageViewSample>(`
        SELECT COALESCE(NULLIF(${column}, ''), '${key === "browser" ? "Other" : "unknown"}') AS key,
               page_load AS pageLoad
        FROM events
        WHERE type = 'timing' AND received_at >= ? AND received_at < ?
      `),
    ]),
  ) as Record<
    PageViewKey,
    Database.Statement<[number, number], PageViewSample>
  >;

  return {
    insert: (events) => insertMany(events),
    prune: (before) => pruneEvents.run(before).changes,
    timings: (from, to) => selectTimings.all(from, to),
    totals: (from, to, sessionKey) =>
      selectTotals[sessionKey].get(from, to) as Totals,
    recentErrors: (from, to, limit) => selectErrors.all(from, to, limit),
    breakdown: (key, from, to, sessionKey) =>
      selectBreakdown[sessionKey][key].all(from, to),
    pageViews: (key, from, to) => selectPageViews[key].all(from, to),
    close: () => db.close(),
  };
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
    if (!existing.has(column)) {
      const extra =
        column === "browser" ? " TEXT NOT NULL DEFAULT 'Other'" : " TEXT";
      db.exec(`ALTER TABLE events ADD COLUMN ${column}${extra}`);
    }
  }
}
