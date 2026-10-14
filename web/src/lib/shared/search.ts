import { SESSION_KEYS } from "./Constants";
import type {
  BotKey,
  ErrorType,
  NavKey,
  RangeKey,
  SessionKey,
} from "./Types";

export interface SearchState {
  range: RangeKey;
  sessionKey: SessionKey;
  bot: BotKey;
  nav: NavKey;
  path?: string;
  origin?: string;
  lang?: string;
  locale?: string;
  release?: string;
  errorType?: ErrorType;
  errorMessage?: string;
  errorSource?: string;
  host?: string;
  status?: number;
}

const RANGES: RangeKey[] = ["24h", "7d", "30d"];
const NAVS: NavKey[] = ["all", "full", "spa"];
const ERROR_TYPES: ErrorType[] = ["js_error", "network_error", "crash"];

export function readSearch(): SearchState {
  const params = new URLSearchParams(location.search);
  const by = params.get("by") as SessionKey | null;
  const range = params.get("range") as RangeKey | null;
  const nav = params.get("nav") as NavKey | null;
  const errorType = params.get("errorType") as ErrorType | null;
  return {
    range: range && RANGES.includes(range) ? range : "24h",
    sessionKey: by && SESSION_KEYS.includes(by) ? by : "session",
    bot: params.get("bot") === "yes" ? "yes" : "no",
    nav: nav && NAVS.includes(nav) ? nav : "all",
    path: readPath(params.get("path")),
    origin: readOrigin(params.get("origin")),
    lang: readLang(params.get("lang")),
    locale: readLang(params.get("locale")),
    release: readRelease(params.get("release")),
    errorType:
      errorType && ERROR_TYPES.includes(errorType) ? errorType : undefined,
    errorMessage: params.has("errorMessage")
      ? (params.get("errorMessage") ?? "")
      : undefined,
    errorSource: params.has("errorSource")
      ? (params.get("errorSource") ?? "")
      : undefined,
    host: readHost(params.get("host")),
    status: readStatus(params.get("status")),
  };
}

export function writeSearch(state: SearchState): void {
  const url = new URL(location.href);
  url.searchParams.set("range", state.range);
  url.searchParams.set("by", state.sessionKey);
  url.searchParams.set("bot", state.bot);
  url.searchParams.set("nav", state.nav);
  setOrDelete(url.searchParams, "path", state.path);
  setOrDelete(url.searchParams, "origin", state.origin);
  setOrDelete(url.searchParams, "lang", state.lang);
  setOrDelete(url.searchParams, "locale", state.locale);
  setOrDelete(url.searchParams, "release", state.release);
  setOrDelete(url.searchParams, "errorType", state.errorType);
  setOptional(url.searchParams, "errorMessage", state.errorMessage);
  setOptional(url.searchParams, "errorSource", state.errorSource);
  setOrDelete(url.searchParams, "host", state.host);
  setOrDelete(
    url.searchParams,
    "status",
    state.status === undefined ? undefined : String(state.status),
  );
  try {
    history.replaceState(null, "", url);
  } catch {
    // Ignore: credentialed URLs and some sandboxes reject replaceState.
  }
}

function setOrDelete(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value) params.set(key, value);
  else params.delete(key);
}

function setOptional(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value === undefined) params.delete(key);
  else params.set(key, value);
}

function readPath(value: string | null): string | undefined {
  return value && value.startsWith("/") ? value : undefined;
}

function readOrigin(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.origin === value ? url.origin : undefined;
  } catch {
    return undefined;
  }
}

function readLang(value: string | null): string | undefined {
  return value && /^[a-z]{2,3}(-[a-z0-9]{2,8})?$/.test(value)
    ? value
    : undefined;
}

function readRelease(value: string | null): string | undefined {
  return value && /^[A-Za-z0-9._-]{1,64}$/.test(value) ? value : undefined;
}

function readHost(value: string | null): string | undefined {
  return value && /^[A-Za-z0-9._:[\]-]{1,253}$/.test(value) ? value : undefined;
}

function readStatus(value: string | null): number | undefined {
  if (value === null || value === "") return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || !(n === 0 || (n >= 400 && n <= 599))) {
    return undefined;
  }
  return n;
}
