import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_EVENTS_PER_BATCH,
  parseAcceptLanguage,
  parseBatch,
  parseLangTag,
  parseOverviewBot,
  redactUrls,
  stripQuery,
} from "../src/validate";

const context = {
  sessionId: "session-1234",
  device: "mobile",
  os: "Android",
  connection: "4g",
};

function batch(events: unknown[], overrides: Record<string, unknown> = {}) {
  return JSON.stringify({ ...context, ...overrides, events });
}

describe("parseBatch", () => {
  it("accepts every event type and merges the batch context", () => {
    const result = parseBatch(
      batch([
        {
          type: "timing",
          path: "/uk",
          lang: "uk",
          pageLoad: 1234.6,
          ttfb: 80,
          startRender: 400,
        },
        {
          type: "js_error",
          path: "/uk",
          message: "TypeError: boom",
          source: "https://a.com/app.js:1:2",
        },
        {
          type: "network_error",
          path: "/uk",
          url: "a.com/api",
          status: 503,
          method: "post",
        },
        { type: "crash", path: "/uk" },
      ]),
    );

    assert.ok(result.ok);
    assert.equal(result.webdriver, false);
    assert.equal(result.events.length, 4);
    assert.deepEqual(
      { ...result.events[0] },
      {
        ...context,
        type: "timing",
        path: "/uk",
        lang: "uk",
        locale: null,
        release: null,
        pageLoad: 1235,
        ttfb: 80,
        startRender: 400,
        lcp: null,
        inp: null,
        cls: null,
        message: null,
        source: null,
        status: null,
        method: null,
      },
    );
    assert.equal(result.events[2].method, "POST");
  });

  it("strips query strings and fragments from paths, sources, and URLs", () => {
    const result = parseBatch(
      batch([
        {
          type: "timing",
          path: "/uk/products?utm_source=x#top",
          pageLoad: 900,
        },
        {
          type: "js_error",
          path: "/uk",
          message: "Failed at https://a.com/page?token=secret now",
          source: "https://a.com/chunk.js?v=3:10:5",
        },
        {
          type: "network_error",
          path: "/uk",
          url: "api.a.com/orders?id=42",
          status: 0,
          method: "GET",
        },
      ]),
    );

    assert.ok(result.ok);
    assert.equal(result.events[0].path, "/uk/products");
    assert.equal(result.events[1].message, "Failed at https://a.com/page now");
    assert.equal(result.events[1].source, "https://a.com/chunk.js:10:5");
    assert.equal(result.events[2].source, "api.a.com/orders");
  });

  it("accepts web vitals on a timing event, including vitals-only rows", () => {
    const result = parseBatch(
      batch([
        {
          type: "timing",
          path: "/",
          lcp: 1800.4,
          inp: 64,
          cls: 120.2,
        },
      ]),
    );
    assert.ok(result.ok);
    assert.equal(result.events[0].lcp, 1800);
    assert.equal(result.events[0].inp, 64);
    assert.equal(result.events[0].cls, 120);
    assert.equal(result.events[0].pageLoad, null);
  });

  it("rejects cls above the thousandths cap", () => {
    const result = parseBatch(
      batch([{ type: "timing", path: "/", cls: 10_001 }]),
    );
    assert.equal(result.ok, false);
  });

  it("drops an unrecognised lang instead of rejecting the batch", () => {
    const result = parseBatch(
      batch([{ type: "crash", path: "/", lang: "<script>" }]),
    );
    assert.ok(result.ok);
    assert.equal(result.events[0].lang, null);
  });

  it("stores browser lang and page locale separately, not from the path", () => {
    const result = parseBatch(
      batch([
        {
          type: "crash",
          path: "/uk",
          lang: "uk-UA",
          locale: "en",
        },
      ]),
    );
    assert.ok(result.ok);
    assert.equal(result.events[0].path, "/uk");
    assert.equal(result.events[0].lang, "uk-ua");
    assert.equal(result.events[0].locale, "en");
  });

  it("accepts a custom event and a batch release", () => {
    const result = parseBatch(
      batch([{ type: "custom", path: "/uk", name: "pdf" }], {
        release: "2026-10-13",
      }),
    );
    assert.ok(result.ok);
    assert.equal(result.events[0].type, "custom");
    assert.equal(result.events[0].message, "pdf");
    assert.equal(result.events[0].release, "2026-10-13");
  });

  const rejected: [string, string][] = [
    ["invalid JSON", "{nope"],
    ["a non-object body", "[]"],
    [
      "a short session id",
      batch([{ type: "crash", path: "/" }], { sessionId: "abc" }),
    ],
    [
      "an unknown device",
      batch([{ type: "crash", path: "/" }], { device: "fridge" }),
    ],
    ["an unknown os", batch([{ type: "crash", path: "/" }], { os: "BeOS" })],
    ["an empty event list", batch([])],
    [
      "too many events",
      batch(
        Array.from({ length: MAX_EVENTS_PER_BATCH + 1 }, () => ({
          type: "crash",
          path: "/",
        })),
      ),
    ],
    ["an unknown event type", batch([{ type: "click", path: "/" }])],
    [
      "an invalid custom event name",
      batch([{ type: "custom", path: "/", name: "Not Valid" }]),
    ],
    [
      "a path without a leading slash",
      batch([{ type: "crash", path: "https://a.com/" }]),
    ],
    [
      "a timing event without measurements",
      batch([{ type: "timing", path: "/" }]),
    ],
    ["a negative duration", batch([{ type: "timing", path: "/", ttfb: -1 }])],
    ["a js error without a message", batch([{ type: "js_error", path: "/" }])],
    [
      "a successful network status",
      batch([
        {
          type: "network_error",
          path: "/",
          url: "a.com/x",
          status: 200,
          method: "GET",
        },
      ]),
    ],
    [
      "an invalid HTTP method",
      batch([
        {
          type: "network_error",
          path: "/",
          url: "a.com/x",
          status: 500,
          method: "G E T",
        },
      ]),
    ],
  ];

  for (const [name, body] of rejected) {
    it(`rejects ${name}`, () => {
      const result = parseBatch(body);
      assert.equal(result.ok, false);
    });
  }

  it("reads webdriver from the batch context", () => {
    const result = parseBatch(
      batch([{ type: "crash", path: "/uk" }], { webdriver: true }),
    );
    assert.ok(result.ok);
    assert.equal(result.webdriver, true);
  });

  it("truncates long text fields", () => {
    const result = parseBatch(
      batch([{ type: "js_error", path: "/", message: "x".repeat(1000) }]),
    );
    assert.ok(result.ok);
    assert.equal(result.events[0].message?.length, 300);
  });
});

