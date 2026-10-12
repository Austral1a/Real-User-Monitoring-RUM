import type { BadgeVariant } from "$lib/components/ui/badge/index.js";
import type { ErrorRow } from "$lib/types";

const ERROR_LABELS: Record<ErrorRow["type"], string> = {
  js_error: "JS error",
  network_error: "Network",
  crash: "Crash",
};

export function details(error: ErrorRow): string {
  if (error.type === "network_error") {
    return `${error.method} ${error.source} → ${error.status === 0 ? "failed" : error.status}`;
  }
  if (error.type === "crash") {
    return "Left before the page finished loading";
  }
  return error.message ?? "";
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
