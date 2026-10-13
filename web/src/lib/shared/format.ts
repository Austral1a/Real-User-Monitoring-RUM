import { i18n, t } from "$lib/I18n";

import type { RangeKey } from "./Types";

const formatters = new Map<
  string,
  {
    number: Intl.NumberFormat;
    compact: Intl.NumberFormat;
    region: Intl.DisplayNames | null;
  }
>();

function localeFormatters() {
  const locale = i18n.locale;
  const cached = formatters.get(locale);
  if (cached) return cached;
  const next = {
    number: new Intl.NumberFormat(locale),
    compact: new Intl.NumberFormat(locale, {
      notation: "compact",
      maximumFractionDigits: 2,
    }),
    region:
      typeof Intl.DisplayNames === "function"
        ? new Intl.DisplayNames(locale, { type: "region" })
        : null,
  };
  formatters.set(locale, next);
  return next;
}

export function formatMs(value: number | null | undefined): string {
  if (value === null || value === undefined) return t("format.dash");
  return value >= 1000
    ? t("format.seconds", { value: (value / 1000).toFixed(2) })
    : t("format.ms", { value: Math.round(value) });
}

/** CLS is stored as integer thousandths (0.12 → 120). */
export function formatCls(value: number | null | undefined): string {
  if (value === null || value === undefined) return t("format.dash");
  return (value / 1000).toFixed(3);
}

export function formatP75P95(
  p75: number | null,
  p95: number | null,
  format: (value: number | null) => string,
): string {
  return t("format.p75p95", { p75: format(p75), p95: format(p95) });
}

export function formatP50P95(
  p50: number | null,
  p95: number | null,
  format: (value: number | null) => string,
): string {
  return t("format.p50p95", { p50: format(p50), p95: format(p95) });
}

export function formatCount(value: number): string {
  return localeFormatters().number.format(value);
}

export function formatCompact(value: number): string {
  return localeFormatters().compact.format(value);
}

export function formatBucket(start: number, range: RangeKey): string {
  const date = new Date(start);
  const locale = i18n.locale;
  if (range === "24h") {
    return date.toLocaleTimeString(locale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  if (range === "7d") {
    return date.toLocaleString(locale, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(value: number): string {
  return new Date(value).toLocaleString(i18n.locale);
}

export function formatTime(value: number): string {
  return new Date(value).toLocaleTimeString(i18n.locale);
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
  if (rounded === 0) return t("format.vsPrevZero");
  return t("format.vsPrev", {
    delta: `${rounded > 0 ? "+" : ""}${rounded}`,
  });
}

export function formatVitalGood(score: { good: number; n: number }): string {
  if (score.n === 0) return t("format.noSamples");
  return t("format.vitalGood", {
    percent: Math.round((100 * score.good) / score.n),
  });
}

export function countryLabel(code: string): string {
  if (code === "unknown") return t("format.unknown");
  try {
    const name = localeFormatters().region?.of(code);
    return name && name !== code ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

export function deviceLabel(key: string): string {
  if (key === "desktop") return t("device.desktop");
  if (key === "mobile") return t("device.mobile");
  if (key === "tablet") return t("device.tablet");
  if (key === "unknown") return t("device.unknown");
  return key[0].toUpperCase() + key.slice(1);
}

export function connectionLabel(key: string): string {
  return key === "unknown" ? t("connection.unknown") : key;
}
