import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createRateLimiter } from "../src/limit";

describe("createRateLimiter", () => {
  it("allows up to max hits in the window and rejects the rest", () => {
    const now = 1_000;
    const limiter = createRateLimiter({
      max: 2,
      windowMs: 1_000,
      now: () => now,
    });
    assert.equal(limiter.allow("a"), true);
    assert.equal(limiter.allow("a"), true);
    assert.equal(limiter.allow("a"), false);
    assert.equal(limiter.allow("b"), true);
  });

  it("admits new hits after the window slides", () => {
    let now = 1_000;
    const limiter = createRateLimiter({
      max: 1,
      windowMs: 1_000,
      now: () => now,
    });
    assert.equal(limiter.allow("a"), true);
    assert.equal(limiter.allow("a"), false);
    now = 2_001;
    assert.equal(limiter.allow("a"), true);
  });
});
