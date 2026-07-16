import type { ScanResult } from "@/lib/scan/types";
import type { ReportModel } from "./model";
import { Panel } from "../ui/Panel";
import { GradeTile } from "./GradeTile";
import { SEV, SEV_LABEL, type Fail } from "./severity";

// One tier of the always-on severity breakdown. A real count lights up in its severity
// colour; a zero recedes to a muted "all clear" chip so the strip reads calm, not alarmed,
// when there's nothing wrong; the count you need to see is the only one that pops.
function CountChip({ severity, count }: { severity: Fail; count: number }) {
  const s = SEV[severity];
  const on = count > 0;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-label leading-none ${
        on ? `${s.border} ${s.bg} ${s.text}` : "border-border bg-surface-2/50 text-ink-dim"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot} ${on ? "" : "opacity-30"}`} aria-hidden />
      {count} {SEV_LABEL[severity].toLowerCase()}
    </span>
  );
}

// The report header: the grade tile plus the domain, score/summary and count badges.
// `phase="scanning"` renders the mid-scan state the demo uses before the grade lands.
export function SummaryCard({
  result,
  model,
  phase = "done",
}: {
  result: ScanResult;
  model: ReportModel;
  phase?: "scanning" | "done";
}) {
  const scanning = phase === "scanning";
  const { graded, vulns, hardening, couldntVerify } = model;
  const warn = vulns.length > 0 || couldntVerify;
  const full = result.scanDepth === "full";
  const findingSummary =
    vulns.length > 0
      ? `${vulns.length} issue${vulns.length > 1 ? "s" : ""} found`
      : couldntVerify
        ? "couldn’t verify"
        : "no client-side issues found";

  return (
    <Panel className="flex items-center gap-5 p-5">
      <GradeTile graded={graded} grade={result.grade} warn={warn} scanning={scanning} />
      <div className="min-w-0">
        <div className="truncate font-mono text-body text-ink">{result.domain}</div>

        {scanning ? (
          <div className="mt-1 flex items-center gap-1 font-mono text-mono text-live">
            scanning
            <span className="caret" aria-hidden>
              ▍
            </span>
          </div>
        ) : graded ? (
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta text-ink-dim">
            <span>Security score {result.score} / 100</span>
            <span className="text-ink-faint">·</span>
            <span className="font-mono text-label uppercase tracking-label text-pass">full scan</span>
          </div>
        ) : (
          <>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-meta">
              <span
                className={`font-mono text-label uppercase tracking-label ${full ? "text-pass" : "text-medium"}`}
              >
                {full ? "full scan" : "surface scan"}
              </span>
              <span className="text-ink-faint">·</span>
              <span className="text-ink-muted">{findingSummary}</span>
            </div>
            <div className="mt-1 text-mono leading-relaxed text-ink-dim">
              {couldntVerify
                ? "No backend or AI endpoint was found in your code to test. Your database, storage and auth were not verified, so there’s no grade."
                : "No letter grade. A graded report needs the deep checks below."}
            </div>
          </>
        )}

        {!scanning && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {/* The severity breakdown is always present, so every report speaks the same
                language: critical/high/medium show even at zero, muted until something lands. */}
            <CountChip severity="critical" count={result.counts.critical} />
            <CountChip severity="high" count={result.counts.high} />
            <CountChip severity="medium" count={result.counts.medium} />
            {result.counts.low > 0 && <CountChip severity="low" count={result.counts.low} />}
            {graded && vulns.length === 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-pass/40 bg-pass/10 px-2 py-0.5 font-mono text-label leading-none text-pass">
                <span className="h-1.5 w-1.5 rounded-full bg-pass" aria-hidden />
                no vulnerabilities found
              </span>
            )}
            {hardening.length > 0 && (
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 font-mono text-label leading-none text-ink-muted">
                {hardening.length} hardening tip{hardening.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {!scanning && result.stack && result.stack.length > 0 && (
          <div className="mt-1.5 font-mono text-mono text-ink-dim">
            detected: {result.stack.join(" · ")}
          </div>
        )}
      </div>
    </Panel>
  );
}
