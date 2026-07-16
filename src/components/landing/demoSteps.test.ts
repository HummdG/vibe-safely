import { describe, it, expect } from "vitest";
import { buildSteps } from "./demoSteps";
import { EXAMPLE_REPORT } from "../exampleReport";
import { deriveReport } from "../report/model";

describe("buildSteps", () => {
  const steps = buildSteps(EXAMPLE_REPORT);
  const { vulns } = deriveReport(EXAMPLE_REPORT);

  it("is boot steps + one per vuln + coverage + complete", () => {
    const boot = EXAMPLE_REPORT.scanDepth === "full" ? 4 : 3;
    expect(steps.length).toBe(boot + vulns.length + 2);
  });

  it("reveals vulnerabilities one at a time, monotonically, up to the total", () => {
    const counts = steps.map((s) => s.vulns);
    for (let i = 1; i < counts.length; i++) {
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
    }
    expect(Math.max(...counts)).toBe(vulns.length);
  });

  it("starts unsettled and ends settled, done and covered", () => {
    expect(steps[0].settled).toBe(false);
    expect(steps[0].done).toBe(false);
    const last = steps[steps.length - 1];
    expect(last.settled).toBe(true);
    expect(last.done).toBe(true);
    expect(last.coverage).toBe(true);
  });

  it("marks exactly one step done", () => {
    expect(steps.filter((s) => s.done).length).toBe(1);
  });
});
