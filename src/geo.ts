import geoip from "geoip-country";

const COUNTRY_CODE = /^[A-Z]{2}$/;
// Cloudflare placeholder codes — not ISO countries. Fall through to an IP lookup.
const UNKNOWN_CODES = new Set(["XX", "T1", "A1", "A2"]);

export interface IpRequest {
  get(name: string): string | undefined;
  ip?: string;
  socket: { remoteAddress?: string };
}

export function countryFor(
  cfCountry: string | undefined,
  ip: string | undefined,
): string | null {
  const header = cfCountry?.trim().toUpperCase();
  if (header && COUNTRY_CODE.test(header) && !UNKNOWN_CODES.has(header)) {
    return header;
  }

  if (!ip) return null;
  return geoip.lookup(normalizeIp(ip))?.country ?? null;
}

/** Visitor IP: Cloudflare/Akamai first, then Express (`trust proxy`), then the socket. */
export function requestIp(req: IpRequest): string | undefined {
  const candidates = [
    req.get("cf-connecting-ip"),
    req.get("true-client-ip"),
    req.get("x-real-ip"),
    req.ip,
    req.socket.remoteAddress,
  ];
  for (const raw of candidates) {
    const ip = firstHop(raw);
    if (ip) return ip;
  }
}

function firstHop(value: string | undefined): string | undefined {
  const hop = value?.split(",")[0]?.trim();
  if (!hop) return;
  return hop.replace(/^\[/, "").replace(/\]$/, "").replace(/%.*$/, "");
}

/** Unwraps IPv4-mapped IPv6 addresses (`::ffff:1.2.3.4`) so both forms match. */
export function normalizeIp(ip: string): string {
  return firstHop(ip)?.replace(/^::ffff:/i, "") ?? ip;
}