describe("parseLangTag", () => {
  it("normalises BCP-47 tags and rejects junk", () => {
    assert.equal(parseLangTag("uk-UA"), "uk-ua");
    assert.equal(parseLangTag("en"), "en");
    assert.equal(parseLangTag("<script>"), null);
    assert.equal(parseAcceptLanguage("uk-UA,uk;q=0.9,en;q=0.8"), "uk-ua");
    assert.equal(parseAcceptLanguage(undefined), null);
  });
});

describe("parseOverviewBot", () => {
  it("defaults to humans and accepts yes or no", () => {
    assert.deepEqual(parseOverviewBot(undefined), { ok: true, value: false });
    assert.deepEqual(parseOverviewBot("no"), { ok: true, value: false });
    assert.deepEqual(parseOverviewBot("yes"), { ok: true, value: true });
    assert.equal(parseOverviewBot("maybe").ok, false);
  });
});

describe("stripQuery", () => {
  it("keeps line and column suffixes", () => {
    assert.equal(
      stripQuery("https://a.com/app.js?v=1:10:5"),
      "https://a.com/app.js:10:5",
    );
    assert.equal(stripQuery("/path?x=1#y"), "/path");
    assert.equal(stripQuery("/plain"), "/plain");
  });
});

describe("redactUrls", () => {
  it("removes query strings from every URL in the text", () => {
    assert.equal(
      redactUrls("a https://x.com/a?b=1 and http://y.com/c#d"),
      "a https://x.com/a and http://y.com/c",
    );
  });
});
