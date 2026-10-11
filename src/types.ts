export const EVENT_TYPES = [
  "timing",
  "js_error",
  "network_error",
  "crash",
] as const;
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
export type Device = (typeof DEVICES)[number];
export type OperatingSystem = (typeof OPERATING_SYSTEMS)[number];
export type Connection = (typeof CONNECTIONS)[number];

export interface RumEvent {
  type: EventType;
  sessionId: string;
  path: string;
  lang: string | null;
  device: Device;
  os: OperatingSystem;
  connection: Connection;
  pageLoad: number | null;
  ttfb: number | null;
  startRender: number | null;
  message: string | null;
  /** Error location (`file:line:col`) or, for network errors, the request host and path. */
  source: string | null;
  status: number | null;
  method: string | null;
}

export interface StoredEvent extends RumEvent {
  receivedAt: number;
  country: string | null;
  /** Salted hash of the client IP; the IP itself is never stored. */
  ipHash: string | null;
  /** Salted hash of the User-Agent header. */
  uaHash: string | null;
  /** Browser family parsed from the User-Agent. The raw UA is not stored. */
  browser: string;
}
