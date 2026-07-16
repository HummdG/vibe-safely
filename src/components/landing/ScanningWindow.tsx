"use client";

import { useEffect, useState } from "react";
import { Panel } from "@/components/ui/Panel";
import { GradeTile } from "@/components/report/GradeTile";
import { ScannerWindow } from "./ScannerWindow";
import type { LogLine } from "./demoSteps";

// The real phases the scanner runs, streamed in the title bar while the request is in
// flight. It stops one shy of "complete": the real response decides when we're done, so
// the window never claims a verdict it doesn't have yet.
const PHASES = [
  "→ GET {domain}",
  "→ reading client bundles",
  "→ probing headers · cookies · secrets",
  "→ probing database · storage · AI endpoint",
  "→ compiling report",
];

export function ScanningWindow({ domain }: { domain: string }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => Math.min(n + 1, PHASES.length - 1)), 720);
    return () => clearInterval(id);
  }, []);

  const label = domain || "your app";
  const line: LogLine = { text: PHASES[i].replace("{domain}", label), tone: "live" };
  // Creep toward ~86% across the phases; the arriving result snaps the bar to 100%.
  const pct = Math.round(8 + (i / (PHASES.length - 1)) * 78);

  return (
    <ScannerWindow line={line} pct={pct} active>
      {/* the scanning summary: the same header the finished report lands on, mid-flight */}
      <Panel className="flex items-center gap-5 p-5">
        <GradeTile scanning graded={false} grade="" warn={false} />
        <div className="min-w-0">
          <div className="truncate font-mono text-body text-ink">{label}</div>
          <div className="mt-1 flex items-center gap-1 font-mono text-mono text-live">
            scanning
            <span className="caret" aria-hidden>
              ▍
            </span>
          </div>
        </div>
      </Panel>
    </ScannerWindow>
  );
}
