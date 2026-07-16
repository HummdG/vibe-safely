import type { ScanResult } from "@/lib/scan/types";

// A full (owned) scan that found nothing exposed to test, so VibeSafely refuses a
// letter grade rather than rounding up to a green checkmark. Rendered through the real
// <CoveragePanel> so the honesty section demonstrates the model instead of describing it.
export const HONESTY_EXAMPLE: ScanResult = {
  url: "https://owned-app.example",
  domain: "owned-app.example",
  score: 0,
  grade: "F",
  counts: { critical: 0, high: 0, medium: 0, low: 0 },
  scanDepth: "full",
  graded: false,
  plan: "pro",
  deepChecksAvailable: false,
  scannedAt: "2026-07-14T00:00:00Z",
  coverage: [
    { title: "Exposed secrets in client code", status: "tested" },
    { title: "Security headers", status: "tested" },
    { title: "Cookie security flags", status: "tested" },
    { title: "Client-side AI API keys", status: "tested" },
    { title: "Open database tables (Supabase RLS)", status: "not-applicable" },
    { title: "Prompt injection", status: "not-applicable" },
  ],
  findings: [],
};
