import { buildOverview } from "./overview";
import type { Store } from "./store";

export const ALERT_INTERVAL_MS = 5 * 60 * 1000;
export const ALERT_COOLDOWN_MS = 60 * 60 * 1000;
export const ALERT_LCP_MS = 4000;
export const ALERT_ERROR_RATE = 0.1;

export function alertReasons(
  pageLoads: number,
  jsErrors: number,
  p75Lcp: number | null,
): string[] {
  const reasons: string[] = [];
  if (p75Lcp !== null && p75Lcp > ALERT_LCP_MS) reasons.push("lcp");
  if (pageLoads > 0 && jsErrors / pageLoads > ALERT_ERROR_RATE) {
    reasons.push("js_errors");
  }
  return reasons;
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
  let lastSent = 0;
  let inflight = false;

  async function tick() {
    if (inflight) return;
    inflight = true;
    try {
      const at = now();
      if (at - lastSent < ALERT_COOLDOWN_MS) return;
      const overview = buildOverview(options.store, "24h", "session", at, {
        bot: false,
      });
      const reasons = alertReasons(
        overview.totals.pageLoads,
        overview.totals.jsErrors,
        overview.percentiles.p75.lcp,
      );
      if (reasons.length === 0) return;
      const response = await post(options.webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          at,
          range: "24h",
          p75Lcp: overview.percentiles.p75.lcp,
          pageLoads: overview.totals.pageLoads,
          jsErrors: overview.totals.jsErrors,
          reasons,
        }),
      });
      if (!response.ok) {
        console.error(`[monitor] Alert webhook returned ${response.status}`);
        return;
      }
      lastSent = at;
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
