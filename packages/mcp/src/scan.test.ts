import { describe, it, expect } from "vitest";
import { decideMcpScan, ensureScheme, formatReport } from "./scan";
import type { ScanResult } from "@vibesafely/scan-core";

describe("decideMcpScan", () => {
  it("defaults to a surface scan", () => {
    expect(decideMcpScan({ mode: undefined, hasApiKey: false }).tier).toBe("surface");
    expect(decideMcpScan({ mode: "surface", hasApiKey: true }).tier).toBe("surface");
  });

  it("runs full when full is requested and a key is present", () => {
    expect(decideMcpScan({ mode: "full", hasApiKey: true }).tier).toBe("full");
  });

  it("falls back to surface (with a note) when full is requested but no key is set", () => {
    const d = decideMcpScan({ mode: "full", hasApiKey: false });
    expect(d.tier).toBe("surface");
    expect(d.note).toMatch(/api key/i);
  });
});

describe("ensureScheme", () => {
  it("leaves an existing scheme untouched", () => {
    expect(ensureScheme("https://myapp.com")).toBe("https://myapp.com");
    expect(ensureScheme("http://localhost:3000")).toBe("http://localhost:3000");
  });

  it("uses http for local / private hosts", () => {
    expect(ensureScheme("localhost:3000")).toBe("http://localhost:3000");
    expect(ensureScheme("127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    expect(ensureScheme("192.168.1.5")).toBe("http://192.168.1.5");
    expect(ensureScheme("10.0.0.4/app")).toBe("http://10.0.0.4/app");
  });

  it("uses https for a public schemeless host", () => {
    expect(ensureScheme("myapp.com")).toBe("https://myapp.com");
  });
});

const result: ScanResult = {
  url: "http://localhost:4173",
  domain: "localhost:4173",
  score: 0,
  grade: "F",
  counts: { critical: 2, high: 0, medium: 0, low: 1 },
  scanDepth: "full",
  graded: true,
  coverage: [],
  scannedAt: "t",
  stack: ["Next.js"],
  findings: [
    {
      checkKey: "stripe",
      title: "Stripe key exposed",
      severity: "critical",
      passed: false,
      detail: "A secret leaked.",
      fix: "Rotate it.",
      fixPrompt: "Move the key to the server.",
      evidence: "sk_…xyz",
    },
    {
      checkKey: "locked",
      title: "Locked thing",
      severity: "critical",
      passed: false,
      detail: "",
      fix: "",
      locked: true,
    },
    {
      checkKey: "csp",
      title: "Missing CSP",
      severity: "low",
      passed: false,
      category: "hardening",
      detail: "",
      fix: "Add a CSP header.",
    },
    { checkKey: "https", title: "HTTPS ok", severity: "pass", passed: true, detail: "", fix: "" },
  ],
};

describe("formatReport", () => {
  it("renders the grade, counts, and issue details for unlocked findings", () => {
    const out = formatReport(result);
    expect(out).toContain("localhost:4173");
    expect(out).toContain("Grade **F**");
    expect(out).toContain("Critical 2");
    expect(out).toContain("Stripe key exposed");
    expect(out).toContain("A secret leaked.");
    expect(out).toContain("**Fix:** Rotate it.");
    expect(out).toContain("Move the key to the server.");
  });

  it("shows the locked hint for locked findings and never their fix", () => {
    const out = formatReport(result);
    expect(out).toContain("🔒 Locked");
  });

  it("separates hardening and passed checks", () => {
    const out = formatReport(result);
    expect(out).toContain("Missing CSP");
    expect(out).toContain("Add a CSP header.");
    expect(out).toContain("1 checks passed");
  });

  it("includes the note when provided", () => {
    expect(formatReport(result, { note: "heads up" })).toContain("heads up");
  });
});
