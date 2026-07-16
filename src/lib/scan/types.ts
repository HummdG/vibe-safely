// Core types for the security scan engine.
// The engine is pure/server-side and takes an injectable fetch so every check
// can be unit-tested without real network access or API keys.

export type Severity = "critical" | "high" | "medium" | "low" | "pass";

export type Plan = "free" | "pro";

export type FindingCategory = "vulnerability" | "hardening";

/** A canonical before→after code example for a finding, rendered as a diff. */
export interface FixPatch {
  before: string;
  after: string;
  lang: string;
}

export interface Finding {
  checkKey: string;
  title: string;
  severity: Severity;
  /** true = no problem (informational/green); false = an issue that costs score */
  passed: boolean;
  /** "vulnerability" (real, exploitable, drives the grade) vs "hardening"
   *  (best-practice recommendation, shown separately, never affects the grade).
   *  Absent is treated as "vulnerability". */
  category?: FindingCategory;
  /** false = the check could not actually run because there was nothing to test
   *  (e.g. no Supabase/Firebase backend or AI endpoint found). Absent = it ran. */
  applicable?: boolean;
  detail: string;
  fix: string;
  /** ready-to-paste AI prompt (built from this finding + detected stack) to fix it
   *  in the user's own codebase via Cursor/Claude. Striped for free-plan vulns. */
  fixPrompt?: string;
  /** canonical before→after example for this vuln type. Stripped for free-plan vulns. */
  fixPatch?: FixPatch;
  /** short, already-masked evidence snippet safe to show */
  evidence?: string;
  /** for exposed-secret findings: the specific credential kind (e.g. "Stripe secret
   *  key", "AWS access key id"), so the fix patch matches the real secret, not a stand-in */
  secretType?: string;
  /** true when detail/fix are hidden behind the paywall (free plan) */
  locked?: boolean;
}

export interface SupabaseInfo {
  url: string;
  ref: string;
  anonKey?: string;
}

export interface FirebaseInfo {
  apiKey?: string;
  projectId?: string;
  databaseURL?: string;
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface Bundle {
  url: string;
  content: string;
}

export interface ScanContext {
  /** normalized target URL */
  url: string;
  origin: string;
  domain: string;
  ownerConfirmed: boolean;
  status: number;
  /** true only when the homepage was fetched successfully with a 2xx status */
  reachable: boolean;
  /** human-readable reason the target could not be scanned (set when !reachable) */
  fetchError?: string;
  headers: Record<string, string>;
  /** raw Set-Cookie header values (kept separate because the flat headers record
   *  collapses multiple cookies into one) */
  cookies: string[];
  html: string;
  bundles: Bundle[];
  supabase?: SupabaseInfo;
  firebase?: FirebaseInfo;
  fetchImpl: FetchLike;
}

export interface Check {
  key: string;
  title: string;
  /** active checks that probe the app's backend only run after ownership is confirmed */
  requiresOwnership: boolean;
  run(ctx: ScanContext): Promise<Finding | Finding[]>;
}

export type SeverityCount = Record<Exclude<Severity, "pass">, number>;

/** One row of the "what did we actually check?" coverage summary.
 *  - "tested"        = actually exercised a real target and found it clean/at-risk
 *  - "not-applicable" = nothing to test (no backend/endpoint found in the app)
 *  - "not-tested"     = skipped because ownership wasn't confirmed */
export type CoverageStatus = "tested" | "not-applicable" | "not-tested";

export interface CoverageItem {
  title: string;
  status: CoverageStatus;
}

export interface ScanResult {
  url: string;
  domain: string;
  score: number;
  grade: string;
  findings: Finding[];
  counts: SeverityCount;
  /** number of failing hardening recommendations (not counted as vulnerabilities) */
  hardeningCount?: number;
  /** "surface" = passive checks only; "full" = ownership-gated deep checks also ran */
  scanDepth: "surface" | "full";
  /** true only when the deep checks actually probed a real backend/endpoint, so a
   *  letter grade is meaningful. False when nothing testable was found → no grade. */
  graded: boolean;
  /** what each check category did on this scan, powers the honest coverage panel */
  coverage: CoverageItem[];
  /** detected stack labels (e.g. ["Next.js","Supabase"]) used to tailor fix prompts */
  stack?: string[];
  scannedAt: string;
  /** true when a Supabase/Firebase backend was detected but the deep
   *  (ownership-gated) checks were skipped because ownership wasn't confirmed */
  deepChecksAvailable?: boolean;
  /** set by the gating layer; absent = ungated (internal) */
  plan?: Plan;
}
