import { isAbsolute, join } from "node:path";

import { ROOT_DIR } from "./paths";

export interface DashboardCredentials {
  user: string;
  password: string;
}

export interface Config {
  port: number;
  siteOrigins: Set<string>;
  dashboardAuth: DashboardCredentials | null;
  trustProxy: boolean | number | string;
  dbPath: string;
  /** Key for hashing client IPs and user-agents. Changing it splits existing visitors from new ones. */
  hashSalt: string;
  production: boolean;
  /** Optional POST URL for LCP / JS-error threshold alerts. */
  alertWebhook: string | null;
}

const DEV_SITE_ORIGIN = "http://localhost:3000";
const DEV_HASH_SALT = "monitor-development-only-salt";
const MIN_HASH_SALT_LENGTH = 16;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const production = env.NODE_ENV === "production";

  return {
    port: parsePort(env.MONITOR_PORT),
    siteOrigins: parseOrigins(env.MONITOR_SITE_ORIGINS, production),
    dashboardAuth: parseCredentials(
      env.MONITOR_DASHBOARD_USER,
      env.MONITOR_DASHBOARD_PASSWORD,
      production,
    ),
    trustProxy: parseTrustProxy(env.MONITOR_TRUST_PROXY),
    dbPath: parseDbPath(env.MONITOR_DB_PATH),
    hashSalt: parseHashSalt(env.MONITOR_HASH_SALT, production),
    production,
    alertWebhook: parseWebhook(env.MONITOR_ALERT_WEBHOOK),
  };
}

function parseHashSalt(value: string | undefined, production: boolean): string {
  const salt = value?.trim();
  if (!salt) {
    if (production) throw new Error("MONITOR_HASH_SALT is required in production");
    return DEV_HASH_SALT;
  }
  if (salt.length < MIN_HASH_SALT_LENGTH) {
    throw new Error(
      `MONITOR_HASH_SALT must be at least ${MIN_HASH_SALT_LENGTH} characters`,
    );
  }
  return salt;
}

function parsePort(value: string | undefined): number {
  if (!value) return 4000;
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`MONITOR_PORT must be an integer between 1 and 65535`);
  }
  return port;
}

function parseOrigins(
  value: string | undefined,
  production: boolean,
): Set<string> {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) {
    if (production)
      throw new Error("MONITOR_SITE_ORIGINS is required in production");
    return new Set([DEV_SITE_ORIGIN]);
  }

  return new Set(
    entries.map((entry) => {
      try {
        return new URL(entry).origin;
      } catch {
        throw new Error(
          `MONITOR_SITE_ORIGINS contains an invalid origin: ${entry}`,
        );
      }
    }),
  );
}

function parseCredentials(
  user: string | undefined,
  password: string | undefined,
  production: boolean,
): DashboardCredentials | null {
  if (user && password) return { user, password };
  if (user || password) {
    throw new Error(
      "Set both MONITOR_DASHBOARD_USER and MONITOR_DASHBOARD_PASSWORD, or neither",
    );
  }
  if (production) {
    throw new Error(
      "MONITOR_DASHBOARD_USER and MONITOR_DASHBOARD_PASSWORD are required in production",
    );
  }
  return null;
}

function parseTrustProxy(value: string | undefined): boolean | number | string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "false") return false;
  if (trimmed === "true") return true;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  return trimmed;
}

function parseWebhook(value: string | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("MONITOR_ALERT_WEBHOOK must be an http(s) URL");
    }
    return parsed.href;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("MONITOR_")) {
      throw error;
    }
    throw new Error("MONITOR_ALERT_WEBHOOK must be an http(s) URL");
  }
}

function parseDbPath(value: string | undefined): string {
  const path = value?.trim() || "data/rum.sqlite";
  if (path === ":memory:" || isAbsolute(path)) return path;
  return join(ROOT_DIR, path);
}
