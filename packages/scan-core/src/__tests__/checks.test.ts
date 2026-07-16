import { describe, it, expect } from "vitest";
import { securityHeaders } from "../checks/securityHeaders";
import { sourceMaps } from "../checks/sourceMaps";
import { cookieSecurity } from "../checks/cookieSecurity";
import { insecureStorage } from "../checks/insecureStorage";
import { runScan } from "../runner";
import type { ScanContext, FetchLike, Finding } from "../types";

function ctx(overrides: Partial<ScanContext>): ScanContext {
  return {
    url: "https://x",
    origin: "https://x",
    domain: "x",
    ownerConfirmed: false,
    status: 200,
    reachable: true,
    headers: {},
    cookies: [],
    html: "",
    bundles: [],
    fetchImpl: async () => new Response("", { status: 404 }),
    ...overrides,
  };
}

const HARDENED: Record<string, string> = {
  "content-security-policy": "default-src 'self'",
  "strict-transport-security": "max-age=63072000; includeSubDomains",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "geolocation=()",
};

async function run(check: typeof securityHeaders, c: ScanContext): Promise<Finding[]> {
  const r = await check.run(c);
  return Array.isArray(r) ? r : [r];
}

describe("securityHeaders (hardening + accuracy)", () => {
  it("passes a fully hardened site with no findings", async () => {
    const findings = await run(securityHeaders, ctx({ headers: { ...HARDENED } }));
    expect(findings.every((f) => f.passed)).toBe(true);
  });

  it("emits header gaps as hardening recommendations, never vulnerabilities", async () => {
    // Vercel default: HSTS present, but no CSP / XFO / XCTO / Referrer / Permissions.
    const findings = await run(
      securityHeaders,
      ctx({ headers: { "strict-transport-security": "max-age=63072000" } }),
    );
    const failing = findings.filter((f) => !f.passed);
    expect(failing.length).toBeGreaterThanOrEqual(4);
    // Every header gap is a hardening tip, so none of them can affect the grade.
    expect(failing.every((f) => f.category === "hardening")).toBe(true);
    const titles = failing.map((f) => f.title);
    expect(titles).toContain("Add a Content-Security-Policy");
    expect(titles).toContain("Add a Referrer-Policy header");
  });

  it("treats a report-only CSP as present (no false 'missing CSP')", async () => {
    const findings = await run(
      securityHeaders,
      ctx({
        headers: {
          ...HARDENED,
          "content-security-policy": "",
          "content-security-policy-report-only":
            "script-src 'nonce-abc' 'strict-dynamic' 'unsafe-inline' https:; object-src 'none'",
        },
      }),
    );
    const titles = findings.filter((f) => !f.passed).map((f) => f.title);
    expect(titles).not.toContain("Add a Content-Security-Policy");
    // recognized, but we suggest enforcing it
    expect(titles).toContain("Enforce your Content-Security-Policy");
    // a nonce + strict-dynamic policy is NOT "weak" despite listing unsafe-inline
    expect(titles).not.toContain("Tighten your Content-Security-Policy");
  });

  it("flags a genuinely weak CSP (unsafe-inline with no nonce/strict-dynamic)", async () => {
    const findings = await run(
      securityHeaders,
      ctx({ headers: { ...HARDENED, "content-security-policy": "default-src 'self' 'unsafe-inline'" } }),
    );
    expect(findings.some((f) => f.title === "Tighten your Content-Security-Policy")).toBe(true);
  });

  it("classifies wildcard CORS with credentials as a high VULNERABILITY", async () => {
    const findings = await run(
      securityHeaders,
      ctx({
        headers: {
          ...HARDENED,
          "access-control-allow-origin": "*",
          "access-control-allow-credentials": "true",
        },
      }),
    );
    const cors = findings.find((f) => /CORS/i.test(f.title));
    expect(cors?.severity).toBe("high");
    expect(cors?.category).toBe("vulnerability");
  });
});

describe("sourceMaps", () => {
  const bundles = [{ url: "https://x/_next/static/chunks/main.js?dpl=abc", content: "" }];

  it("flags a publicly reachable source map", async () => {
    const fetchImpl: FetchLike = async (url) => {
      if (url.toString().endsWith(".map"))
        return new Response('{"version":3,"sources":["a.ts"],"mappings":"AAAA"}', { status: 200 });
      return new Response("", { status: 404 });
    };
    const findings = await run(sourceMaps, ctx({ bundles, fetchImpl }));
    expect(findings.some((f) => !f.passed && /source map/i.test(f.title))).toBe(true);
  });

  it("passes when .map returns 404", async () => {
    const fetchImpl: FetchLike = async () => new Response("nope", { status: 404 });
    const findings = await run(sourceMaps, ctx({ bundles, fetchImpl }));
    expect(findings.every((f) => f.passed)).toBe(true);
  });
});

