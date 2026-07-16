import type { ScanResult } from "@vibesafely/scan-core";
// Relative (not @/) so this pure module resolves under the node-env Vitest suite.
import { deriveReport } from "../report/model";

export type LogTone = "live" | "warn" | "ok" | "muted";
export interface LogLine {
  text: string;
  tone: LogTone;
}

// One frame of the auto-running demo. The component holds an index into this array;
// each field says what is visible at that frame. Pure + deterministic so it can be
// unit-tested (node env) without a DOM.
export interface DemoStep {
  line: LogLine;
  /** how many vulnerability findings are visible */
  vulns: number;
  /** the coverage panel is visible */
  coverage: boolean;
  /** the verdict has landed, the summary shows its final state */
  settled: boolean;
  /** the scan has finished (caret stops, replay affordance shows) */
  done: boolean;
  /** ms to wait before advancing to the next step */
  dur: number;
}

export function buildSteps(result: ScanResult): DemoStep[] {
  const { vulns } = deriveReport(result);

  const steps: DemoStep[] = [
    { line: { text: `→ GET ${result.domain}`, tone: "live" }, vulns: 0, coverage: false, settled: false, done: false, dur: 620 },
    { line: { text: "→ reading client bundles", tone: "live" }, vulns: 0, coverage: false, settled: false, done: false, dur: 520 },
    { line: { text: "→ probing headers · cookies · secrets", tone: "live" }, vulns: 0, coverage: false, settled: false, done: false, dur: 700 },
  ];

  // A deep (owned) scan also reaches the backend and AI endpoint; say so before those land.
  if (result.scanDepth === "full") {
    steps.push({ line: { text: "→ probing database · storage · AI endpoint", tone: "live" }, vulns: 0, coverage: false, settled: false, done: false, dur: 720 });
  }

  vulns.forEach((v, i) => {
    steps.push({
      line: { text: `! ${v.title}`, tone: "warn" },
      vulns: i + 1,
      coverage: false,
      settled: false,
      done: false,
      dur: 760,
    });
  });

  steps.push({ line: { text: "→ compiling coverage", tone: "live" }, vulns: vulns.length, coverage: true, settled: false, done: false, dur: 640 });
  steps.push({ line: { text: "✓ assessment complete", tone: "ok" }, vulns: vulns.length, coverage: true, settled: true, done: true, dur: 0 });

  return steps;
}
