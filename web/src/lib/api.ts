import type { Overview, RangeKey, SessionKey } from "$lib/types";

export async function fetchOverview(
  range: RangeKey,
  sessionKey: SessionKey,
): Promise<Overview> {
  const query = new URLSearchParams({ range, by: sessionKey });
  const response = await fetch(`/api/overview?${query}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`request failed with status ${response.status}`);
  }
  return (await response.json()) as Overview;
}
