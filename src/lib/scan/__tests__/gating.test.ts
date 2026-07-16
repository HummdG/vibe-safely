import { describe, it, expect } from "vitest";
import { gateResult } from "../gating";
import type { ScanResult } from "../types";

const base: ScanResult = {
  url: "https://x",
  domain: "x",
  score: 20,
  grade: "F",
  counts: { critical: 1, high: 0, medium: 1, low: 0 },
  scanDepth: "surface",
  graded: false,
  coverage: [],
  scannedAt: "t",
  findings: [
    {
      checkKey: "a",
      title: "Critical thing",
      severity: "critical",
      passed: false,
      detail: "secret detail",
      fix: "do this",
      evidence: "ab…cd",
      fixPrompt: "PROMPT",
      fixPatch: { before: "x", after: "y", lang: "ts" },
    },
    {
      checkKey: "h",
      title: "hardening thing",
      severity: "low",
      category: "hardening",
      passed: false,
      detail: "hd",
      fix: "hf",
      fixPrompt: "HPROMPT",
    },
    { checkKey: "b", title: "ok", severity: "pass", passed: true, detail: "fine", fix: "" },
  ],
};

describe("gateResult", () => {
  it("free plan locks failed findings and strips detail/fix/evidence, keeps titles + score", () => {
    const g = gateResult(base, "free");
    expect(g.plan).toBe("free");
    const crit = g.findings.find((f) => f.checkKey === "a")!;
    expect(crit.locked).toBe(true);
    expect(crit.detail).toBe("");
    expect(crit.fix).toBe("");
    expect(crit.evidence).toBeUndefined();
    expect(crit.fixPrompt).toBeUndefined(); // the fix content is the paid value
    expect(crit.fixPatch).toBeUndefined();
    expect(crit.title).toBe("Critical thing"); // scary hook stays
    expect(g.grade).toBe("F");
    expect(g.counts.critical).toBe(1);
    // passing checks are untouched
    expect(g.findings.find((f) => f.passed)!.detail).toBe("fine");
    // hardening tips (incl. their fix prompt) stay free
    const hard = g.findings.find((f) => f.category === "hardening")!;
    expect(hard.fixPrompt).toBe("HPROMPT");
    expect(hard.fix).toBe("hf");
  });

  it("pro plan returns full detail and fix content", () => {
    const g = gateResult(base, "pro");
    expect(g.plan).toBe("pro");
    const crit = g.findings.find((f) => f.checkKey === "a")!;
    expect(crit.detail).toBe("secret detail");
    expect(crit.fix).toBe("do this");
    expect(crit.fixPrompt).toBe("PROMPT");
    expect(crit.locked).toBeUndefined();
  });
});
