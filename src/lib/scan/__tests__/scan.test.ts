import { describe, it, expect } from "vitest";
import { scanForSecrets } from "../secrets";
import { detectSupabase } from "../detect";
import { scoreFindings, runScan, UnreachableTargetError } from "../runner";
import type { Finding, FetchLike } from "../types";

// --- helpers: build fake but structurally-valid JWTs for Supabase keys ---
function b64url(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}
function makeJwt(payload: Record<string, unknown>): string {
  return `${b64url({ alg: "HS256", typ: "JWT" })}.${b64url(payload)}.signaturesignature123`;
}

const REF = "abcdefghijklmnopqrst"; // 20-char Supabase project ref
const ANON = makeJwt({ ref: REF, role: "anon" });
const SERVICE = makeJwt({ ref: REF, role: "service_role" });
const STRIPE = "sk_live_" + "a".repeat(24);

describe("scanForSecrets", () => {
  it("flags dangerous secrets and masks evidence, ignores the safe anon key", () => {
    const text = `const s="${STRIPE}"; const svc="${SERVICE}"; const anon="${ANON}";`;
    const hits = scanForSecrets(text);
    const types = hits.map((h) => h.type);
    expect(types).toContain("Stripe secret key");
    expect(types).toContain("Supabase service_role key");
    // the safe anon key on its own must NOT be reported as a secret
    const onlyAnon = scanForSecrets(`const anon="${ANON}";`);
    expect(onlyAnon.length).toBe(0);
    // evidence is masked, not the raw secret
    const stripeHit = hits.find((h) => h.type === "Stripe secret key")!;
    expect(stripeHit.evidence).toContain("…");
    expect(stripeHit.evidence).not.toEqual(STRIPE);
  });
});

describe("detectSupabase", () => {
  it("extracts the project url + anon key", () => {
    const info = detectSupabase(`x https://${REF}.supabase.co y ${ANON} z ${SERVICE}`);
    expect(info?.ref).toBe(REF);
    expect(info?.url).toBe(`https://${REF}.supabase.co`);
    expect(info?.anonKey).toBe(ANON);
  });
});

describe("scoreFindings", () => {
  it("penalizes by severity and grades", () => {
    const findings: Finding[] = [
      { checkKey: "a", title: "", severity: "critical", passed: false, detail: "", fix: "" },
      { checkKey: "b", title: "", severity: "medium", passed: false, detail: "", fix: "" },
      { checkKey: "c", title: "", severity: "pass", passed: true, detail: "", fix: "" },
    ];
    const { score, grade, counts } = scoreFindings(findings);
    expect(score).toBe(100 - 40 - 8); // 52
    expect(grade).toBe("D");
    expect(counts.critical).toBe(1);
    expect(counts.medium).toBe(1);
  });
});

