export type RangeKey = "24h" | "7d";
export type SessionKey = "session" | "ua" | "ip" | "ua-ip";
export type BotKey = "yes" | "no";

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
}

export interface ErrorRow {
  receivedAt: number;
  type: "js_error" | "network_error" | "crash";
  path: string;
  message: string | null;
  source: string | null;
  status: number | null;
  method: string | null;
  device: string;
  os: string;
  country: string | null;
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
  };
}
