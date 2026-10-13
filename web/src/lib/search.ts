import { SESSION_KEYS } from "$lib/constants";
import type { BotKey, RangeKey, SessionKey } from "$lib/types";

export interface SearchState {
  range: RangeKey;
  sessionKey: SessionKey;
  bot: BotKey;
  path?: string;
  origin?: string;
  lang?: string;
  locale?: string;
  release?: string;
}

const RANGES: RangeKey[] = ["24h", "7d", "30d"];

export function readSearch(): SearchState {
  const params = new URLSearchParams(location.search);
  const by = params.get("by") as SessionKey | null;
  const range = params.get("range") as RangeKey | null;
  return {
    range: range && RANGES.includes(range) ? range : "24h",
    sessionKey: by && SESSION_KEYS.includes(by) ? by : "session",
    bot: params.get("bot") === "yes" ? "yes" : "no",
    path: readPath(params.get("path")),
    origin: readOrigin(params.get("origin")),
    lang: readLang(params.get("lang")),
    locale: readLang(params.get("locale")),
    release: readRelease(params.get("release")),
  };
}

export function writeSearch(state: SearchState): void {
  const url = new URL(location.href);
  url.searchParams.set("range", state.range);
  url.searchParams.set("by", state.sessionKey);
  url.searchParams.set("bot", state.bot);
  setOrDelete(url.searchParams, "path", state.path);
  setOrDelete(url.searchParams, "origin", state.origin);
  setOrDelete(url.searchParams, "lang", state.lang);
  setOrDelete(url.searchParams, "locale", state.locale);
  setOrDelete(url.searchParams, "release", state.release);
  history.replaceState(null, "", url);
}

function setOrDelete(
  params: URLSearchParams,
  key: string,
  value: string | undefined,
): void {
  if (value) params.set(key, value);
  else params.delete(key);
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
