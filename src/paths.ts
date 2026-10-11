import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = fileURLToPath(new URL("..", import.meta.url));
export const PUBLIC_DIR = join(ROOT_DIR, "public");
export const DIST_DIR = join(ROOT_DIR, "dist");
export const RUM_SCRIPT = join(PUBLIC_DIR, "rum.js");
