import type { BotKey, RangeKey, SessionKey } from "$lib/types";

export const REFRESH_MS = 60_000;

export const SESSION_KEYS: SessionKey[] = ["session", "ua", "ip", "ua-ip"];

export const SESSION_TITLES: Record<SessionKey, string> = {
  session: "Sessions",
  ua: "Sessions by user-agent",
  ip: "Sessions by IP",
  "ua-ip": "Sessions by user-agent + IP",
};

export const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export const BY_OPTIONS: { value: SessionKey; label: string }[] = [
  { value: "session", label: "Session" },
  { value: "ua", label: "User-agent" },
  { value: "ip", label: "IP" },
  { value: "ua-ip", label: "User-agent + IP" },
];

export const BOT_OPTIONS: { value: BotKey; label: string }[] = [
  { value: "no", label: "No" },
  { value: "yes", label: "Yes" },
];

export const COLORS = [
  "#2563eb",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
];
