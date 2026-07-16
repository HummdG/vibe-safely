import { describe, it, expect } from "vitest";
import { assertPublicUrl } from "../safety";

describe("assertPublicUrl (SSRF guard)", () => {
  it("accepts public URLs and defaults to https", () => {
    expect(assertPublicUrl("example.com").hostname).toBe("example.com");
    expect(assertPublicUrl("example.com").protocol).toBe("https:");
    expect(assertPublicUrl("https://foo.app/path?x=1").protocol).toBe("https:");
  });

  it("rejects internal/private/metadata targets and non-http schemes", () => {
    const bad = [
      "localhost",
      "http://127.0.0.1",
      "http://10.0.0.5",
      "http://192.168.1.10",
      "http://169.254.169.254", // cloud metadata
      "http://172.16.0.1",
      "http://172.31.255.255",
      "http://metadata.google.internal",
      "http://api.internal",
      "http://foo.local",
      "ftp://example.com",
      "file:///etc/passwd",
    ];
    for (const b of bad) {
      expect(() => assertPublicUrl(b), b).toThrow();
    }
  });

  it("allows 172.x addresses outside the 16–31 private block", () => {
    expect(assertPublicUrl("http://172.15.0.1").hostname).toBe("172.15.0.1");
    expect(assertPublicUrl("http://172.32.0.1").hostname).toBe("172.32.0.1");
  });

  it("only allows localhost when the dev escape hatch is explicitly set", () => {
    // blocked by default
    expect(() => assertPublicUrl("http://localhost:4173")).toThrow();
    const prev = process.env.VIBESAFELY_ALLOW_LOCAL;
    process.env.VIBESAFELY_ALLOW_LOCAL = "1";
    try {
      expect(assertPublicUrl("http://localhost:4173").hostname).toBe("localhost");
      expect(assertPublicUrl("http://127.0.0.1:4173").hostname).toBe("127.0.0.1");
    } finally {
      if (prev === undefined) delete process.env.VIBESAFELY_ALLOW_LOCAL;
      else process.env.VIBESAFELY_ALLOW_LOCAL = prev;
    }
  });
});
