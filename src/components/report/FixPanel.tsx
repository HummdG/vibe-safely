import type { Finding } from "@/lib/scan/types";
import { CopyButton } from "../CopyButton";

// The remediation the tool generates: a copy-ready AI prompt + a canonical before→after
// patch, meant to be pasted into the user's AI editor (VibeSafely can't touch their repo).
export function FixPanel({ finding }: { finding: Finding }) {
  if (!finding.fixPrompt && !finding.fixPatch) return null;
  return (
    <div className="mt-3 rounded-md border border-accent/25 bg-accent/[0.05] p-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-label uppercase tracking-label text-accent">Fix it</span>
        <span className="font-mono text-mono text-ink-dim">paste into Cursor / Claude</span>
      </div>
      {finding.fixPatch && (
        <div className="mt-2 overflow-x-auto rounded-md border border-border bg-well p-3 font-mono text-mono leading-relaxed">
          {finding.fixPatch.before.split("\n").map((l, j) => (
            <div key={`b${j}`} className="whitespace-pre text-critical/90">
              - {l}
            </div>
          ))}
          {finding.fixPatch.after.split("\n").map((l, j) => (
            <div key={`a${j}`} className="whitespace-pre text-pass/90">
              + {l}
            </div>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap gap-2">
        {finding.fixPrompt && <CopyButton primary text={finding.fixPrompt} label="Copy AI fix prompt" />}
        {finding.fixPatch && <CopyButton text={finding.fixPatch.after} label="Copy patch" />}
      </div>
    </div>
  );
}
