import type { IngestStats } from "./ingest";
import {
  BREAKDOWN_COLUMNS,
  PAGEVIEW_COLUMNS,
  SESSION_KEYS,
  type BreakdownKey,
  type BreakdownRow,
  type CustomEventRow,
  type ErrorGroup,
  type ErrorRow,
  type EventFilter,
  type PageViewKey,
  type PageViewSample,
  type SessionKey,
  type SiteLcpSample,
  type SiteStats,
  type Store,
  type TimingRow,
  type Totals,
} from "./store";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const RANGES = {
  "24h": { durationMs: 24 * HOUR, bucketMs: HOUR },
  "7d": { durationMs: 7 * DAY, bucketMs: 6 * HOUR },
  "30d": { durationMs: 30 * DAY, bucketMs: DAY },
} as const;

export type RangeKey = keyof typeof RANGES;

export const VITAL_THRESHOLDS = {
  lcp: { good: 2500, ni: 4000 },
  inp: { good: 200, ni: 500 },
  cls: { good: 100, ni: 250 },
} as const;

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

export interface VitalScore {
  good: number;
  ni: number;
  poor: number;
  n: number;
}

export interface SiteRow {
  origin: string;
  sessions: number;
  pageLoads: number;
  jsErrors: number;
  lcp: number | null;
}

export interface PreviousPeriod {
  totals: Totals;
  percentiles: Percentiles;
}

export interface Overview {
  range: RangeKey;
  sessionKey: SessionKey;
  path: string | null;
  origin: string | null;
  lang: string | null;
  locale: string | null;
  release: string | null;
  bot: boolean;
  from: number;
  to: number;
  totals: Totals;
  percentiles: Percentiles;
  previous: PreviousPeriod;
  vitals: {
    lcp: VitalScore;
    inp: VitalScore;
    cls: VitalScore;
  };
  series: SeriesPoint[];
  recentErrors: ErrorRow[];
  errorGroups: ErrorGroup[];
  sites: SiteRow[];
  customEvents: CustomEventRow[];
  breakdowns: Record<BreakdownKey, BreakdownRow[]>;
  pageViews: Record<PageViewKey, PageViewRow[]>;
  ingest: IngestStats;
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

export function vitalScore(
  values: number[],
  goodMax: number,
  niMax: number,
): VitalScore {
  let good = 0;
  let ni = 0;
  let poor = 0;
  for (const value of values) {
    if (value <= goodMax) good += 1;
    else if (value <= niMax) ni += 1;
    else poor += 1;
  }
  return { good, ni, poor, n: values.length };
}

export function rankSites(
  stats: SiteStats[],
  lcps: SiteLcpSample[],
): SiteRow[] {
  const byOrigin = new Map<string, number[]>();
  for (const sample of lcps) {
    const values = byOrigin.get(sample.origin) ?? [];
    values.push(sample.lcp);
    byOrigin.set(sample.origin, values);
  }
  return stats.map((row) => ({
    ...row,
    lcp: percentile(byOrigin.get(row.origin) ?? [], 0.75),
  }));
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

const EMPTY_INGEST: IngestStats = {
  stored: 0,
  originRejected: 0,
  rateLimited: 0,
  invalid: 0,
  lastBeaconAt: null,
};

export function buildOverview(
  store: Store,
  range: RangeKey,
  sessionKey: SessionKey,
  now: number,
  filter: EventFilter = {},
  ingest: IngestStats = EMPTY_INGEST,
): Overview {
  const { durationMs, bucketMs } = RANGES[range];
  const to = now;
  const from = to - durationMs;
  const prevFrom = from - durationMs;
  const timings = store.timings(from, to, filter);
  const previousTimings = store.timings(prevFrom, from, filter);

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
    locale: filter.locale ?? null,
    release: filter.release ?? null,
    bot: filter.bot === true,
    from,
    to,
    totals: store.totals(from, to, sessionKey, filter),
    percentiles: {
      p50: summarizeTimings(timings, 0.5),
      p75: summarizeTimings(timings, 0.75),
      p95: summarizeTimings(timings, 0.95),
    },
    previous: {
      totals: store.totals(prevFrom, from, sessionKey, filter),
      percentiles: {
        p50: summarizeTimings(previousTimings, 0.5),
        p75: summarizeTimings(previousTimings, 0.75),
        p95: summarizeTimings(previousTimings, 0.95),
      },
    },
    vitals: {
      lcp: vitalScore(
        pick(timings, "lcp"),
        VITAL_THRESHOLDS.lcp.good,
        VITAL_THRESHOLDS.lcp.ni,
      ),
      inp: vitalScore(
        pick(timings, "inp"),
        VITAL_THRESHOLDS.inp.good,
        VITAL_THRESHOLDS.inp.ni,
      ),
      cls: vitalScore(
        pick(timings, "cls"),
        VITAL_THRESHOLDS.cls.good,
        VITAL_THRESHOLDS.cls.ni,
      ),
    },
    series: timingSeries(timings, from, to, bucketMs),
    recentErrors: store.recentErrors(from, to, 20, filter),
    errorGroups: store.groupedErrors(from, to, 20, filter),
    sites: rankSites(
      store.siteStats(from, to, sessionKey, filter),
      store.siteLcps(from, to, filter),
    ),
    customEvents: store.customEvents(from, to, 20, filter),
    breakdowns,
    pageViews: Object.fromEntries(
      (Object.keys(PAGEVIEW_COLUMNS) as PageViewKey[]).map((key) => [
        key,
        rankPageViews(store.pageViews(key, from, to, filter)),
      ]),
    ) as Record<PageViewKey, PageViewRow[]>,
    ingest,
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
