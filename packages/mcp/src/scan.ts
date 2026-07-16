import type { ScanResult, Finding } from "@vibesafely/scan-core";

// Pure helpers — no SDK, no network — so they're unit-testable.

export type ScanTier = "surface" | "full";

/**
 * Decides which tier to actually run. A full scan needs an API key; without one we fall back
 * to a free surface scan and tell the user why (mirrors the website's free funnel).
 */
export function decideMcpScan(opts: {
  mode: "surface" | "full" | undefined;
  hasApiKey: boolean;
}): { tier: ScanTier; note?: string } {
  if (opts.mode !== "full") return { tier: "surface" };
  if (!opts.hasApiKey) {
    return {
      tier: "surface",
      note: "No VIBESAFELY_API_KEY set, so this was a free surface scan. Add a key from your VibeSafely account (Account → API keys) to run a full scan with the deep checks and fixes.",
    };
  }
  return { tier: "full" };
}

/** Adds a scheme if missing — http for local/private targets, https otherwise. */
export function ensureScheme(input: string): string {
  const u = input.trim();
  if (/^https?:\/\//i.test(u)) return u;
  const host = u.split("/")[0]!.toLowerCase();
  const isLocal =
    /^(localhost|127\.0\.0\.1|\[::1\]|0\.0\.0\.0)(:|$)/.test(host) ||
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host);
  return (isLocal ? "http://" : "https://") + u;
}

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  pass: 4,
};

function bySeverity(a: Finding, b: Finding): number {
  return (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
}

/** Renders a ScanResult as readable Markdown for Claude to act on. */
export function formatReport(
  result: ScanResult,
  opts: { note?: string; footer?: string } = {},
): string {
  const vulns = result.findings
    .filter((f) => !f.passed && f.category !== "hardening")
    .sort(bySeverity);
  const hardening = result.findings.filter((f) => !f.passed && f.category === "hardening");
  const passed = result.findings.filter((f) => f.passed);
  const c = result.counts;

  const lines: string[] = [];
  lines.push(`# VibeSafely scan — ${result.domain}`);
  lines.push(
    `Grade **${result.grade}** · score ${result.score}/100 · ${result.scanDepth} scan` +
      (result.stack?.length ? ` · stack: ${result.stack.join(", ")}` : ""),
  );
  lines.push(
    `Critical ${c.critical} · High ${c.high} · Medium ${c.medium} · Low ${c.low}`,
  );
  if (opts.note) lines.push(`\n> ${opts.note}`);

  if (vulns.length) {
    lines.push(`\n## Issues (${vulns.length})`);
    for (const f of vulns) {
      lines.push(`\n### [${f.severity.toUpperCase()}] ${f.title}`);
      if (f.locked) {
        lines.push("🔒 Locked — run a full scan (needs an API key) to see the detail and fix.");
        continue;
      }
      if (f.detail) lines.push(f.detail);
      if (f.evidence) lines.push(`Evidence: \`${f.evidence}\``);
      if (f.fix) lines.push(`**Fix:** ${f.fix}`);
      if (f.fixPrompt) lines.push(`\n**Fix prompt:**\n${f.fixPrompt}`);
    }
  } else {
    lines.push("\n## Issues\nNone found. 🎉");
  }

  if (hardening.length) {
    lines.push(`\n## Hardening (${hardening.length})`);
    for (const f of hardening) lines.push(`- **${f.title}** — ${f.fix || f.detail}`);
  }

  if (passed.length) lines.push(`\n## Passed\n${passed.length} checks passed.`);
  if (opts.footer) lines.push(`\n${opts.footer}`);

  return lines.join("\n");
}
