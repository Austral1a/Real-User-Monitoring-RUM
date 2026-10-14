import { percentile, RANGES } from "./overview";
import type { Store, TimingRow } from "./store";

export const ALERT_INTERVAL_MS = 5 * 60 * 1000;
export const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
export const ALERT_LCP_MS = 4000;
export const ALERT_ERROR_RATE = 0.1;
export const ALERT_MIN_SAMPLES = 10;

export function alertReasons(
  pageLoads: number,
  jsErrors: number,
  p75Lcp: number | null,
  lcpSamples = pageLoads,
): string[] {
  const reasons: string[] = [];
  if (
    p75Lcp !== null &&
    p75Lcp > ALERT_LCP_MS &&
    lcpSamples >= ALERT_MIN_SAMPLES
  ) {
    reasons.push("lcp");
  }
  if (
    pageLoads >= ALERT_MIN_SAMPLES &&
    jsErrors / pageLoads > ALERT_ERROR_RATE
  ) {
    reasons.push("js_errors");
  }
  return reasons;
}

export interface AlertSite {
  origin: string;
  p75Lcp: number | null;
  pageLoads: number;
  jsErrors: number;
  reasons: string[];
}

export function startAlerts(options: {
  store: Store;
  webhook: string;
  now?: () => number;
  fetch?: typeof fetch;
  intervalMs?: number;
}): () => void {
  const now = options.now ?? Date.now;
  const post = options.fetch ?? fetch;
  const intervalMs = options.intervalMs ?? ALERT_INTERVAL_MS;
  const lastSent = new Map<string, number>();
  let inflight = false;

  async function tick() {
    if (inflight) return;
    inflight = true;
    try {
      const at = now();
      const from = at - RANGES["24h"].durationMs;
      const humans = { bot: false as const };
      const sites: AlertSite[] = [];
      let pageLoads = 0;
      let jsErrors = 0;
      const allLcps: number[] = [];

      for (const { origin } of options.store.origins(from, at, humans)) {
        if (origin === "unknown") continue;
        const filter = { ...humans, origin };
        const totals = options.store.totals(from, at, "session", filter);
        const timings = options.store.timings(from, at, filter);
        const lcps = pickLcp(timings);
        pageLoads += totals.pageLoads;
        jsErrors += totals.jsErrors;
        allLcps.push(...lcps);
        if (at - (lastSent.get(origin) ?? 0) < ALERT_COOLDOWN_MS) continue;
        const p75Lcp = percentile(lcps, 0.75);
        const reasons = alertReasons(
          totals.pageLoads,
          totals.jsErrors,
          p75Lcp,
          lcps.length,
        );
        if (reasons.length === 0) continue;
        sites.push({
          origin,
          p75Lcp,
          pageLoads: totals.pageLoads,
          jsErrors: totals.jsErrors,
          reasons,
        });
      }
      if (sites.length === 0) return;
      const response = await post(options.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          at,
          range: "24h",
          p75Lcp: percentile(allLcps, 0.75),
          pageLoads,
          jsErrors,
          reasons: [...new Set(sites.flatMap((site) => site.reasons))],
          sites,
        }),
      });
      if (!response.ok) {
        console.error(`[monitor] Alert webhook returned ${response.status}`);
        return;
      }
      for (const site of sites) lastSent.set(site.origin, at);
    } catch (error) {
      console.error(
        "[monitor] Alert webhook failed",
        error instanceof Error ? error.message : error,
      );
    } finally {
      inflight = false;
    }
  }

  void tick();
  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}

function pickLcp(rows: TimingRow[]): number[] {
  const values: number[] = [];
  for (const row of rows) {
    if (row.lcp !== null) values.push(row.lcp);
  }
  return values;
}
