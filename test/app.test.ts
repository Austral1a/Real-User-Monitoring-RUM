import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import type { RequestHandler } from "express";

import { createApp, MAX_BODY_BYTES } from "../src/app";
import { loadConfig, type Config } from "../src/config";
import { countryFor, requestIp } from "../src/geo";
import type { Overview } from "../src/overview";
import { DIST_DIR } from "../src/paths";
import { openStore, type Store } from "../src/store";

const SITE = "https://variant.kharkov.com";
const NOW = Date.UTC(2026, 9, 11, 12, 0, 0);

const validBody = JSON.stringify({
  sessionId: "session-1234",
  device: "desktop",
  os: "Windows",
  connection: "4g",
  events: [
    { type: "timing", path: "/uk", pageLoad: 1500, ttfb: 90, startRender: 600 },
    { type: "js_error", path: "/uk", message: "TypeError: boom" },
  ],
});

async function startServer(
  config: Config,
  store: Store,
  vite?: RequestHandler,
) {
  const server = createApp({ config, store, now: () => NOW, vite }).listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return { server, url: `http://127.0.0.1:${port}` };
}

function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: 0,
    siteOrigins: new Set([SITE]),
    dashboardAuth: null,
    trustProxy: false,
    dbPath: ":memory:",
    hashSalt: "test-salt-0123456789",
    production: false,
    ...overrides,
  };
}

describe("POST /collect", () => {
  let store: Store;
  let url: string;
  let close: () => void;

  before(async () => {
    store = openStore(":memory:");
    const started = await startServer(testConfig(), store);
    url = started.url;
    close = () => started.server.close();
  });

  after(() => {
    close();
    store.close();
  });

  function collect(
    body: string,
    headers: Record<string, string> = { Origin: SITE },
  ) {
    return fetch(`${url}/collect`, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=UTF-8", ...headers },
      body,
    });
  }

  it("stores a valid batch with the country from CF-IPCountry", async () => {
    const response = await collect(validBody, {
      Origin: SITE,
      "CF-IPCountry": "UA",
    });
    assert.equal(response.status, 204);

    const totals = store.totals(NOW - 1000, NOW + 1000, "session");
    assert.equal(totals.sessions, 1);
    assert.equal(totals.pageLoads, 1);
    assert.equal(totals.jsErrors, 1);
    assert.deepEqual(
      store.breakdown("country", NOW - 1000, NOW + 1000, "session"),
      [{ key: "UA", sessions: 1 }],
    );
    assert.deepEqual(
      store.pageViews("origin", NOW - 1000, NOW + 1000),
      [{ key: SITE, pageLoad: 1500 }],
    );
  });

  it("groups visitors by hashed IP and user-agent across session ids", async () => {
    const from = NOW - 1000;
    const to = NOW + 1000;
    const before = store.totals(from, to, "ua-ip").sessions;
    const otherSession = JSON.stringify({
      ...JSON.parse(validBody),
      sessionId: "session-5678",
    });
    const agent = { Origin: SITE, "User-Agent": "Grouping test agent" };

    assert.equal((await collect(otherSession, agent)).status, 204);
    assert.equal(
      (
        await collect(
          JSON.stringify({
            ...JSON.parse(validBody),
            sessionId: "session-9999",
          }),
          agent,
        )
      ).status,
      204,
    );

    assert.equal(store.totals(from, to, "session").sessions, 3);
    assert.equal(store.totals(from, to, "ua-ip").sessions, before + 1);
  });

  it("rejects requests from other origins", async () => {
    assert.equal(
      (await collect(validBody, { Origin: "https://evil.test" })).status,
      403,
    );
    assert.equal((await collect(validBody, {})).status, 403);
  });

  it("rejects bodies over the size limit", async () => {
    const response = await collect("x".repeat(MAX_BODY_BYTES + 1));
    assert.equal(response.status, 413);
  });

  it("rejects invalid payloads with a reason", async () => {
    const response = await collect(JSON.stringify({ sessionId: "nope" }));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid sessionId" });
  });
});

