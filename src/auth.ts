import { createHash, timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

import type { DashboardCredentials } from "./config";

export function basicAuth(
  credentials: DashboardCredentials | null,
): RequestHandler {
  if (!credentials) return (_req, _res, next) => next();

  const expected = digest(`${credentials.user}:${credentials.password}`);

  return (req, res, next) => {
    const [scheme, encoded] = (req.get("authorization") ?? "").split(" ");
    const supplied =
      scheme?.toLowerCase() === "basic" && encoded
        ? Buffer.from(encoded, "base64").toString("utf8")
        : "";

    if (timingSafeEqual(digest(supplied), expected)) {
      next();
      return;
    }

    res
      .set("WWW-Authenticate", 'Basic realm="monitor", charset="UTF-8"')
      .status(401)
      .send("Authentication required");
  };
}

// Hashing gives both sides the same length, which timingSafeEqual requires.
function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}
