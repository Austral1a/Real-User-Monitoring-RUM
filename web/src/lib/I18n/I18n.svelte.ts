import { en } from "./En";
import {
  interpolate,
  lookup,
  type MessageKey,
  type Messages,
} from "./Helpers";
import { ru } from "./Ru";

export type { MessageKey, Messages };

export const LOCALES = ["en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_KEY = "monitor-locale";

const catalogs: Record<Locale, Messages> = { en, ru };

export const i18n = $state({ locale: readLocale() });

if (typeof document !== "undefined") applyLocale(i18n.locale);

export function t(
  key: MessageKey,
  params?: Record<string, string | number>,
): string {
  return interpolate(lookup(catalogs[i18n.locale], key), params);
}

export function setLocale(locale: Locale): void {
  i18n.locale = locale;
  applyLocale(locale);
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Private mode can block storage.
  }
}

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function readLocale(): Locale {
  const stored = storedLocale();
  if (stored) return stored;
  if (typeof navigator === "object" && navigator.language) {
    return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
  }
  return "en";
}

function applyLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.title = lookup(catalogs[locale], "app.title");
}

function storedLocale(): Locale | null {
  try {
    const value = localStorage.getItem(LOCALE_KEY);
    return value && isLocale(value) ? value : null;
  } catch {
    return null;
  }
}