describe("dashboard", () => {
  let store: Store;
  let url: string;
  let close: () => void;
  const auth = `Basic ${Buffer.from("admin:s3cret").toString("base64")}`;

  before(async () => {
    store = openStore(":memory:");
    store.insert([
      {
        receivedAt: NOW - 60_000,
        type: "timing",
        sessionId: "session-1",
        path: "/uk",
        lang: "uk",
        device: "mobile",
        os: "Android",
        connection: "3g",
        country: "UA",
        pageLoad: 2000,
        ttfb: 100,
        startRender: 700,
        lcp: 1800,
        inp: 50,
        cls: 40,
        origin: SITE,
        message: null,
        source: null,
        status: null,
        method: null,
        ipHash: "aaaaaaaaaaaaaaaa",
        uaHash: "bbbbbbbbbbbbbbbb",
        browser: "Chrome Mobile",
      },
    ]);
    const started = await startServer(
      testConfig({ dashboardAuth: { user: "admin", password: "s3cret" } }),
      store,
    );
    url = started.url;
    close = () => started.server.close();
  });

  after(() => {
    close();
    store.close();
  });

  it("requires basic auth", async () => {
    const response = await fetch(`${url}/api/overview`);
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate") ?? "", /^Basic/);

    const wrong = await fetch(`${url}/api/overview`, {
      headers: {
        Authorization: `Basic ${Buffer.from("admin:nope").toString("base64")}`,
      },
    });
    assert.equal(wrong.status, 401);
  });

  it("keeps the snippet public", async () => {
    const response = await fetch(`${url}/rum.js`);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /javascript/);
  });

  it("serves the Svelte dashboard from dist when it is built", async () => {
    const response = await fetch(`${url}/`, {
      headers: { Authorization: auth },
    });
    if (!existsSync(join(DIST_DIR, "index.html"))) {
      assert.equal(response.status, 503);
      return;
    }
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Real User Monitoring/);
  });

  it("serves the Vite dashboard from the same origin in development", async () => {
    const vite: RequestHandler = (_req, res) => {
      res.type("html").send("<!doctype html><title>monitor-dev</title>");
    };
    const started = await startServer(testConfig(), store, vite);
    const page = await fetch(`${started.url}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /monitor-dev/);

    const overview = await fetch(`${started.url}/api/overview`);
    assert.equal(overview.status, 200);
    assert.match(
      page.headers.get("content-security-policy") ?? "",
      /style-src 'self' 'unsafe-inline'/,
    );
    started.server.close();
  });

  it("returns the overview for the selected range", async () => {
    const response = await fetch(`${url}/api/overview?range=7d`, {
      headers: { Authorization: auth },
    });
    assert.equal(response.status, 200);

    const overview = (await response.json()) as Overview;
    assert.equal(overview.range, "7d");
    assert.equal(overview.sessionKey, "session");
    assert.equal(overview.totals.sessions, 1);
    assert.deepEqual(overview.percentiles.p50, {
      pageLoad: 2000,
      ttfb: 100,
      startRender: 700,
      lcp: 1800,
      inp: 50,
      cls: 40,
    });
    assert.deepEqual(overview.pageViews.origin, [
      { key: SITE, count: 1, pageLoad: 2000 },
    ]);
    assert.deepEqual(overview.pageViews.lang, [
      { key: "uk", count: 1, pageLoad: 2000 },
    ]);
    // NOW sits on a 6-hour boundary, so 7 days split into exactly 28 buckets.
    assert.equal(overview.series.length, 28);
    assert.deepEqual(overview.breakdowns.connection, [
      { key: "3g", sessions: 1 },
    ]);
    assert.deepEqual(overview.pageViews.path, [
      { key: "/uk", count: 1, pageLoad: 2000 },
    ]);
    assert.deepEqual(overview.pageViews.browser, [
      { key: "Chrome Mobile", count: 1, pageLoad: 2000 },
    ]);
  });

  it("rejects unknown ranges", async () => {
    const response = await fetch(`${url}/api/overview?range=1y`, {
      headers: { Authorization: auth },
    });
    assert.equal(response.status, 400);
  });

  it("counts sessions by the requested key", async () => {
    const response = await fetch(`${url}/api/overview?range=24h&by=ua-ip`, {
      headers: { Authorization: auth },
    });
    assert.equal(response.status, 200);
    const overview = (await response.json()) as Overview;
    assert.equal(overview.sessionKey, "ua-ip");
    assert.equal(overview.totals.sessions, 1);
  });

  it("filters the overview by path, origin, and lang", async () => {
    const response = await fetch(
      `${url}/api/overview?path=${encodeURIComponent("/uk")}&origin=${encodeURIComponent(SITE)}&lang=uk`,
      { headers: { Authorization: auth } },
    );
    assert.equal(response.status, 200);
    const overview = (await response.json()) as Overview;
    assert.equal(overview.path, "/uk");
    assert.equal(overview.origin, SITE);
    assert.equal(overview.lang, "uk");
    assert.equal(overview.totals.pageLoads, 1);

    const miss = await fetch(`${url}/api/overview?path=/en`, {
      headers: { Authorization: auth },
    });
    assert.equal(((await miss.json()) as Overview).totals.pageLoads, 0);
  });

  it("rejects invalid overview filters", async () => {
    const badPath = await fetch(`${url}/api/overview?path=not-a-path`, {
      headers: { Authorization: auth },
    });
    assert.equal(badPath.status, 400);
    const badOrigin = await fetch(
      `${url}/api/overview?origin=${encodeURIComponent("javascript:alert(1)")}`,
      { headers: { Authorization: auth } },
    );
    assert.equal(badOrigin.status, 400);
    const badLang = await fetch(`${url}/api/overview?lang=${encodeURIComponent("<script>")}`, {
      headers: { Authorization: auth },
    });
    assert.equal(badLang.status, 400);
  });

  it("rejects unknown session keys", async () => {
    for (const by of ["cookie", "session_id) OR 1=1 --"]) {
      const response = await fetch(
        `${url}/api/overview?by=${encodeURIComponent(by)}`,
        { headers: { Authorization: auth } },
      );
      assert.equal(response.status, 400);
    }
  });
});

describe("countryFor", () => {
  it("prefers a valid CF-IPCountry header", () => {
    assert.equal(countryFor("hu", "8.8.8.8"), "HU");
  });

  it("falls back to an IP lookup when Cloudflare sends XX or T1", () => {
    assert.equal(countryFor("XX", "8.8.8.8"), "US");
    assert.equal(countryFor("T1", "8.8.8.8"), "US");
  });

  it("falls back to an IP lookup, including IPv4-mapped addresses", () => {
    assert.equal(countryFor(undefined, "::ffff:8.8.8.8"), "US");
    assert.equal(countryFor(undefined, "127.0.0.1"), null);
  });
});

describe("requestIp", () => {
  it("prefers Cloudflare and Real-IP headers over req.ip", () => {
    assert.equal(
      requestIp(
        fakeReq({
          "cf-connecting-ip": "8.8.8.8",
          "x-real-ip": "1.1.1.1",
        }),
      ),
      "8.8.8.8",
    );
    assert.equal(requestIp(fakeReq({ "true-client-ip": "1.1.1.1" })), "1.1.1.1");
    assert.equal(requestIp(fakeReq({}, "9.9.9.9")), "9.9.9.9");
  });

  it("uses the first hop and strips brackets", () => {
    assert.equal(
      requestIp(fakeReq({ "cf-connecting-ip": "8.8.8.8, 10.0.0.1" })),
      "8.8.8.8",
    );
    assert.equal(
      requestIp(fakeReq({ "cf-connecting-ip": "[2001:4860:4860::8888]" })),
      "2001:4860:4860::8888",
    );
  });
});

describe("POST /collect country from connecting IP", () => {
  it("looks up the country when CF-IPCountry is XX", async () => {
    const store = openStore(":memory:");
    const started = await startServer(testConfig(), store);
    const response = await fetch(`${started.url}/collect`, {
      method: "POST",
      headers: {
        Origin: SITE,
        "Content-Type": "text/plain;charset=UTF-8",
        "CF-IPCountry": "XX",
        "CF-Connecting-IP": "8.8.8.8",
      },
      body: validBody,
    });
    assert.equal(response.status, 204);
    assert.deepEqual(
      store.breakdown("country", NOW - 1000, NOW + 1000, "session"),
      [{ key: "US", sessions: 1 }],
    );
    started.server.close();
    store.close();
  });
});

function fakeReq(
  headers: Record<string, string>,
  ip?: string,
): Parameters<typeof requestIp>[0] {
  return {
    get: (name: string) => headers[name.toLowerCase()],
    ip,
    socket: { remoteAddress: "127.0.0.1" },
  };
}

describe("loadConfig", () => {
  it("defaults to the local site origin in development", () => {
    const config = loadConfig({});
    assert.deepEqual([...config.siteOrigins], ["http://localhost:3000"]);
    assert.equal(config.dashboardAuth, null);
  });

  it("requires dashboard credentials, site origins, and a hash salt in production", () => {
    const production = {
      NODE_ENV: "production",
      MONITOR_SITE_ORIGINS: SITE,
      MONITOR_DASHBOARD_USER: "admin",
      MONITOR_DASHBOARD_PASSWORD: "s3cret",
      MONITOR_HASH_SALT: "production-salt-16",
    };
    assert.throws(() =>
      loadConfig({ ...production, MONITOR_SITE_ORIGINS: undefined }),
    );
    assert.throws(() =>
      loadConfig({
        ...production,
        MONITOR_DASHBOARD_USER: undefined,
        MONITOR_DASHBOARD_PASSWORD: undefined,
      }),
    );
    assert.throws(() =>
      loadConfig({ ...production, MONITOR_HASH_SALT: undefined }),
    );
    assert.throws(() =>
      loadConfig({ ...production, MONITOR_HASH_SALT: "short" }),
    );
  });

  it("rejects half-configured credentials and invalid origins", () => {
    assert.throws(() => loadConfig({ MONITOR_DASHBOARD_USER: "admin" }));
    assert.throws(() => loadConfig({ MONITOR_SITE_ORIGINS: "not a url" }));
  });

  it("normalises origins", () => {
    const config = loadConfig({
      MONITOR_SITE_ORIGINS:
        "https://variant.kharkov.com/ua/, http://localhost:3000",
    });
    assert.deepEqual([...config.siteOrigins], [SITE, "http://localhost:3000"]);
  });
});
