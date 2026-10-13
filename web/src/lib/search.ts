import { SESSION_KEYS } from "$lib/constants";
import type { BotKey, RangeKey, SessionKey } from "$lib/types";

export interface SearchState {
  range: RangeKey;
  sessionKey: SessionKey;
  bot: BotKey;
  path?: string;
  origin?: string;
  lang?: string;
}

export function readSearch(): SearchState {
  const params = new URLSearchParams(location.search);
  const by = params.get("by") as SessionKey | null;
  return {
    range: params.get("range") === "7d" ? "7d" : "24h",
    sessionKey: by && SESSION_KEYS.includes(by) ? by : "session",
    bot: params.get("bot") === "yes" ? "yes" : "no",
    path: readPath(params.get("path")),
    origin: readOrigin(params.get("origin")),
    lang: readLang(params.get("lang")),
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
  return value && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/.test(value)
    ? value
    : undefined;
}
