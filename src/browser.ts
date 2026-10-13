const BROWSERS = [
  { name: "Samsung Internet", match: /SamsungBrowser/i },
  { name: "Edge", match: /\bEdg\//i },
  { name: "Opera", match: /\b(OPR|Opera)\//i },
  { name: "Firefox", match: /Firefox|FxiOS/i },
  { name: "Chrome", match: /Chrome|CriOS|Chromium/i },
  { name: "Safari", match: /Safari/i },
  { name: "Internet Explorer", match: /MSIE |Trident\//i },
] as const;

const BOT_UA =
  /Googlebot|Google-InspectionTool|Storebot-Google|AdsBot-Google|Mediapartners-Google|bingbot|BingPreview|msnbot|DuckDuckBot|Baiduspider|YandexBot|YandexImages|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Applebot|PetalBot|SemrushBot|AhrefsBot|DotBot|MJ12bot|Bytespider|GPTBot|ChatGPT-User|ClaudeBot|CCBot|Amazonbot|HeadlessChrome|Chrome-Lighthouse|PageSpeed|Pingdom|UptimeRobot|PhantomJS|Puppeteer|Playwright|Slurp|ia_archiver|Discordbot|WhatsApp|TelegramBot|Slackbot/i;

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

export function isBot(userAgent: string | undefined): boolean {
  const ua = userAgent?.trim();
  if (!ua) return false;
  return BOT_UA.test(ua);
}
