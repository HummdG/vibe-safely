import type { ScanResult } from "@/lib/scan/types";
import { RANK } from "./severity";

// The single derivation of a report's view-model, shared by the full <Report> (live
// scan) and the auto-running demo window so both stay perfectly in sync. Pure.
export function deriveReport(result: ScanResult) {
  const failed = result.findings.filter((f) => !f.passed);
  // Real, exploitable problems drive the grade; hardening tips are shown separately.
  const vulns = failed
    .filter((f) => f.category !== "hardening")
    .sort((a, b) => RANK[a.severity] - RANK[b.severity]);
  const hardening = failed.filter((f) => f.category === "hardening");
  // Vacuous "nothing to test" passes are never shown as reassuring passed checks.
  const passed = result.findings.filter((f) => f.passed && f.applicable !== false);
  const gated = result.plan === "free";

  const tested = result.coverage.filter((c) => c.status === "tested");
  const notApplicable = result.coverage.filter((c) => c.status === "not-applicable");
  const notTested = result.coverage.filter((c) => c.status === "not-tested");

  // A letter grade shows ONLY when the deep checks actually probed a real target.
  const graded = result.graded;
  // A full scan that found no backend/endpoint didn't verify what matters → no grade.
  const couldntVerify = result.scanDepth === "full" && !graded;

  return {
    failed,
    vulns,
    hardening,
    passed,
    gated,
    tested,
    notApplicable,
    notTested,
    graded,
    couldntVerify,
  };
}

export type ReportModel = ReturnType<typeof deriveReport>;
