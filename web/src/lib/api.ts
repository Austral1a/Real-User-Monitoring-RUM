import type { Overview, RangeKey, SessionKey } from "$lib/types";

export async function fetchOverview(
  range: RangeKey,
  sessionKey: SessionKey,
  filter: { path?: string; origin?: string; lang?: string } = {},
): Promise<Overview> {
  const query = new URLSearchParams({ range, by: sessionKey });
  if (filter.path) query.set("path", filter.path);
  if (filter.origin) query.set("origin", filter.origin);
  if (filter.lang) query.set("lang", filter.lang);
  const response = await fetch(`/api/overview?${query}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }
  return (await response.json()) as Overview;
}