describe("deepChecksAvailable nudge", () => {
  const REF = "abcdefghijklmnopqrst";
  const html = `<html><body>const u="https://${REF}.supabase.co";</body></html>`;
  const fetchImpl: FetchLike = async (url) => {
    const u = url.toString();
    if (u === "https://app.test" || u === "https://app.test/")
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    return new Response("", { status: 404 });
  };

  it("is true when a backend is detected but ownership is not confirmed", async () => {
    const r = await runScan({ url: "app.test", ownerConfirmed: false, fetchImpl, now: () => "t" });
    expect(r.deepChecksAvailable).toBe(true);
  });

  it("is false once ownership is confirmed (deep checks actually run)", async () => {
    const r = await runScan({ url: "app.test", ownerConfirmed: true, fetchImpl, now: () => "t" });
    expect(r.deepChecksAvailable).toBe(false);
  });
});

describe("scan coverage & grading (honest reporting)", () => {
  const b64url = (o: unknown) =>
    Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = (p: Record<string, unknown>) =>
    `${b64url({ alg: "HS256" })}.${b64url(p)}.signaturesignature123`;
  const REF = "abcdefghijklmnopqrst";
  const ANON = jwt({ ref: REF, role: "anon" });

  const noBackend: FetchLike = async (url) => {
    const u = url.toString();
    if (u === "https://c.test" || u === "https://c.test/")
      return new Response("<html><body>hi</body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    return new Response("", { status: 404 });
  };

  const lockedSupabase: FetchLike = async (url) => {
    const u = url.toString();
    if (u === "https://s.test" || u === "https://s.test/")
      return new Response(
        `<html><body>const url="https://${REF}.supabase.co";const key="${ANON}";</body></html>`,
        { status: 200, headers: { "content-type": "text/html" } },
      );
    if (u.includes("/rest/v1/") || u.includes("/storage/v1/")) return new Response("", { status: 401 });
    return new Response("", { status: 404 });
  };

  it("surface scan: deep checks are not-tested and no grade is earned", async () => {
    const r = await runScan({ url: "c.test", ownerConfirmed: false, fetchImpl: noBackend, now: () => "t" });
    expect(r.scanDepth).toBe("surface");
    expect(r.graded).toBe(false);
    const notTested = r.coverage.filter((c) => c.status === "not-tested").map((c) => c.title);
    expect(notTested).toContain("Open database tables (Supabase RLS)");
    expect(notTested).toContain("Open redirect");
    expect(notTested.length).toBe(6);
    expect(r.coverage.find((c) => c.title === "Exposed secrets in client code")?.status).toBe("tested");
  });

  it("full scan with NO backend: deep checks are not-applicable and NO grade is earned", async () => {
    const r = await runScan({ url: "c.test", ownerConfirmed: true, fetchImpl: noBackend, now: () => "t" });
    expect(r.scanDepth).toBe("full");
    // THE FIX: vacuous "nothing to test" passes must not earn a grade.
    expect(r.graded).toBe(false);
    const na = r.coverage.filter((c) => c.status === "not-applicable").map((c) => c.title);
    expect(na).toContain("Open database tables (Supabase RLS)");
    expect(na).toContain("Prompt injection");
    expect(na).toContain("API content-type / XXE");
    expect(na.length).toBe(6);
    expect(r.findings.some((f) => f.checkKey === "supabase-rls" && f.applicable === false)).toBe(true);
  });

  it("full scan that actually probes a locked-down backend: grade IS earned", async () => {
    const r = await runScan({ url: "s.test", ownerConfirmed: true, fetchImpl: lockedSupabase, now: () => "t" });
    expect(r.graded).toBe(true);
    expect(r.coverage.find((c) => c.title === "Open database tables (Supabase RLS)")?.status).toBe("tested");
    expect(r.grade).toBe("A"); // probed, nothing readable → clean
  });
});

describe("cookieSecurity", () => {
  it("flags a session cookie missing HttpOnly as a vulnerability", async () => {
    const f = await run(cookieSecurity, ctx({ cookies: ["session=abc; Path=/"] }));
    const v = f.find((x) => /readable by JavaScript/i.test(x.title));
    expect(v?.category).toBe("vulnerability");
    expect(v?.severity).toBe("medium");
  });

  it("passes a fully-flagged session cookie", async () => {
    const f = await run(cookieSecurity, ctx({ cookies: ["session=abc; HttpOnly; Secure; SameSite=Lax"] }));
    expect(f.every((x) => x.passed)).toBe(true);
  });

  it("treats a generic cookie's missing SameSite as hardening, not a vuln", async () => {
    const f = await run(cookieSecurity, ctx({ cookies: ["theme=dark; HttpOnly; Secure"] }));
    const s = f.find((x) => /SameSite/i.test(x.title));
    expect(s?.category).toBe("hardening");
  });

  it("passes when no cookies are set", async () => {
    const f = await run(cookieSecurity, ctx({ cookies: [] }));
    expect(f.every((x) => x.passed)).toBe(true);
  });
});

describe("insecureStorage", () => {
  it("flags an auth token written to localStorage as a vulnerability", async () => {
    const f = await run(
      insecureStorage,
      ctx({ bundles: [{ url: "u", content: `localStorage.setItem("access_token", t)` }] }),
    );
    expect(f.some((x) => !x.passed && x.category === "vulnerability")).toBe(true);
  });

  it("ignores non-sensitive storage keys", async () => {
    const f = await run(
      insecureStorage,
      ctx({ bundles: [{ url: "u", content: `localStorage.setItem("theme", "dark")` }] }),
    );
    expect(f.every((x) => x.passed)).toBe(true);
  });
});
