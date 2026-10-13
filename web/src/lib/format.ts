import type { RangeKey } from "$lib/types";

const numberFormat = new Intl.NumberFormat();
const compactFormat = new Intl.NumberFormat(undefined, {
  notation: "compact",
  maximumFractionDigits: 2,
});
const regionNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(undefined, { type: "region" })
    : null;

export function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return value >= 1000
    ? `${(value / 1000).toFixed(2)} s`
    : `${Math.round(value)} ms`;
}

/** CLS is stored as integer thousandths (0.12 → 120). */
export function formatCls(value: number | null | undefined): string {
  if (value === null || value === undefined) return "–";
  return (value / 1000).toFixed(3);
}

export function formatP75P95(
  p75: number | null,
  p95: number | null,
  format: (value: number | null) => string,
): string {
  return `p75 ${format(p75)} · p95 ${format(p95)}`;
}

export function formatP50P95(
  p50: number | null,
  p95: number | null,
  format: (value: number | null) => string,
): string {
  return `p50 ${format(p50)} · p95 ${format(p95)}`;
}

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function formatCompact(value: number): string {
  return compactFormat.format(value);
}

export function formatBucket(start: number, range: RangeKey): string {
  const date = new Date(start);
  if (range === "24h") {
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (range === "7d") {
    return date.toLocaleString(undefined, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
): string | null {
  if (
    current === null ||
    current === undefined ||
    previous === null ||
    previous === undefined ||
    previous === 0
  ) {
    return null;
  }
  const rounded = Math.round(((current - previous) / previous) * 100);
  if (rounded === 0) return "0% vs prev";
  return `${rounded > 0 ? "+" : ""}${rounded}% vs prev`;
}

export function formatVitalGood(score: { good: number; n: number }): string {
  if (score.n === 0) return "No samples";
  return `${Math.round((100 * score.good) / score.n)}% good`;
}

export function countryLabel(code: string): string {
  if (code === "unknown") return "Unknown";
  try {
    const name = regionNames?.of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

export function deviceLabel(key: string): string {
  if (key === "unknown") return "Unknown";
  return key[0].toUpperCase() + key.slice(1);
}

export function connectionLabel(key: string): string {
  return key === "unknown" ? "Unknown" : key;
}
