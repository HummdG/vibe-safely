import type { Finding } from "@/lib/scan/types";
import { Panel } from "../ui/Panel";
import { CopyButton } from "../CopyButton";

// Best-practice recommendations. Shown separately because they never affect the grade.
export function HardeningList({ items }: { items: Finding[] }) {
  return (
    <Panel className="p-4">
      <h3 className="font-mono text-label uppercase tracking-label text-ink-muted">
        Hardening recommendations ({items.length})
      </h3>
      <p className="mt-1.5 text-meta text-ink-dim">
        Best-practice improvements. These don&apos;t affect your grade (no vulnerability was found)
        but they raise the bar for attackers.
      </p>
      <ul className="mt-3 space-y-3">
        {items.map((f, i) => (
          <li key={i} className="border-t border-hairline pt-3 first:border-t-0 first:pt-0">
            <div className="text-body font-medium text-ink">{f.title}</div>
            {f.detail && <p className="mt-1 text-meta leading-relaxed text-ink-muted">{f.detail}</p>}
            {f.fix && (
              <p className="mt-1 text-meta leading-relaxed text-ink-dim">
                <span className="font-medium text-ink-muted">Fix. </span>
                {f.fix}
              </p>
            )}
            {f.fixPrompt && (
              <div className="mt-2">
                <CopyButton text={f.fixPrompt} label="Copy AI fix prompt" />
              </div>
            )}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
