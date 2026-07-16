import type { Finding } from "@vibesafely/scan-core";
import { Panel } from "../ui/Panel";

export function PassedChecks({ items }: { items: Finding[] }) {
  return (
    <Panel className="p-4">
      <details className="group">
        <summary className="cursor-pointer font-mono text-mono text-ink-dim transition-colors hover:text-ink-muted">
          {items.length} checks passed
        </summary>
        <ul className="mt-3 space-y-1.5 text-meta text-ink-muted">
          {items.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-pass" aria-hidden>
                ✓
              </span>
              {f.title}
            </li>
          ))}
        </ul>
      </details>
    </Panel>
  );
}
