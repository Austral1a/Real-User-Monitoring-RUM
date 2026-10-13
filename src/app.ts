import { existsSync } from "node:fs";
import { join } from "node:path";
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
} from "express";

import { basicAuth } from "./auth";
import { isBot, parseBrowser } from "./browser";
import type { Config } from "./config";
import { countryFor, requestIp } from "./geo";
import { createClientHasher } from "./identity";
import { buildOverview, isRangeKey, isSessionKey } from "./overview";
import { DIST_DIR, RUM_SCRIPT } from "./paths";
import type { EventFilter, Store } from "./store";
import {
  parseBatch,
  parseOverviewBot,
  parseOverviewLang,
  parseOverviewOrigin,
  parseOverviewPath,
} from "./validate";

export const MAX_BODY_BYTES = 8 * 1024;

export interface AppDependencies {
  config: Config;
  store: Store;
  now?: () => number;
  /** Vite middleware used by `pnpm dev`. Production serves `dist/` instead. */
  vite?: RequestHandler;
}

function dashboardCsp(dev: boolean): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    `style-src 'self'${dev ? " 'unsafe-inline'" : ""}`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join("; ");
}

export function createApp({
  config,
  store,
  now = Date.now,
  vite,
}: AppDependencies): Express {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  const hashClient = createClientHasher(config.hashSalt);

  app.get("/rum.js", (_req, res) => {
    res.sendFile(RUM_SCRIPT, {
      // `send` 404s files under a hidden directory, e.g. `.Trash` or `.local`.
      dotfiles: "allow",
      headers: {
        "Cache-Control": "public, max-age=300",
        "Cross-Origin-Resource-Policy": "cross-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });

  const allowSiteOrigin: RequestHandler = (req, res, next) => {
    const origin = req.get("origin");
    if (origin && config.siteOrigins.has(origin)) {
      next();
      return;
    }
    console.warn(
      `[monitor] Rejected /collect from origin ${origin ?? "(missing)"}`,
    );
    res.status(403).json({ error: "Origin not allowed" });
  };

  app.post(
    "/collect",
    allowSiteOrigin,
    // sendBeacon posts text/plain so the browser skips the CORS preflight.
    express.text({ type: () => true, limit: MAX_BODY_BYTES }),
    (req, res) => {
      if (typeof req.body !== "string" || req.body.length === 0) {
        res.status(400).json({ error: "Body is required" });
        return;
      }

      const result = parseBatch(req.body);
      if (!result.ok) {
        res.status(400).json({ error: result.error });
        return;
      }

      const receivedAt = now();
      const ip = requestIp(req);
      const country = countryFor(req.get("cf-ipcountry"), ip);
      const userAgent = req.get("user-agent");
      const { ipHash, uaHash } = hashClient(ip, userAgent);
      const browser = parseBrowser(userAgent);
      const bot = isBot(userAgent) || result.webdriver;
      store.insert(
        result.events.map((event) => ({
          ...event,
          receivedAt,
          country,
          origin: req.get("origin") ?? null,
          ipHash,
          uaHash,
          browser,
          bot,
        })),
      );
      console.log(
        `[monitor] Stored ${result.events.length} event(s) from ${req.get("origin") ?? "unknown origin"}`,
      );
      res.status(204).end();
    },
  );

  const dashboard = express.Router();
  dashboard.use(basicAuth(config.dashboardAuth));
  dashboard.use((_req, res, next) => {
    res.set({
      "Content-Security-Policy": dashboardCsp(Boolean(vite)),
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    });
    next();
  });

  dashboard.get("/api/overview", (req, res) => {
    const range = req.query.range ?? "24h";
    if (!isRangeKey(range)) {
      res.status(400).json({ error: "range must be 24h or 7d" });
      return;
    }
    const sessionKey = req.query.by ?? "session";
    if (!isSessionKey(sessionKey)) {
      res.status(400).json({ error: "by must be session, ua, ip, or ua-ip" });
      return;
    }
    const filter = parseOverviewFilter(req.query);
    if (!filter.ok) {
      res.status(400).json({ error: filter.error });
      return;
    }
    res.json(buildOverview(store, range, sessionKey, now(), filter.value));
  });

  if (vite) {
    dashboard.use(vite);
  } else {
    dashboard.use("/assets", express.static(join(DIST_DIR, "assets")));
    dashboard.get("/", (_req, res) => {
      const index = join(DIST_DIR, "index.html");
      if (!existsSync(index)) {
        res.status(503).json({
          error: "Dashboard is not built. Run pnpm start in monitor/.",
        });
        return;
      }
      res.sendFile(index);
    });
  }

  app.use(dashboard);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);

  return app;
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status = httpStatusOf(error);
  if (status === 413) {
    res.status(413).json({ error: "Payload too large" });
    return;
  }
  if (status !== null && status >= 400 && status < 500) {
    res.status(status).json({ error: "Invalid request" });
    return;
  }

  console.error("[monitor] Unhandled error", error);
  res.status(500).json({ error: "Internal server error" });
};

function parseOverviewFilter(
  query: Request["query"],
): { ok: true; value: EventFilter } | { ok: false; error: string } {
  const path = parseOverviewPath(query.path);
  if (!path.ok) return path;
  const origin = parseOverviewOrigin(query.origin);
  if (!origin.ok) return origin;
  const lang = parseOverviewLang(query.lang);
  if (!lang.ok) return lang;
  const bot = parseOverviewBot(query.bot);
  if (!bot.ok) return bot;
  return {
    ok: true,
    value: {
      path: path.value,
      origin: origin.value,
      lang: lang.value,
      bot: bot.value,
    },
  };
}

function httpStatusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const { status } = error as { status?: unknown };
  return typeof status === "number" ? status : null;
}
