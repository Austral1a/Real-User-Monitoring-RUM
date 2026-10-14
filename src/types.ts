export const EVENT_TYPES = [
  "timing",
  "js_error",
  "network_error",
  "crash",
  "custom",
] as const;
export const ERROR_TYPES = ["js_error", "network_error", "crash"] as const;
export const DEVICES = ["mobile", "tablet", "desktop"] as const;
export const OPERATING_SYSTEMS = [
  "Windows",
  "macOS",
  "iOS",
  "Android",
  "Linux",
  "ChromeOS",
  "Other",
] as const;
export const CONNECTIONS = ["slow-2g", "2g", "3g", "4g", "unknown"] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type ErrorType = (typeof ERROR_TYPES)[number];
export type Device = (typeof DEVICES)[number];
export type OperatingSystem = (typeof OPERATING_SYSTEMS)[number];
export type Connection = (typeof CONNECTIONS)[number];

export interface RumEvent {
  type: EventType;
  sessionId: string;
  path: string;
  /** Browser language preference (`navigator.language`), not the URL. */
  lang: string | null;
  /** Page language from `<html lang>`, not the URL. */
  locale: string | null;
  /** Deploy id from the snippet `data-release` or `?v=`. */
  release: string | null;
  device: Device;
  os: OperatingSystem;
  connection: Connection;
  pageLoad: number | null;
  /** Optional duration for `custom` events; not a page load. */
  duration?: number | null;
  ttfb: number | null;
  startRender: number | null;
  lcp: number | null;
  inp: number | null;
  /** Cumulative layout shift in thousandths (0.12 → 120). */
  cls: number | null;
  message: string | null;
  /** Error location (`file:line:col`) or, for network errors, the request host and path. */
  source: string | null;
  status: number | null;
  method: string | null;
  /** True after a client-side route change; omitted or false on a full load. */
  spa?: boolean;
}

export interface StoredEvent extends RumEvent {
  receivedAt: number;
  country: string | null;
  /** Page origin from the allowlisted `Origin` header; not taken from the body. */
  origin: string | null;
  /** Salted hash of the client IP; the IP itself is never stored. */
  ipHash: string | null;
  /** Salted hash of the User-Agent header. */
  uaHash: string | null;
  /** Browser family parsed from the User-Agent. The raw UA is not stored. */
  browser: string;
  /** True when the User-Agent looks like a crawler or `navigator.webdriver` was set. */
  bot: boolean;
}
