import type { ScanResult } from "@/lib/scan/types";
import { deriveReport } from "./report/model";
import { SummaryCard } from "./report/SummaryCard";
import { CoveragePanel } from "./report/CoveragePanel";
import { UpgradeCallout } from "./report/UpgradeCallout";
import { FindingCard } from "./report/FindingCard";
import { HardeningList } from "./report/HardeningList";
import { PassedChecks } from "./report/PassedChecks";

// A thin orchestrator over the report/* primitives. A finished real scan renders this
// inside the same <ScannerWindow> the auto-running demo uses on the landing page, so the
// demo and a real result are visually identical. Gating is honored via each finding's
// `locked` flag (stripped server-side in gating.ts), this component never sees ungated
// data on the free plan.
export function Report({ result }: { result: ScanResult }) {
  const model = deriveReport(result);
  const { vulns, hardening, passed, gated } = model;

  return (
    <div className="reveal w-full space-y-4 text-left">
      <SummaryCard result={result} model={model} />

      <CoveragePanel result={result} model={model} />

      {gated && vulns.length > 0 && <UpgradeCallout count={vulns.length} />}

      {vulns.length > 0 && (
        <div className="space-y-2.5">
          {vulns.map((f, i) => (
            <FindingCard key={i} finding={f} />
          ))}
        </div>
      )}

      {hardening.length > 0 && <HardeningList items={hardening} />}

      {passed.length > 0 && <PassedChecks items={passed} />}

      <p className="pt-1 text-center font-mono text-mono text-ink-dim">
        Generated in memory. Nothing from this scan, including anything we found, was stored.
      </p>
    </div>
  );
}
