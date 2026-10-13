import type { BadgeVariant } from "$lib/Components/Ui/Badge/index.js";
import { t, type MessageKey } from "$lib/I18n";
import type { ErrorGroup, ErrorRow } from "$lib/Shared/Types";

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

const ERROR_KEYS: Record<ErrorRow["type"], MessageKey> = {
  js_error: "errors.js",
  network_error: "errors.network",
  crash: "errors.crash",
};

const FILTER_KEYS: Record<FilterKey, MessageKey> = {
  path: "filter.path",
  origin: "filter.origin",
  lang: "filter.lang",
  locale: "filter.locale",
  release: "filter.release",
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
  if (path) chips.push(chip("path", path));
  if (origin) chips.push(chip("origin", origin));
  if (lang) chips.push(chip("lang", lang));
  if (locale) chips.push(chip("locale", locale));
  if (release) chips.push(chip("release", release));
  return chips;
}

export function details(error: ErrorRow): string {
  if (error.type === "network_error") {
    return t("errors.networkDetails", {
      method: error.method ?? "",
      source: error.source ?? "",
      status:
        error.status === 0
          ? t("errors.networkFailed")
          : String(error.status ?? ""),
    });
  }
  if (error.type === "crash") return t("errors.crashDetails");
  return error.message ?? "";
}

export function groupDetails(group: ErrorGroup): string {
  if (group.type === "network_error") {
    return group.source ?? t("errors.networkError");
  }
  if (group.type === "crash") return t("errors.crashDetails");
  return group.message ?? "";
}

export function errorBadge(type: ErrorRow["type"]): {
  label: string;
  variant: BadgeVariant;
  className?: string;
} {
  const label = t(ERROR_KEYS[type]);
  if (type === "js_error") {
    return { label, variant: "destructive" };
  }
  if (type === "network_error") {
    return {
      label,
      variant: "outline",
      className:
        "border-transparent bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    };
  }
  return {
    label,
    variant: "outline",
    className:
      "border-transparent bg-violet-50 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  };
}

function chip(key: FilterKey, value: string): FilterChip {
  return { key, label: t(FILTER_KEYS[key]), value };
}
