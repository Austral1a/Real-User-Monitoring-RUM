import { createHmac } from "node:crypto";

import { normalizeIp } from "./geo";

export interface ClientHashes {
  ipHash: string | null;
  uaHash: string | null;
}

export type ClientHasher = (
  ip: string | undefined,
  userAgent: string | undefined,
) => ClientHashes;

export function createClientHasher(salt: string): ClientHasher {
  const hash = (kind: "ip" | "ua", value: string) =>
    createHmac("sha256", salt)
      .update(`${kind}:${value}`)
      .digest("hex")
      .slice(0, 16);

  return (ip, userAgent) => {
    const agent = userAgent?.trim();
    return {
      ipHash: ip ? hash("ip", normalizeIp(ip)) : null,
      uaHash: agent ? hash("ua", agent) : null,
    };
  };
}
