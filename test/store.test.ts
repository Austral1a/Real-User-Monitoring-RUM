import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { openStore, type Store } from "../src/store";
import type { StoredEvent } from "../src/types";

const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);
const WINDOW = { from: NOW - 60_000, to: NOW + 60_000 };

function event(overrides: Partial<StoredEvent>): StoredEvent {
  return {
    receivedAt: NOW,
    type: "timing",
    sessionId: "session-1",
    path: "/uk",
    lang: "uk",
    device: "desktop",
    os: "macOS",
    connection: "4g",
    country: "UA",
    pageLoad: 1000,
    ttfb: 80,
    startRender: 400,
    lcp: 1600,
    inp: 80,
    cls: 50,
    origin: "https://variant.kharkov.com",
    message: null,
    source: null,
    status: null,
    method: null,
    ipHash: "ip-a",
    uaHash: "ua-a",
    browser: "Chrome",
    bot: false,
    ...overrides,
  };
}

describe("session grouping", () => {
  let store: Store;
  afterEach(() => store.close());

  function counts() {
    return {
      session: store.totals(WINDOW.from, WINDOW.to, "session").sessions,
      ua: store.totals(WINDOW.from, WINDOW.to, "ua").sessions,
      ip: store.totals(WINDOW.from, WINDOW.to, "ip").sessions,
      "ua-ip": store.totals(WINDOW.from, WINDOW.to, "ua-ip").sessions,
    };
  }

  it("counts two session ids as one visitor when the user-agent matches", () => {
    store = openStore(":memory:");
    store.insert([
      event({ sessionId: "tab-1", uaHash: "chrome", ipHash: "home" }),
      event({ sessionId: "tab-2", uaHash: "chrome", ipHash: "office" }),
    ]);
    assert.deepEqual(counts(), { session: 2, ua: 1, ip: 2, "ua-ip": 2 });
  });

  it("counts two session ids as one visitor when the IP matches", () => {
    store = openStore(":memory:");
    store.insert([
      event({ sessionId: "tab-1", uaHash: "chrome", ipHash: "home" }),
      event({ sessionId: "tab-2", uaHash: "safari", ipHash: "home" }),
    ]);
    assert.deepEqual(counts(), { session: 2, ua: 2, ip: 1, "ua-ip": 2 });
  });

  it("counts one visitor only when both hashes match", () => {
    store = openStore(":memory:");
    store.insert([
      event({ sessionId: "tab-1", uaHash: "chrome", ipHash: "home" }),
      event({ sessionId: "tab-2", uaHash: "chrome", ipHash: "home" }),
    ]);
    assert.deepEqual(counts(), { session: 2, ua: 1, ip: 1, "ua-ip": 1 });
  });

  it("falls back to the session id when hashes are missing", () => {
    store = openStore(":memory:");
    store.insert([
      event({ sessionId: "old-1", uaHash: null, ipHash: null }),
      event({ sessionId: "old-2", uaHash: null, ipHash: null }),
    ]);
    assert.deepEqual(counts(), { session: 2, ua: 2, ip: 2, "ua-ip": 2 });
  });
});

describe("page loads and filters", () => {
  let store: Store;
  afterEach(() => store.close());

  it("does not count vitals-only timing rows as page loads", () => {
    store = openStore(":memory:");
    store.insert([
      event({ pageLoad: 1000 }),
      event({
        pageLoad: null,
        ttfb: null,
        startRender: null,
        lcp: 1800,
        inp: 40,
        cls: 12,
      }),
    ]);
    const totals = store.totals(WINDOW.from, WINDOW.to, "session");
    assert.equal(totals.pageLoads, 1);
    assert.equal(store.timings(WINDOW.from, WINDOW.to).length, 2);
  });

  it("filters reads by bot", () => {
    store = openStore(":memory:");
    store.insert([
      event({ sessionId: "human", bot: false }),
      event({ sessionId: "crawler", bot: true, path: "/en" }),
    ]);
    assert.equal(
      store.totals(WINDOW.from, WINDOW.to, "session", { bot: false }).sessions,
      1,
    );
    assert.equal(
      store.totals(WINDOW.from, WINDOW.to, "session", { bot: true }).sessions,
      1,
    );
    assert.equal(store.totals(WINDOW.from, WINDOW.to, "session").sessions, 2);
  });

  it("filters reads by path, origin, and lang", () => {
    store = openStore(":memory:");
    store.insert([
      event({ path: "/uk", origin: "https://a.test", lang: "uk" }),
      event({
        path: "/en",
        origin: "https://b.test",
        lang: "en",
        sessionId: "session-2",
      }),
    ]);
    const uk = store.totals(WINDOW.from, WINDOW.to, "session", { path: "/uk" });
    assert.equal(uk.pageLoads, 1);
    assert.equal(
      store.pageViews("origin", WINDOW.from, WINDOW.to, { lang: "en" })[0]
        ?.key,
      "https://b.test",
    );
    assert.equal(
      store.breakdown("device", WINDOW.from, WINDOW.to, "session", {
        origin: "https://a.test",
      }).length,
      1,
    );
  });
});
