import type { ScanResult, Finding, Plan } from "./types";

// Server-side paywall. Free users receive the grade, score, severity counts and
// the finding TITLES (the scary hook), but the detailed explanation and the
// one-line fix are stripped from the payload entirely (not merely hidden in the
// DOM), so the paywall cannot be bypassed from the browser. Passing checks carry
// no sensitive detail, so they are left intact.
export function gateResult(result: ScanResult, plan: Plan): ScanResult {
  if (plan === "pro") return { ...result, plan };

  // Free plan: strip the explanation + fix for real vulnerabilities (the paid value).
  // Passing checks and hardening recommendations carry no sensitive detail and stay
  // fully visible, hardening tips are generic best-practice advice that builds trust.
  const findings: Finding[] = result.findings.map((f) =>
    f.passed || f.category === "hardening"
      ? f
      : {
          ...f,
          detail: "",
          fix: "",
          evidence: undefined,
          fixPrompt: undefined,
          fixPatch: undefined,
          locked: true,
        },
  );
  return { ...result, plan, findings };
}
