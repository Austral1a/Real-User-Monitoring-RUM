import {
  BREAKDOWN_COLUMNS,
  PAGEVIEW_COLUMNS,
  SESSION_KEYS,
  type BreakdownKey,
  type BreakdownRow,
  type ErrorRow,
  type EventFilter,
  type PageViewKey,
  type PageViewSample,
  type SessionKey,
  type Store,
  type TimingRow,
  type Totals,
} from "./store";

const HOUR = 60 * 60 * 1000;

export const RANGES = {
  "24h": { durationMs: 24 * HOUR, bucketMs: HOUR },
  "7d": { durationMs: 7 * 24 * HOUR, bucketMs: 6 * HOUR },
} as const;

export type RangeKey = keyof typeof RANGES;

export interface TimingSummary {
  pageLoad: number | null;
  ttfb: number | null;
  startRender: number | null;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
}

export interface Percentiles {
  p50: TimingSummary;
  p75: TimingSummary;
  p95: TimingSummary;
}

export interface SeriesPoint extends TimingSummary {
  start: number;
  samples: number;
}

export interface PageViewRow {
  key: string;
  count: number;
  pageLoad: number | null;
}

export interface Overview {
  range: RangeKey;
  sessionKey: SessionKey;
  path: string | null;
  origin: string | null;
  lang: string | null;
  bot: boolean;
  from: number;
  to: number;
  totals: Totals;
  percentiles: Percentiles;
  series: SeriesPoint[];
  recentErrors: ErrorRow[];
  breakdowns: Record<BreakdownKey, BreakdownRow[]>;
  pageViews: Record<PageViewKey, PageViewRow[]>;
}

export function isRangeKey(value: unknown): value is RangeKey {
  return typeof value === "string" && Object.hasOwn(RANGES, value);
}

export function isSessionKey(value: unknown): value is SessionKey {
  return (
    typeof value === "string" &&
    (SESSION_KEYS as readonly string[]).includes(value)
  );
}

/** Nearest-rank percentile, `p` in (0, 1]. */
export function percentile(values: number[], p: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.max(1, Math.ceil(p * sorted.length));
  return sorted[rank - 1];
}

export function summarizeTimings(rows: TimingRow[], p = 0.5): TimingSummary {
  return {
    pageLoad: percentile(pick(rows, "pageLoad"), p),
    ttfb: percentile(pick(rows, "ttfb"), p),
    startRender: percentile(pick(rows, "startRender"), p),
    lcp: percentile(pick(rows, "lcp"), p),
    inp: percentile(pick(rows, "inp"), p),
    cls: percentile(pick(rows, "cls"), p),
  };
}

/** Groups timing events by a label, ranked by view count, with a median page load. */
export function rankPageViews(
  samples: PageViewSample[],
  limit = 10,
): PageViewRow[] {
  const groups = new Map<string, { count: number; loads: number[] }>();
  for (const sample of samples) {
    const group = groups.get(sample.key) ?? { count: 0, loads: [] };
    group.count += 1;
    if (sample.pageLoad !== null) group.loads.push(sample.pageLoad);
    groups.set(sample.key, group);
  }

  return [...groups]
    .map(([key, { count, loads }]) => ({
      key,
      count,
      pageLoad: percentile(loads, 0.5),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/** Groups timings into fixed buckets covering [from, to); empty buckets stay in the series as nulls. */
export function timingSeries(
  rows: TimingRow[],
  from: number,
  to: number,
  bucketMs: number,
): SeriesPoint[] {
  const firstBucket = Math.floor(from / bucketMs) * bucketMs;
  const buckets = new Map<number, TimingRow[]>();
  for (let start = firstBucket; start < to; start += bucketMs) {
    buckets.set(start, []);
  }

  for (const row of rows) {
    const start = Math.floor(row.receivedAt / bucketMs) * bucketMs;
    buckets.get(start)?.push(row);
  }

  return [...buckets].map(([start, bucketRows]) => ({
    start,
    samples: bucketRows.length,
    ...summarizeTimings(bucketRows, 0.75),
  }));
}

export function buildOverview(
  store: Store,
  range: RangeKey,
  sessionKey: SessionKey,
  now: number,
  filter: EventFilter = {},
): Overview {
  const { durationMs, bucketMs } = RANGES[range];
  const to = now;
  const from = to - durationMs;
  const timings = store.timings(from, to, filter);

  const breakdowns = Object.fromEntries(
    (Object.keys(BREAKDOWN_COLUMNS) as BreakdownKey[]).map((key) => [
      key,
      store.breakdown(key, from, to, sessionKey, filter),
    ]),
  ) as Record<BreakdownKey, BreakdownRow[]>;

  return {
    range,
    sessionKey,
    path: filter.path ?? null,
    origin: filter.origin ?? null,
    lang: filter.lang ?? null,
    bot: filter.bot === true,
    from,
    to,
    totals: store.totals(from, to, sessionKey, filter),
    percentiles: {
      p50: summarizeTimings(timings, 0.5),
      p75: summarizeTimings(timings, 0.75),
      p95: summarizeTimings(timings, 0.95),
    },
    series: timingSeries(timings, from, to, bucketMs),
    recentErrors: store.recentErrors(from, to, 50, filter),
    breakdowns,
    pageViews: Object.fromEntries(
      (Object.keys(PAGEVIEW_COLUMNS) as PageViewKey[]).map((key) => [
        key,
        rankPageViews(store.pageViews(key, from, to, filter)),
      ]),
    ) as Record<PageViewKey, PageViewRow[]>,
  };
}

function pick(rows: TimingRow[], field: keyof TimingSummary): number[] {
  const values: number[] = [];
  for (const row of rows) {
    const value = row[field];
    if (value !== null) values.push(value);
  }
  return values;
}
