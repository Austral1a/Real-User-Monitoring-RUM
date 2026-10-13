import type { BotKey, Overview, RangeKey, SessionKey } from "$lib/types";

export async function fetchOverview(
  range: RangeKey,
  sessionKey: SessionKey,
  filter: {
    path?: string;
    origin?: string;
    lang?: string;
    locale?: string;
    release?: string;
    bot?: BotKey;
  } = {},
  signal?: AbortSignal,
): Promise<Overview> {
  const query = new URLSearchParams({
    range,
    by: sessionKey,
    bot: filter.bot ?? "no",
  });
  if (filter.path) query.set("path", filter.path);
  if (filter.origin) query.set("origin", filter.origin);
  if (filter.lang) query.set("lang", filter.lang);
  if (filter.locale) query.set("locale", filter.locale);
  if (filter.release) query.set("release", filter.release);
  const response = await fetch(`/api/overview?${query}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }
  return (await response.json()) as Overview;
}
