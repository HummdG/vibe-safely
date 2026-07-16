import type { Finding } from "@vibesafely/scan-core";
import type { Fail } from "./severity";
import { SEV, SEV_LABEL } from "./severity";
import { LockIcon } from "../icons";
import { FixPanel } from "./FixPanel";

// One vulnerability, tinted by severity. Free-plan findings arrive with locked:true
// (stripped server-side in gating.ts) and show a blurred teaser instead of details.
export function FindingCard({
  finding,
  animate = false,
}: {
  finding: Finding;
  animate?: boolean;
}) {
  const sev = finding.severity as Fail;
  const s = SEV[sev];
  return (
    <div className={`${animate ? "reveal-in " : ""}rounded-md border ${s.border} ${s.bg} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-body font-medium text-ink">{finding.title}</h3>
        <span className={`shrink-0 font-mono text-label uppercase tracking-label ${s.text}`}>
          {SEV_LABEL[sev]}
        </span>
      </div>

      {finding.locked ? (
        <div className="mt-2 flex items-center gap-2 text-meta text-ink-dim">
          <LockIcon className="h-4 w-4 shrink-0 text-ink-dim" />
          <span className="select-none blur-[3px]">
            Full explanation, the exact fix, and a copy-ready AI fix prompt are on Pro.
          </span>
        </div>
      ) : (
        <>
          <p className="mt-1.5 text-body leading-relaxed text-ink-muted">{finding.detail}</p>
          {finding.evidence && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="rounded border border-border bg-well px-2 py-0.5 font-mono text-mono text-ink-muted">
                {finding.evidence}
              </code>
              <span className="font-mono text-mono text-ink-dim">masked, not stored</span>
            </div>
          )}
          {finding.fix && (
            <p className="mt-2 text-body leading-relaxed text-ink-muted">
              <span className="font-medium text-ink">Fix. </span>
              {finding.fix}
            </p>
          )}
          <FixPanel finding={finding} />
        </>
      )}
    </div>
  );
}
