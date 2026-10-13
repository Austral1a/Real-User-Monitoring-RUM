import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  percentile,
  rankPageViews,
  rankSites,
  summarizeTimings,
  timingSeries,
  vitalScore,
} from "../src/overview";
import type { TimingRow } from "../src/store";

const HOUR = 60 * 60 * 1000;

function row(
  receivedAt: number,
  pageLoad: number | null,
  ttfb: number | null = null,
): TimingRow {
  return {
    receivedAt,
    pageLoad,
    ttfb,
    startRender: null,
    lcp: null,
    inp: null,
    cls: null,
  };
}

describe("percentile", () => {
  it("uses the nearest rank", () => {
    assert.equal(percentile([5, 1, 4, 2, 3], 0.5), 3);
    assert.equal(percentile([1, 2, 3, 4], 0.5), 2);
    assert.equal(percentile([1, 2, 3, 4], 0.75), 3);
    assert.equal(percentile([7], 0.5), 7);
  });

  it("returns null without samples", () => {
    assert.equal(percentile([], 0.5), null);
  });
});

describe("summarizeTimings", () => {
  it("ignores missing measurements per metric", () => {
    const summary = summarizeTimings([
      row(0, 100, null),
      row(0, 300, 50),
      row(0, null, 70),
    ]);
    assert.deepEqual(summary, {
      pageLoad: 100,
      ttfb: 50,
      startRender: null,
      lcp: null,
      inp: null,
      cls: null,
    });
  });

  it("reports p75 and p95 independently", () => {
    const rows = [1, 2, 3, 4].map((pageLoad) => row(0, pageLoad));
    assert.equal(summarizeTimings(rows, 0.75).pageLoad, 3);
    assert.equal(summarizeTimings(rows, 0.95).pageLoad, 4);
  });
});

describe("rankPageViews", () => {
  it("ranks groups by count and reports the median load", () => {
    const ranked = rankPageViews(
      [
        { key: "/uk", pageLoad: 100 },
        { key: "/en", pageLoad: 400 },
        { key: "/uk", pageLoad: 300 },
        { key: "/uk", pageLoad: 200 },
        { key: "/en", pageLoad: null },
      ],
      10,
    );
    assert.deepEqual(ranked, [
      { key: "/uk", count: 3, pageLoad: 200 },
      { key: "/en", count: 2, pageLoad: 400 },
    ]);
  });

  it("keeps only the top rows", () => {
    const ranked = rankPageViews(
      [
        { key: "/a", pageLoad: 1 },
        { key: "/b", pageLoad: 1 },
        { key: "/a", pageLoad: 2 },
      ],
      1,
    );
    assert.deepEqual(ranked, [{ key: "/a", count: 2, pageLoad: 1 }]);
  });
});

describe("timingSeries", () => {
  it("buckets rows by time and keeps empty buckets", () => {
    const from = 10 * HOUR + 15 * 60 * 1000;
    const to = from + 3 * HOUR;
    const series = timingSeries(
      [
        row(10 * HOUR + 20 * 60 * 1000, 1000),
        row(10 * HOUR + 50 * 60 * 1000, 3000),
        row(12 * HOUR, 500),
      ],
      from,
      to,
      HOUR,
    );

    assert.deepEqual(
      series.map(({ start, samples, pageLoad }) => ({
        start,
        samples,
        pageLoad,
      })),
      [
        { start: 10 * HOUR, samples: 2, pageLoad: 3000 },
        { start: 11 * HOUR, samples: 0, pageLoad: null },
        { start: 12 * HOUR, samples: 1, pageLoad: 500 },
        { start: 13 * HOUR, samples: 0, pageLoad: null },
      ],
    );
  });
});

describe("vitalScore", () => {
  it("buckets samples with Google LCP thresholds", () => {
    assert.deepEqual(vitalScore([2000, 3000, 5000], 2500, 4000), {
      good: 1,
      ni: 1,
      poor: 1,
      n: 3,
    });
  });
});

describe("rankSites", () => {
  it("attaches p75 LCP per origin", () => {
    const sites = rankSites(
      [
        {
          origin: "https://a.test",
          sessions: 2,
          pageLoads: 2,
          jsErrors: 1,
        },
        {
          origin: "https://b.test",
          sessions: 1,
          pageLoads: 1,
          jsErrors: 0,
        },
      ],
      [
        { origin: "https://a.test", lcp: 1000 },
        { origin: "https://a.test", lcp: 4000 },
        { origin: "https://b.test", lcp: 2000 },
      ],
    );
    assert.equal(sites[0]?.origin, "https://a.test");
    assert.equal(sites[0]?.lcp, 4000);
    assert.equal(sites[1]?.lcp, 2000);
  });
});
