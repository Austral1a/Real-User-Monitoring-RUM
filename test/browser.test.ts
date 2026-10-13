import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isBot, parseBrowser } from "../src/browser";

describe("parseBrowser", () => {
  it("names common desktop and mobile browsers", () => {
    assert.equal(
      parseBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
      "Chrome",
    );
    assert.equal(
      parseBrowser(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
      "Chrome Mobile",
    );
    assert.equal(
      parseBrowser(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15",
      ),
      "Safari",
    );
    assert.equal(
      parseBrowser(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1",
      ),
      "Safari Mobile",
    );
    assert.equal(
      parseBrowser(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      ),
      "Edge",
    );
    assert.equal(
      parseBrowser(
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 SamsungBrowser/24.0 Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
      "Samsung Internet",
    );
  });

  it("returns Other when the header is missing or unknown", () => {
    assert.equal(parseBrowser(undefined), "Other");
    assert.equal(parseBrowser("curl/8.0"), "Other");
  });
});

describe("isBot", () => {
  it("flags search crawlers and headless browsers", () => {
    assert.equal(
      isBot(
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      ),
      true,
    );
    assert.equal(
      isBot(
        "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1)",
      ),
      true,
    );
    assert.equal(isBot("Mozilla/5.0 HeadlessChrome/120.0.0.0"), true);
  });

  it("does not flag ordinary browsers or CUBOT phones", () => {
    assert.equal(isBot(undefined), false);
    assert.equal(
      isBot(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      ),
      false,
    );
    assert.equal(
      isBot(
        "Mozilla/5.0 (Linux; Android 13; CUBOT_X70) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      ),
      false,
    );
  });
});
