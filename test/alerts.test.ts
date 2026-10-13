import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { alertReasons, startAlerts } from "../src/alerts";
import { openStore } from "../src/store";
import type { StoredEvent } from "../src/types";

const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);

describe("alertReasons", () => {
  it("fires on slow LCP and a high JS error rate", () => {
    assert.deepEqual(alertReasons(10, 0, 5000), ["lcp"]);
    assert.deepEqual(alertReasons(10, 2, 1000), ["js_errors"]);
    assert.deepEqual(alertReasons(10, 2, 5000), ["lcp", "js_errors"]);
    assert.deepEqual(alertReasons(10, 0, 2000), []);
  });
});

describe("startAlerts", () => {
  it("POSTs to the webhook when p75 LCP is over the cap", async () => {
    const store = openStore(":memory:");
    store.insert([
      {
        receivedAt: NOW - 60_000,
        type: "timing",
        sessionId: "session-1",
        path: "/uk",
        lang: "uk",
        locale: "uk",
        release: null,
        device: "desktop",
        os: "Windows",
        connection: "4g",
        country: "UA",
        pageLoad: 5000,
        ttfb: 100,
        startRender: 700,
        lcp: 5000,
        inp: 50,
        cls: 40,
        origin: "https://variant.kharkov.com",
        message: null,
        source: null,
        status: null,
        method: null,
        ipHash: "a",
        uaHash: "b",
        browser: "Chrome",
        bot: false,
      } satisfies StoredEvent,
    ]);
    const posts: string[] = [];
    const stop = startAlerts({
      store,
      webhook: "https://hooks.test/rum",
      now: () => NOW,
      intervalMs: 60_000,
      fetch: async (url, init) => {
        posts.push(String(url));
        assert.equal(init?.method, "POST");
        return new Response(null, { status: 204 });
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.deepEqual(posts, ["https://hooks.test/rum"]);
    stop();
    store.close();
  });
});
