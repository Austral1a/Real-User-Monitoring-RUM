import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import type { RequestHandler } from "express";

import { createApp } from "./app";
import { loadConfig, type Config } from "./config";
import { DIST_DIR, ROOT_DIR } from "./paths";
import { openStore } from "./store";

const DAY = 24 * 60 * 60 * 1000;
const RETENTION_MS = 30 * DAY;

const envFile = join(ROOT_DIR, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

let config: Config;
try {
  config = loadConfig(process.env);
} catch (error) {
  console.error(`[monitor] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

const store = openStore(config.dbPath);
const httpServer = createServer();

function pruneOldEvents() {
  const removed = store.prune(Date.now() - RETENTION_MS);
  if (removed > 0)
    console.log(`[monitor] Pruned ${removed} events older than 30 days`);
}

pruneOldEvents();
setInterval(pruneOldEvents, DAY).unref();

async function start() {
  let vite: RequestHandler | undefined;
  if (process.env.MONITOR_DEV === "1") {
    const { createViteMiddleware } = await import("./dev");
    vite = await createViteMiddleware(httpServer);
  }

  const app = createApp({ config, store, vite });
  httpServer.on("request", app);
  httpServer.on("error", (error) => {
    console.error(
      `[monitor] Could not listen on port ${config.port}: ${error.message}`,
    );
    process.exit(1);
  });
  httpServer.listen(config.port, "0.0.0.0", () => {
    console.log(`[monitor] Listening on http://localhost:${config.port}`);
    console.log(
      `[monitor] Accepting beacons from ${[...config.siteOrigins].join(", ")}`,
    );
    if (!vite && !existsSync(join(DIST_DIR, "index.html"))) {
      console.warn(
        "[monitor] Dashboard build is missing; run pnpm start (or pnpm dev).",
      );
    }
    if (!config.dashboardAuth) {
      console.warn(
        "[monitor] Dashboard auth is not configured; the dashboard is open.",
      );
    }
  });
}

function shutdown() {
  httpServer.close(() => {
    store.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

void start();
