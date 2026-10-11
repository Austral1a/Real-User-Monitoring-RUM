import { SESSION_KEYS } from "$lib/constants";
import type { RangeKey, SessionKey } from "$lib/types";

export function readSearch(): { range: RangeKey; sessionKey: SessionKey } {
  const params = new URLSearchParams(location.search);
  const by = params.get("by") as SessionKey | null;
  return {
    range: params.get("range") === "7d" ? "7d" : "24h",
    sessionKey: by && SESSION_KEYS.includes(by) ? by : "session",
  };
}

export function writeSearch(range: RangeKey, sessionKey: SessionKey): void {
  const url = new URL(location.href);
  url.searchParams.set("range", range);
  url.searchParams.set("by", sessionKey);
  history.replaceState(null, "", url);
}
