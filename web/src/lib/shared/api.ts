import type {
  BotKey,
  ErrorType,
  NavKey,
  Overview,
  RangeKey,
  SessionKey,
} from "./Types";

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
    nav?: NavKey;
    errorType?: ErrorType;
    errorMessage?: string;
    errorSource?: string;
    host?: string;
    status?: number;
  } = {},
  signal?: AbortSignal,
): Promise<Overview> {
  const query = new URLSearchParams({
    range,
    by: sessionKey,
    bot: filter.bot ?? "no",
    nav: filter.nav ?? "all",
  });
  if (filter.path) query.set("path", filter.path);
  if (filter.origin) query.set("origin", filter.origin);
  if (filter.lang) query.set("lang", filter.lang);
  if (filter.locale) query.set("locale", filter.locale);
  if (filter.release) query.set("release", filter.release);
  if (filter.errorType) query.set("errorType", filter.errorType);
  if (filter.errorMessage !== undefined) {
    query.set("errorMessage", filter.errorMessage);
  }
  if (filter.errorSource !== undefined) {
    query.set("errorSource", filter.errorSource);
  }
  if (filter.host) query.set("host", filter.host);
  if (filter.status !== undefined) query.set("status", String(filter.status));
  const response = await fetch(`/api/overview?${query}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }
  return (await response.json()) as Overview;
}
