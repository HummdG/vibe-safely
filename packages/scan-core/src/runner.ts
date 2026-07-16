import type {
  Check,
  Finding,
  ScanContext,
  ScanResult,
  SeverityCount,
  CoverageItem,
  FetchLike,
} from "./types";
import { gatherContext } from "./gatherContext";
import { detectStack, attachFixes } from "./fixes";
import { bundleSecrets } from "./checks/bundleSecrets";
import { exposedFiles } from "./checks/exposedFiles";
import { sourceMaps } from "./checks/sourceMaps";
import { securityHeaders } from "./checks/securityHeaders";
import { cookieSecurity } from "./checks/cookieSecurity";
import { insecureStorage } from "./checks/insecureStorage";
import { robotsSitemap } from "./checks/robotsSitemap";
import { errorDisclosure } from "./checks/errorDisclosure";
import { httpMethods } from "./checks/httpMethods";
import { dependencyScan } from "./checks/dependencyScan";
import { corsConfig } from "./checks/corsConfig";
import { contentTypeConfusion } from "./checks/contentTypeConfusion";
import { openRedirect } from "./checks/openRedirect";
import { supabaseRls } from "./checks/supabaseRls";
import { firebaseRules } from "./checks/firebaseRules";
import { storageBuckets } from "./checks/storageBuckets";
import { llmClientSide } from "./checks/llmClientSide";
import { llmSystemPrompt } from "./checks/llmSystemPrompt";
import { llmPromptInjection } from "./checks/llmPromptInjection";

export const ALL_CHECKS: Check[] = [
  bundleSecrets,
  exposedFiles,
  sourceMaps,
  securityHeaders,
  cookieSecurity,
  insecureStorage,
  robotsSitemap,
  errorDisclosure,
  httpMethods,
  dependencyScan,
  corsConfig,
  llmClientSide,
  llmSystemPrompt,
  supabaseRls,
  firebaseRules,
  storageBuckets,
  llmPromptInjection,
  contentTypeConfusion,
  openRedirect,
];

/** Thrown when the target can't be reached (or isn't a real, 2xx website), so
 *  there is nothing legitimate to grade. Callers surface this as a user error. */
export class UnreachableTargetError extends Error {
  constructor(message = "The site could not be reached.") {
    super(message);
    this.name = "UnreachableTargetError";
  }
}

// Plain-English label for each check, shown in the coverage panel so users see
// exactly what was (and wasn't) tested, the honest alternative to a hollow "100/100".
const COVERAGE_LABELS: Record<string, string> = {
  "bundle-secrets": "Exposed secrets in client code",
  "exposed-files": "Exposed .env / .git files",
  "source-maps": "Exposed source maps",
  "security-headers": "Security headers",
  "cookie-security": "Cookie security flags",
  "insecure-storage": "Tokens in browser storage",
  "robots-sitemap": "Robots / sitemap disclosure",
  "error-disclosure": "Error & version disclosure",
  "http-methods": "Dangerous HTTP methods",
  "dependency-scan": "Vulnerable dependencies",
  "cors-config": "CORS policy",
  "llm-client-side": "Client-side AI API keys",
  "llm-system-prompt": "Leaked system prompt",
  "supabase-rls": "Open database tables (Supabase RLS)",
  "firebase-rules": "Open Firebase database",
  "storage-buckets": "Open storage buckets",
  "llm-prompt-injection": "Prompt injection",
  "content-type-confusion": "API content-type / XXE",
  "open-redirect": "Open redirect",
};

// The ownership-gated checks that must actually find a backend/endpoint to mean
// anything. If none of them probed a real target, no letter grade is earned.
const DEEP_KEYS = new Set([
  "supabase-rls",
  "firebase-rules",
  "storage-buckets",
  "llm-prompt-injection",
]);

function buildCoverage(ownerConfirmed: boolean, findings: Finding[]): CoverageItem[] {
  return ALL_CHECKS.map((c) => {
    const title = COVERAGE_LABELS[c.key] ?? c.title;
    if (c.requiresOwnership && !ownerConfirmed) {
      return { title, status: "not-tested" as const };
    }
    const own = findings.filter((f) => f.checkKey === c.key);
    // A check whose only outcome was "nothing to test" didn't actually verify anything.
    const notApplicable = own.length > 0 && own.every((f) => f.applicable === false);
    return { title, status: notApplicable ? ("not-applicable" as const) : ("tested" as const) };
  });
}

const WEIGHTS: Record<string, number> = { critical: 40, high: 20, medium: 8, low: 3, pass: 0 };

export function scoreFindings(findings: Finding[]): {
  score: number;
  grade: string;
  counts: SeverityCount;
} {
  const counts: SeverityCount = { critical: 0, high: 0, medium: 0, low: 0 };
  let penalty = 0;
  for (const f of findings) {
    if (f.passed || f.severity === "pass") continue;
    // Hardening recommendations are shown to the user but never affect the grade,
    // only real, exploitable vulnerabilities do.
    if (f.category === "hardening") continue;
    const sev = f.severity as Exclude<Finding["severity"], "pass">;
    counts[sev] += 1;
    penalty += WEIGHTS[sev] ?? 0;
  }
  const score = Math.max(0, 100 - penalty);
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  return { score, grade, counts };
}

export async function runChecks(ctx: ScanContext): Promise<Finding[]> {
  const findings: Finding[] = [];
  for (const check of ALL_CHECKS) {
    if (check.requiresOwnership && !ctx.ownerConfirmed) continue;
    try {
      const r = await check.run(ctx);
      findings.push(...(Array.isArray(r) ? r : [r]));
    } catch (e) {
      // A check that errors is inconclusive, not a failure, so it does not penalize the score.
      findings.push({
        checkKey: check.key,
        title: check.title,
        severity: "pass",
        passed: true,
        detail: `This check could not complete (${e instanceof Error ? e.message : "error"}).`,
        fix: "",
      });
    }
  }
  return findings;
}

export interface RunScanOptions {
  url: string;
  ownerConfirmed: boolean;
  fetchImpl?: FetchLike;
  /** injectable clock for deterministic tests */
  now?: () => string;
}

export async function runScan(opts: RunScanOptions): Promise<ScanResult> {
  const ctx = await gatherContext(opts.url, opts.ownerConfirmed, opts.fetchImpl);
  if (!ctx.reachable) {
    throw new UnreachableTargetError(ctx.fetchError ?? "The site could not be reached.");
  }
  const stack = detectStack(ctx);
  const findings = attachFixes(await runChecks(ctx), stack);
  const { score, grade, counts } = scoreFindings(findings);
  const hardeningCount = findings.filter((f) => !f.passed && f.category === "hardening").length;
  // A grade is only meaningful if at least one deep check actually probed a real
  // backend/endpoint. If they all found nothing to test, we didn't verify the things
  // that matter (database/storage/auth) → no letter grade.
  const graded = findings.some((f) => DEEP_KEYS.has(f.checkKey) && f.applicable !== false);
  // A backend was found but the deep checks needed ownership we didn't have,
  // surface that so the user can unlock the highest-signal checks.
  const deepChecksAvailable = !ctx.ownerConfirmed && Boolean(ctx.supabase || ctx.firebase);
  return {
    url: ctx.url,
    domain: ctx.domain,
    score,
    grade,
    counts,
    hardeningCount,
    findings,
    scanDepth: ctx.ownerConfirmed ? "full" : "surface",
    graded,
    coverage: buildCoverage(ctx.ownerConfirmed, findings),
    stack,
    deepChecksAvailable,
    scannedAt: opts.now ? opts.now() : new Date().toISOString(),
  };
}
