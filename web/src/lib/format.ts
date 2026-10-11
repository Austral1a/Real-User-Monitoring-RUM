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

export function formatCount(value: number): string {
  return numberFormat.format(value);
}

export function formatCompact(value: number): string {
  return compactFormat.format(value);
}

export function formatBucket(start: number, range: RangeKey): string {
  const date = new Date(start);
  return range === "24h"
    ? date.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
      })
    : date.toLocaleString(undefined, {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
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
