import type { Locale, MessageKey } from "./I18n.svelte";

const LOCALE_LABELS = {
  en: "locale.en",
  ru: "locale.ru",
} as const satisfies Record<Locale, MessageKey>;

export function localeItems(
  locales: readonly Locale[],
  translate: (key: MessageKey) => string,
) {
  return locales.map((value) => ({
    value,
    label: translate(LOCALE_LABELS[value]),
  }));
}
