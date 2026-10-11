import {
  CONNECTIONS,
  DEVICES,
  EVENT_TYPES,
  OPERATING_SYSTEMS,
  type RumEvent,
} from "./types";

export const MAX_EVENTS_PER_BATCH = 20;
const MAX_TEXT_LENGTH = 300;
const MAX_DURATION_MS = 10 * 60 * 1000;
const SESSION_ID = /^[A-Za-z0-9-]{8,64}$/;
const LANG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
const METHOD = /^[A-Z]{1,10}$/;

export type ParseResult =
  { ok: true; events: RumEvent[] } | { ok: false; error: string };

type BatchContext = Pick<
  RumEvent,
  "sessionId" | "device" | "os" | "connection"
>;

class ValidationError extends Error {}

export function parseBatch(raw: string): ParseResult {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return { ok: false, error: "Body is not valid JSON" };
  }

  try {
    if (!isRecord(body)) throw new ValidationError("Body must be an object");

    const { sessionId, events } = body;
    if (typeof sessionId !== "string" || !SESSION_ID.test(sessionId)) {
      throw new ValidationError("Invalid sessionId");
    }
    if (
      !Array.isArray(events) ||
      events.length === 0 ||
      events.length > MAX_EVENTS_PER_BATCH
    ) {
      throw new ValidationError(
        `events must contain 1 to ${MAX_EVENTS_PER_BATCH} items`,
      );
    }

    const context: BatchContext = {
      sessionId,
      device: oneOf(body.device, DEVICES, "device"),
      os: oneOf(body.os, OPERATING_SYSTEMS, "os"),
      connection: oneOf(body.connection, CONNECTIONS, "connection"),
    };

    return {
      ok: true,
      events: events.map((event) => parseEvent(event, context)),
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}

function parseEvent(value: unknown, context: BatchContext): RumEvent {
  if (!isRecord(value)) throw new ValidationError("Event must be an object");

  const event: RumEvent = {
    ...context,
    type: oneOf(value.type, EVENT_TYPES, "type"),
    path: parsePath(value.path),
    lang:
      typeof value.lang === "string" && LANG.test(value.lang)
        ? value.lang
        : null,
    pageLoad: null,
    ttfb: null,
    startRender: null,
    message: null,
    source: null,
    status: null,
    method: null,
  };

  switch (event.type) {
    case "timing":
      event.pageLoad = parseDuration(value.pageLoad, "pageLoad");
      event.ttfb = parseDuration(value.ttfb, "ttfb");
      event.startRender = parseDuration(value.startRender, "startRender");
      if (
        event.pageLoad === null &&
        event.ttfb === null &&
        event.startRender === null
      ) {
        throw new ValidationError("Timing event has no measurements");
      }
      break;
    case "js_error":
      event.message = requiredText(value.message, "message");
      event.source = optionalText(value.source, "source", stripQuery);
      break;
    case "network_error":
      event.source = requiredText(value.url, "url", stripQuery);
      event.status = parseStatus(value.status);
      event.method = parseMethod(value.method);
      break;
    case "crash":
      break;
  }

  return event;
}

/** Drops query strings and fragments, keeping a trailing `:line:col` when present. */
export function stripQuery(value: string): string {
  return value.replace(/[?#][^\s]*?(?=(:\d+){1,2}$|$)/, "");
}

/** Removes query strings from URLs embedded in free text, such as error messages. */
export function redactUrls(value: string): string {
  return value.replace(/(https?:\/\/[^\s?#]+)[?#]\S*/g, "$1");
}

function parsePath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) {
    throw new ValidationError("path must start with /");
  }
  return truncate(stripQuery(value));
}

function parseDuration(value: unknown, field: string): number | null {
  if (value === undefined || value === null) return null;
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > MAX_DURATION_MS
  ) {
    throw new ValidationError(
      `${field} must be between 0 and ${MAX_DURATION_MS} ms`,
    );
  }
  return Math.round(value);
}

function requiredText(
  value: unknown,
  field: string,
  clean: (text: string) => string = redactUrls,
): string {
  const text = optionalText(value, field, clean);
  if (text === null) throw new ValidationError(`${field} is required`);
  return text;
}

function optionalText(
  value: unknown,
  field: string,
  clean: (text: string) => string = redactUrls,
): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string")
    throw new ValidationError(`${field} must be a string`);
  return truncate(clean(value.trim())) || null;
}

function parseStatus(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    !(value === 0 || (value >= 400 && value <= 599))
  ) {
    throw new ValidationError("status must be 0 or 400-599");
  }
  return value;
}

function parseMethod(value: unknown): string {
  const method = typeof value === "string" ? value.toUpperCase() : "";
  if (!METHOD.test(method)) throw new ValidationError("Invalid method");
  return method;
}

function oneOf<T extends string>(
  value: unknown,
  allowed: readonly T[],
  field: string,
): T {
  if (
    typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
  ) {
    return value as T;
  }
  throw new ValidationError(`Invalid ${field}`);
}

function truncate(value: string): string {
  return value.length > MAX_TEXT_LENGTH
    ? value.slice(0, MAX_TEXT_LENGTH)
    : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
