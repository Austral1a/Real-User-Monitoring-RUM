export const COLLECT_RATE_MAX = 60;
export const COLLECT_RATE_WINDOW_MS = 60_000;
export const UNKNOWN_RATE_KEY = "unknown";

export interface RateLimiter {
  allow(key: string): boolean;
}

export function createRateLimiter(
  options: {
    max?: number;
    windowMs?: number;
    now?: () => number;
  } = {},
): RateLimiter {
  const max = options.max ?? COLLECT_RATE_MAX;
  const windowMs = options.windowMs ?? COLLECT_RATE_WINDOW_MS;
  const now = options.now ?? Date.now;
  const hits = new Map<string, number[]>();

  return {
    allow(key: string) {
      const at = now();
      const cutoff = at - windowMs;
      for (const [other, stamps] of hits) {
        const kept = stamps.filter((stamp) => stamp > cutoff);
        if (kept.length === 0) hits.delete(other);
        else hits.set(other, kept);
      }
      const stamps = hits.get(key) ?? [];
      if (stamps.length >= max) return false;
      stamps.push(at);
      hits.set(key, stamps);
      return true;
    },
  };
}
