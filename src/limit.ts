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
  let ops = 0;

  function pruneKey(key: string, cutoff: number): number[] {
    const kept = (hits.get(key) ?? []).filter((stamp) => stamp > cutoff);
    if (kept.length === 0) hits.delete(key);
    else hits.set(key, kept);
    return kept;
  }

  return {
    allow(key: string) {
      const at = now();
      const cutoff = at - windowMs;
      const stamps = pruneKey(key, cutoff);
      if (++ops % 32 === 0) {
        for (const other of hits.keys()) {
          if (other !== key) pruneKey(other, cutoff);
        }
      }
      if (stamps.length >= max) return false;
      stamps.push(at);
      hits.set(key, stamps);
      return true;
    },
  };
}
