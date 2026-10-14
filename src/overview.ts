import type { IngestStats } from "./ingest";
import {
  BREAKDOWN_COLUMNS,
  PAGEVIEW_COLUMNS,
  SESSION_KEYS,
  type BreakdownKey,
  type BreakdownRow,
  type CountEventRow,
  type CustomEventSample,
  type ErrorGroup,
  type ErrorRow,
  type EventFilter,
  type NetworkGroup,
  type PageViewKey,
  type PageViewSample,
  type SessionKey,
  type SiteBeacon,
  type SiteLcpSample,
  type SiteStats,
  type Store,
  type TimingRow,
  type Totals,
} from "./store";
import type { ErrorType } from "./types";

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

export interface CountPoint {
  start: number;
  jsErrors: number;
  networkErrors: number;
  crashes: number;
  custom: number;
}

export interface PageViewRow {
  key: string;
  count: number;
  pageLoad: number | null;
  lcp: number | null;
}

export interface CustomEventRow {
  key: string;
  count: number;
  duration: number | null;
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
  lastBeaconAt: number | null;
}

export interface ReleaseSlice {
  release: string;
  totals: Totals;
  p75: TimingSummary;
  lcp: VitalScore;
}

export interface ReleaseCompare {
  current: ReleaseSlice | null;
  previous: ReleaseSlice | null;
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
  spa: boolean | null;
  errorType: ErrorType | null;
  errorMessage: string | null;
  errorSource: string | null;
  host: string | null;
  status: number | null;
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
  errorSeries: CountPoint[];
  recentErrors: ErrorRow[];
  errorGroups: ErrorGroup[];
  networkGroups: NetworkGroup[];
  sites: SiteRow[];
  customEvents: CustomEventRow[];
  releases: ReleaseCompare;
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
  beacons: SiteBeacon[] = [],
): SiteRow[] {
  const byOrigin = new Map<string, number[]>();
  for (const sample of lcps) {
    const values = byOrigin.get(sample.origin) ?? [];
    values.push(sample.lcp);
    byOrigin.set(sample.origin, values);
  }
  const lastBeacon = new Map(
    beacons.map((row) => [row.origin, row.lastBeaconAt]),
  );
  return stats.map((row) => ({
    ...row,
    lcp: percentile(byOrigin.get(row.origin) ?? [], 0.75),
    lastBeaconAt: lastBeacon.get(row.origin) ?? null,
  }));
}

/** Groups timing events by a label, ranked by view count, with a median page load and p75 LCP. */
export function rankPageViews(
  samples: PageViewSample[],
  limit = 10,
): PageViewRow[] {
  const groups = new Map<
    string,
    { count: number; loads: number[]; lcps: number[] }
  >();
  for (const sample of samples) {
    const group = groups.get(sample.key) ?? { count: 0, loads: [], lcps: [] };
    group.count += 1;
    if (sample.pageLoad !== null) group.loads.push(sample.pageLoad);
    if (sample.lcp !== null) group.lcps.push(sample.lcp);
    groups.set(sample.key, group);
  }

  return [...groups]
    .map(([key, { count, loads, lcps }]) => ({
      key,
      count,
      pageLoad: percentile(loads, 0.5),
      lcp: percentile(lcps, 0.75),
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export function rankCustomEvents(
  samples: CustomEventSample[],
  limit = 20,
): CustomEventRow[] {
  const groups = new Map<string, { count: number; durations: number[] }>();
  for (const sample of samples) {
    const group = groups.get(sample.key) ?? { count: 0, durations: [] };
    group.count += 1;
    if (sample.duration !== null) group.durations.push(sample.duration);
    groups.set(sample.key, group);
  }

  return [...groups]
    .map(([key, { count, durations }]) => ({
      key,
      count,
      duration: percentile(durations, 0.75),
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

export function countSeries(
  rows: CountEventRow[],
  from: number,
  to: number,
  bucketMs: number,
): CountPoint[] {
  const firstBucket = Math.floor(from / bucketMs) * bucketMs;
  const buckets = new Map<number, CountPoint>();
  for (let start = firstBucket; start < to; start += bucketMs) {
    buckets.set(start, {
      start,
      jsErrors: 0,
      networkErrors: 0,
      crashes: 0,
      custom: 0,
    });
  }

  for (const row of rows) {
    const start = Math.floor(row.receivedAt / bucketMs) * bucketMs;
    const bucket = buckets.get(start);
    if (!bucket) continue;
    if (row.type === "js_error") bucket.jsErrors += 1;
    else if (row.type === "network_error") bucket.networkErrors += 1;
    else if (row.type === "crash") bucket.crashes += 1;
    else if (row.type === "custom") bucket.custom += 1;
  }

  return [...buckets.values()];
}

export function compareReleases(
  store: Store,
  from: number,
  to: number,
  sessionKey: SessionKey,
  filter: EventFilter,
): ReleaseCompare {
  const { release: selected, ...rest } = filter;
  const names = store
    .recentReleases(from, to, 8, rest)
    .map((row) => row.key);
  const currentName = selected ?? names[0] ?? null;
  if (!currentName) return { current: null, previous: null };
  const previousName = names.find((name) => name !== currentName) ?? null;
  return {
    current: releaseSlice(store, from, to, sessionKey, rest, currentName),
    previous: previousName
      ? releaseSlice(store, from, to, sessionKey, rest, previousName)
      : null,
  };
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
  const scope = withoutErrorScope(filter);

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
    spa: filter.spa ?? null,
    errorType: filter.errorType ?? null,
    errorMessage: filter.errorMessage ?? null,
    errorSource: filter.errorSource ?? null,
    host: filter.host ?? null,
    status: filter.status ?? null,
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
    errorSeries: countSeries(
      store.countEvents(from, to, filter),
      from,
      to,
      bucketMs,
    ),
    recentErrors: store.recentErrors(from, to, 20, filter),
    errorGroups: store.groupedErrors(from, to, 20, filter),
    networkGroups: store.networkGroups(from, to, 20, scope),
    sites: rankSites(
      store.siteStats(from, to, sessionKey, filter),
      store.siteLcps(from, to, filter),
      store.siteBeacons(),
    ),
    customEvents: rankCustomEvents(store.customEvents(from, to, filter)),
    releases: compareReleases(store, from, to, sessionKey, filter),
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

function releaseSlice(
  store: Store,
  from: number,
  to: number,
  sessionKey: SessionKey,
  filter: EventFilter,
  release: string,
): ReleaseSlice {
  const scoped = { ...filter, release };
  const timings = store.timings(from, to, scoped);
  return {
    release,
    totals: store.totals(from, to, sessionKey, scoped),
    p75: summarizeTimings(timings, 0.75),
    lcp: vitalScore(
      pick(timings, "lcp"),
      VITAL_THRESHOLDS.lcp.good,
      VITAL_THRESHOLDS.lcp.ni,
    ),
  };
}

function withoutErrorScope(filter: EventFilter): EventFilter {
  const {
    errorType: _errorType,
    errorMessage: _errorMessage,
    errorSource: _errorSource,
    host: _host,
    status: _status,
    ...rest
  } = filter;
  return rest;
}

function pick(rows: TimingRow[], field: keyof TimingSummary): number[] {
  const values: number[] = [];
  for (const row of rows) {
    const value = row[field];
    if (value !== null) values.push(value);
  }
  return values;
}