describe("runScan (integration with stubbed fetch)", () => {
  it("grades a vulnerable app F and finds the critical issues", async () => {
    const vulnHtml =
      `<!doctype html><html><head><script src="/app.js"></script></head><body>` +
      `const supabaseUrl="https://${REF}.supabase.co";const key="${ANON}";` +
      `const svc="${SERVICE}";const stripe="${STRIPE}";</body></html>`;

    const fetchImpl: FetchLike = async (url) => {
      const u = url.toString();
      if (u === "https://vuln.test" || u === "https://vuln.test/")
        return new Response(vulnHtml, { status: 200, headers: { "content-type": "text/html" } });
      if (u.endsWith("/app.js")) return new Response("", { status: 200 });
      if (u.includes("/.env"))
        return new Response("SECRET_KEY=abc123\nDATABASE_URL=postgres://x\n", {
          status: 200,
          headers: { "content-type": "text/plain" },
        });
      if (u.includes("/rest/v1/users"))
        return new Response(JSON.stringify([{ id: 1 }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      if (u.includes("/rest/v1/")) return new Response("", { status: 404 });
      if (u.includes("/storage/v1/bucket")) return new Response("", { status: 401 });
      return new Response("", { status: 404 });
    };

    const result = await runScan({
      url: "vuln.test",
      ownerConfirmed: true,
      fetchImpl,
      now: () => "2026-07-04T00:00:00Z",
    });

    expect(result.grade).toBe("F");
    expect(result.counts.critical).toBeGreaterThanOrEqual(3);
    const failed = result.findings.filter((f) => !f.passed);
    expect(failed.some((f) => /service_role/i.test(f.title))).toBe(true);
    expect(failed.some((f) => /"users"|users table|users/i.test(f.title))).toBe(true);
    expect(failed.some((f) => /env/i.test(f.title))).toBe(true);
  });

  it("grades a clean, well-configured app A", async () => {
    const cleanFetch: FetchLike = async (url) => {
      const u = url.toString();
      if (u === "https://clean.test" || u === "https://clean.test/")
        return new Response("<!doctype html><html><body>hi</body></html>", {
          status: 200,
          headers: {
            "content-type": "text/html",
            "content-security-policy": "default-src 'self'",
            "strict-transport-security": "max-age=63072000",
            "x-frame-options": "DENY",
            "x-content-type-options": "nosniff",
            "referrer-policy": "strict-origin-when-cross-origin",
            "permissions-policy": "geolocation=()",
          },
        });
      return new Response("", { status: 404 });
    };

    const clean = await runScan({
      url: "clean.test",
      ownerConfirmed: false,
      fetchImpl: cleanFetch,
      now: () => "t",
    });
    expect(clean.score).toBe(100);
    expect(clean.grade).toBe("A");
  });
});

describe("runScan reachability", () => {
  it("refuses to grade a site it cannot connect to", async () => {
    const throwingFetch: FetchLike = async () => {
      throw new TypeError("fetch failed (ENOTFOUND)");
    };
    await expect(
      runScan({
        url: "aefsdfsdf",
        ownerConfirmed: false,
        fetchImpl: throwingFetch,
        now: () => "t",
      }),
    ).rejects.toBeInstanceOf(UnreachableTargetError);
  });

  it("refuses to grade a homepage that returns a non-2xx status", async () => {
    const notFoundFetch: FetchLike = async () =>
      new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } });
    await expect(
      runScan({
        url: "dead.test",
        ownerConfirmed: false,
        fetchImpl: notFoundFetch,
        now: () => "t",
      }),
    ).rejects.toBeInstanceOf(UnreachableTargetError);
  });

  it("refuses to grade a malformed URL instead of crashing", async () => {
    await expect(
      runScan({ url: "not a real site at all", ownerConfirmed: false, now: () => "t" }),
    ).rejects.toBeInstanceOf(UnreachableTargetError);
  });
});

describe("grade model: header hygiene never lowers the grade", () => {
  it("grades a clean site with missing headers A/100, surfacing them as hardening", async () => {
    // A real, reachable site with no leaked secrets / DB / files, but no security
    // headers at all (the google.com situation). It must NOT be dinged below A.
    const bareFetch: FetchLike = async (url) => {
      const u = url.toString();
      if (u === "https://bare.test" || u === "https://bare.test/")
        return new Response("<!doctype html><html><body>hello</body></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      return new Response("", { status: 404 });
    };

    const r = await runScan({
      url: "bare.test",
      ownerConfirmed: false,
      fetchImpl: bareFetch,
      now: () => "t",
    });

    expect(r.grade).toBe("A");
    expect(r.score).toBe(100);
    expect(r.counts).toEqual({ critical: 0, high: 0, medium: 0, low: 0 });
    expect(r.hardeningCount ?? 0).toBeGreaterThanOrEqual(4);
    // the header gaps exist as findings, just categorized as hardening
    expect(r.findings.some((f) => !f.passed && f.category === "hardening")).toBe(true);
  });
});
