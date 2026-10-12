import type { Server } from "node:http";
import { join } from "node:path";
import type { RequestHandler } from "express";

import { ROOT_DIR } from "./paths";

export async function createViteMiddleware(
  httpServer: Server,
): Promise<RequestHandler> {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: join(ROOT_DIR, "web/vite.config.ts"),
    server: {
      middlewareMode: true,
      hmr: { server: httpServer },
      watch: {
        usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
      },
    },
    appType: "spa",
  });
  return vite.middlewares as RequestHandler;
}
