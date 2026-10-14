import type { BadgeVariant } from "$lib/Components/Ui/Badge/index.js";
import { t, type MessageKey } from "$lib/I18n";
import type {
  ErrorGroup,
  ErrorRow,
  ErrorType,
  NetworkGroup,
} from "$lib/Shared/Types";

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
  error: "filter.error",
  host: "filter.host",
  status: "filter.status",
};

export type FilterKey =
  | "path"
  | "origin"
  | "lang"
  | "locale"
  | "release"
  | "error"
  | "host"
  | "status";

export interface FilterChip {
  key: FilterKey;
  label: string;
  value: string;
}

export function filterChips(state: {
  path?: string;
  origin?: string;
  lang?: string;
  locale?: string;
  release?: string;
  errorType?: ErrorType;
  errorMessage?: string;
  errorSource?: string;
  host?: string;
  status?: number;
}): FilterChip[] {
  const chips: FilterChip[] = [];
  if (state.path) chips.push(chip("path", state.path));
  if (state.origin) chips.push(chip("origin", state.origin));
  if (state.lang) chips.push(chip("lang", state.lang));
  if (state.locale) chips.push(chip("locale", state.locale));
  if (state.release) chips.push(chip("release", state.release));
  if (state.errorType) {
    chips.push(
      chip("error", errorFilterLabel(state.errorType, state.errorMessage)),
    );
  }
  if (state.host) chips.push(chip("host", state.host));
  if (state.status !== undefined) {
    chips.push(
      chip(
        "status",
        state.status === 0 ? t("network.failed") : String(state.status),
      ),
    );
  }
  return chips;
}

export interface ErrorScope {
  errorType?: ErrorType;
  errorMessage?: string;
  errorSource?: string;
  host?: string;
  status?: number;
}

export function emptyErrorScope(): ErrorScope {
  return {
    errorType: undefined,
    errorMessage: undefined,
    errorSource: undefined,
    host: undefined,
    status: undefined,
  };
}

export function isErrorScopeActive(scope: ErrorScope): boolean {
  return (
    scope.errorType !== undefined ||
    scope.host !== undefined ||
    scope.status !== undefined
  );
}

export function sameErrorGroup(group: ErrorGroup, scope: ErrorScope): boolean {
  return (
    scope.errorType === group.type &&
    (scope.errorMessage ?? "") === (group.message ?? "") &&
    (scope.errorSource ?? "") === (group.source ?? "") &&
    scope.host === undefined &&
    scope.status === undefined
  );
}

export function sameNetworkGroup(
  group: NetworkGroup,
  scope: ErrorScope,
): boolean {
  return scope.host === group.host && scope.status === group.status;
}

export function scopeFromErrorGroup(group: ErrorGroup): ErrorScope {
  return {
    ...emptyErrorScope(),
    errorType: group.type,
    errorMessage: group.message ?? "",
    errorSource: group.source ?? "",
  };
}

export function scopeFromNetworkGroup(group: NetworkGroup): ErrorScope {
  return {
    ...emptyErrorScope(),
    errorType: "network_error",
    host: group.host,
    status: group.status,
  };
}

export function toggleErrorGroup(
  group: ErrorGroup,
  scope: ErrorScope,
): ErrorScope {
  return sameErrorGroup(group, scope)
    ? emptyErrorScope()
    : scopeFromErrorGroup(group);
}

export function toggleNetworkGroup(
  group: NetworkGroup,
  scope: ErrorScope,
): ErrorScope {
  return sameNetworkGroup(group, scope)
    ? emptyErrorScope()
    : scopeFromNetworkGroup(group);
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

function errorFilterLabel(type: ErrorType, message?: string): string {
  const kind = t(ERROR_KEYS[type]);
  const detail = message?.trim();
  if (!detail) return kind;
  return detail.length > 80 ? `${kind}: ${detail.slice(0, 77)}…` : `${kind}: ${detail}`;
}

function chip(key: FilterKey, value: string): FilterChip {
  return { key, label: t(FILTER_KEYS[key]), value };
}
