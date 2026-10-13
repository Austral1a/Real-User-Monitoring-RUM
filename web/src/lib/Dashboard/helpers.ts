import type { BadgeVariant } from "$lib/components/ui/badge/index.js";
import type { ErrorGroup, ErrorRow } from "$lib/types";

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const ERROR_LABELS: Record<ErrorRow["type"], string> = {
  js_error: "JS error",
  network_error: "Network",
  crash: "Crash",
};

export type FilterKey = "path" | "origin" | "lang" | "locale" | "release";

export interface FilterChip {
  key: FilterKey;
  label: string;
  value: string;
}

export function filterChips(
  path?: string,
  origin?: string,
  lang?: string,
  locale?: string,
  release?: string,
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (path) chips.push({ key: "path", label: "URL", value: path });
  if (origin) chips.push({ key: "origin", label: "Site", value: origin });
  if (lang) chips.push({ key: "lang", label: "Language", value: lang });
  if (locale) chips.push({ key: "locale", label: "Locale", value: locale });
  if (release) chips.push({ key: "release", label: "Release", value: release });
  return chips;
}

export function details(error: ErrorRow): string {
  if (error.type === "network_error") {
    return `${error.method} ${error.source} → ${error.status === 0 ? "failed" : error.status}`;
  }
  if (error.type === "crash") {
    return "Left before the page finished loading";
  }
  return error.message ?? "";
}

export function groupDetails(group: ErrorGroup): string {
  if (group.type === "network_error") return group.source ?? "Network error";
  if (group.type === "crash") return "Left before the page finished loading";
  return group.message ?? "";
}

export function errorBadge(type: ErrorRow["type"]): {
  label: string;
  variant: BadgeVariant;
  className?: string;
} {
  if (type === "js_error") {
    return { label: ERROR_LABELS[type], variant: "destructive" };
  }
  if (type === "network_error") {
    return {
      label: ERROR_LABELS[type],
      variant: "outline",
      className:
        "border-transparent bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    };
  }
  return {
    label: ERROR_LABELS[type],
    variant: "outline",
    className:
      "border-transparent bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  };
}
