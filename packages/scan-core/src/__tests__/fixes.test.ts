import { describe, it, expect } from "vitest";
import { detectStack, buildFixPrompt, attachFixes } from "../fixes";
import type { ScanContext, Finding } from "../types";

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

const vuln = (over: Partial<Finding> = {}): Finding => ({
  checkKey: "cookie-security",
  title: "Session cookie readable by JavaScript",
  severity: "medium",
  category: "vulnerability",
  passed: false,
  detail: "The session cookie has no HttpOnly flag.",
  fix: "Set HttpOnly on session cookies.",
  ...over,
});

describe("detectStack", () => {
  it("detects Next.js from bundle URLs and Supabase from context", () => {
    const s = detectStack(
      ctx({
        bundles: [{ url: "https://x/_next/static/chunks/a.js", content: "" }],
        supabase: { url: "https://r.supabase.co", ref: "r" },
      }),
    );
    expect(s).toContain("Next.js");
    expect(s).toContain("Supabase");
  });

  it("is empty for a plain static site", () => {
    expect(detectStack(ctx({}))).toEqual([]);
  });
});

describe("buildFixPrompt", () => {
  it("embeds the specific finding and the detected stack", () => {
    const p = buildFixPrompt(vuln(), ["Next.js", "Supabase"]);
    expect(p).toContain("Next.js, Supabase");
    expect(p).toContain("Session cookie readable by JavaScript");
    expect(p).toContain("Set HttpOnly on session cookies.");
  });
});

describe("attachFixes", () => {
  it("adds a fix prompt and an example patch to failing findings", () => {
    const [f] = attachFixes([vuln()], ["Next.js"]);
    expect(f.fixPrompt).toBeTruthy();
    expect(f.fixPatch?.after).toContain("httpOnly");
  });

  it("uses a CORS-specific example for a CORS finding", () => {
    const [f] = attachFixes(
      [vuln({ checkKey: "security-headers", title: "Unsafe CORS configuration" })],
      [],
    );
    expect(f.fixPatch?.after).toMatch(/allow-list|origin/i);
  });

  describe("exposed-secret patches match the detected secret", () => {
    const secret = (secretType: string, title = `${secretType} exposed in client bundle`): Finding =>
      vuln({ checkKey: "bundle-secrets", title, severity: "critical", secretType });

    it("gives a Stripe key a Stripe patch, not an OpenAI one", () => {
      const [f] = attachFixes([secret("Stripe secret key")], []);
      expect(f.fixPatch?.after).toMatch(/STRIPE_SECRET_KEY/);
      expect(`${f.fixPatch?.before}${f.fixPatch?.after}`).not.toMatch(/OpenAI|OPENAI/);
    });

    it("gives an AWS key an AWS/IAM patch", () => {
      const [f] = attachFixes([secret("AWS access key id")], []);
      expect(`${f.fixPatch?.before}${f.fixPatch?.after}`).toMatch(/S3Client|IAM/);
    });

    it("gives a Supabase service_role key the anon-key swap", () => {
      const [f] = attachFixes([secret("Supabase service_role key")], []);
      expect(f.fixPatch?.after).toMatch(/SUPABASE_ANON_KEY/);
    });

    it("renders an AI provider key in that vendor's SDK", () => {
      const [f] = attachFixes([secret("Anthropic API key")], []);
      expect(f.fixPatch?.after).toMatch(/Anthropic/);
      expect(f.fixPatch?.after).toMatch(/ANTHROPIC_API_KEY/);
    });

    it("falls back to a generic server-env patch for an unknown secret type", () => {
      const [f] = attachFixes([secret("Some new key", "Some new key exposed in client bundle")], []);
      expect(f.fixPatch?.after).toMatch(/process\.env/);
    });
  });

  it("leaves passing findings untouched", () => {
    const pass: Finding = {
      checkKey: "x",
      title: "ok",
      severity: "pass",
      passed: true,
      detail: "",
      fix: "",
    };
    const [f] = attachFixes([pass], []);
    expect(f.fixPrompt).toBeUndefined();
  });
});
