import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createClientHasher } from "../src/identity";

const hasher = createClientHasher("test-salt-0123456789");

describe("createClientHasher", () => {
  it("hashes the same IP and user-agent to the same values", () => {
    const first = hasher("203.0.113.10", "Mozilla/5.0");
    const second = hasher("203.0.113.10", "Mozilla/5.0");
    assert.equal(first.ipHash, second.ipHash);
    assert.equal(first.uaHash, second.uaHash);
    assert.equal(first.ipHash?.length, 16);
    assert.equal(first.uaHash?.length, 16);
  });

  it("treats IPv4-mapped addresses as the same IP", () => {
    assert.equal(
      hasher("::ffff:203.0.113.10", "Mozilla/5.0").ipHash,
      hasher("203.0.113.10", "Mozilla/5.0").ipHash,
    );
  });

  it("changes the IP hash when the address changes, and the UA hash when the agent changes", () => {
    const base = hasher("203.0.113.10", "Mozilla/5.0");
    assert.notEqual(hasher("203.0.113.11", "Mozilla/5.0").ipHash, base.ipHash);
    assert.notEqual(hasher("203.0.113.10", "Other/1.0").uaHash, base.uaHash);
  });

  it("never stores the raw IP or user-agent", () => {
    const hashes = hasher("203.0.113.10", "Mozilla/5.0 SecretToken");
    assert.ok(hashes.ipHash);
    assert.ok(hashes.uaHash);
    assert.doesNotMatch(hashes.ipHash, /203|113/);
    assert.doesNotMatch(hashes.uaHash, /Mozilla|SecretToken/i);
  });

  it("returns null when the IP or user-agent is missing", () => {
    assert.deepEqual(hasher(undefined, undefined), {
      ipHash: null,
      uaHash: null,
    });
    assert.equal(hasher("203.0.113.10", "   ").uaHash, null);
  });

  it("produces different hashes when the salt changes", () => {
    const other = createClientHasher("another-salt-012345");
    const a = hasher("203.0.113.10", "Mozilla/5.0");
    const b = other("203.0.113.10", "Mozilla/5.0");
    assert.notEqual(a.ipHash, b.ipHash);
    assert.notEqual(a.uaHash, b.uaHash);
  });
});
