export type Messages = typeof import("./En").en;

export type MessageKey = {
  [K in keyof Messages & string]: Messages[K] extends string
    ? K
    : `${K}.${NestedKey<Messages[K]>}`;
}[keyof Messages & string];

type NestedKey<T> = T extends string
  ? never
  : {
      [K in keyof T & string]: T[K] extends string
        ? K
        : `${K}.${NestedKey<T[K]>}`;
    }[keyof T & string];

export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.hasOwn(params, key) ? String(params[key]) : match,
  );
}

export function lookup(messages: Messages, key: string): string {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null || !(part in node)) {
      return key;
    }
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : key;
}
