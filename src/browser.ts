const BROWSERS = [
  { name: "Samsung Internet", match: /SamsungBrowser/i },
  { name: "Edge", match: /\bEdg\//i },
  { name: "Opera", match: /\b(OPR|Opera)\//i },
  { name: "Firefox", match: /Firefox|FxiOS/i },
  { name: "Chrome", match: /Chrome|CriOS|Chromium/i },
  { name: "Safari", match: /Safari/i },
  { name: "Internet Explorer", match: /MSIE |Trident\//i },
] as const;

/** Family name from a User-Agent, e.g. `Chrome Mobile`. The raw UA is not stored. */
export function parseBrowser(userAgent: string | undefined): string {
  const ua = userAgent?.trim();
  if (!ua) return "Other";

  const found = BROWSERS.find(({ match }) => match.test(ua));
  if (!found) return "Other";

  const mobile = /Mobile|Android|iPhone|iPod/i.test(ua);
  if (mobile && (found.name === "Chrome" || found.name === "Safari")) {
    return `${found.name} Mobile`;
  }
  return found.name;
}
