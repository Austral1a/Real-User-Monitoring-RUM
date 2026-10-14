export type RangeKey = "24h" | "7d" | "30d";
export type SessionKey = "session" | "ua" | "ip" | "ua-ip";
export type BotKey = "yes" | "no";
export type NavKey = "all" | "full" | "spa";
export type ErrorType = "js_error" | "network_error" | "crash";

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

export interface Totals {
  sessions: number;
  pageLoads: number;
  jsErrors: number;
  networkErrors: number;
  crashedSessions: number;
}

export interface BreakdownRow {
  key: string;
  sessions: number;
}

export interface PageViewRow {
  key: string;
  count: number;
  pageLoad: number | null;
  lcp: number | null;
}

export interface ErrorRow {
  receivedAt: number;
  type: ErrorType;
  path: string;
  message: string | null;
  source: string | null;
  status: number | null;
  method: string | null;
  device: string;
  os: string;
  country: string | null;
}

export interface ErrorGroup {
  type: ErrorRow["type"];
  message: string | null;
  source: string | null;
  count: number;
  lastSeen: number;
}

export interface NetworkGroup {
  host: string;
  status: number;
  count: number;
  lastSeen: number;
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

export interface CustomEventRow {
  key: string;
  count: number;
  duration: number | null;
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

export interface IngestStats {
  stored: number;
  originRejected: number;
  rateLimited: number;
  invalid: number;
  lastBeaconAt: number | null;
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
  previous: {
    totals: Totals;
    percentiles: Percentiles;
  };
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
  breakdowns: {
    device: BreakdownRow[];
    os: BreakdownRow[];
    connection: BreakdownRow[];
    country: BreakdownRow[];
  };
  pageViews: {
    path: PageViewRow[];
    country: PageViewRow[];
    browser: PageViewRow[];
    device: PageViewRow[];
    origin: PageViewRow[];
    lang: PageViewRow[];
    locale: PageViewRow[];
    release: PageViewRow[];
  };
  ingest: IngestStats;
}
