import { describe, it, expect } from "vitest";
import { hashApiKey, generateApiKey, looksLikeApiKey, API_KEY_PREFIX } from "./api-keys";

describe("hashApiKey", () => {
  it("is a deterministic sha256 hex digest", () => {
    const a = hashApiKey("vsk_example");
    expect(a).toBe(hashApiKey("vsk_example"));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("generateApiKey", () => {
  it("returns a vsk_ plaintext, its matching hash, and a display prefix", () => {
    const { plaintext, hash, prefix } = generateApiKey();
    expect(plaintext.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(plaintext.length).toBeGreaterThan(20);
    expect(hash).toBe(hashApiKey(plaintext));
    expect(hash).not.toBe(plaintext); // never store the plaintext
    expect(prefix).toBe(plaintext.slice(0, 12));
  });

  it("generates unique keys", () => {
    expect(generateApiKey().plaintext).not.toBe(generateApiKey().plaintext);
  });
});

describe("looksLikeApiKey", () => {
  it("accepts a well-formed key and rejects everything else", () => {
    expect(looksLikeApiKey(`${API_KEY_PREFIX}${"a".repeat(30)}`)).toBe(true);
    expect(looksLikeApiKey("nope")).toBe(false);
    expect(looksLikeApiKey("vsk_short")).toBe(false);
    expect(looksLikeApiKey(null)).toBe(false);
    expect(looksLikeApiKey(undefined)).toBe(false);
  });
});
