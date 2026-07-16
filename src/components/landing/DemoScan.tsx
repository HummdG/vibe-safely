"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ScanResult } from "@/lib/scan/types";
import { EXAMPLE_REPORT } from "@/components/exampleReport";
import { deriveReport } from "@/components/report/model";
import { SummaryCard } from "@/components/report/SummaryCard";
import { CoveragePanel } from "@/components/report/CoveragePanel";
import { FindingCard } from "@/components/report/FindingCard";
import { ReplayIcon } from "@/components/icons";
import { ScannerWindow } from "./ScannerWindow";
import { buildSteps } from "./demoSteps";

// Client components are server-rendered too, so plain useLayoutEffect warns during
// SSR. This runs useEffect on the server (a no-op) and useLayoutEffect on the client
// (so the rewind happens before paint).
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// The auto-running demo: the actual product, running, inside the shared <ScannerWindow>.
// Its title bar streams the current scan line and its body assembles the report as findings
// land. It's all simulated from a static fixture, no network call. The SSR/no-JS/reduced-
// motion render is the finished scan; only motion-friendly clients rewind and replay it.
// A real scan swaps this window's body for a live scan and then a real report, wearing the
// same frame, so what the visitor is shown is what they get.
export function DemoWindow({ result = EXAMPLE_REPORT }: { result?: ScanResult }) {
  const model = useMemo(() => deriveReport(result), [result]);
  const steps = useMemo(() => buildSteps(result), [result]);
  const last = steps.length - 1;

  const [step, setStep] = useState(last);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const play = () => {
    clearTimers();
    setStep(0);
    let acc = 0;
    for (let i = 0; i < last; i++) {
      acc += steps[i].dur;
      timers.current.push(setTimeout(() => setStep(i + 1), acc));
    }
  };

  useIsoLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // finished, no motion
    if (!("IntersectionObserver" in window)) {
      play();
      return clearTimers;
    }
    // Rewind to the start, then run the scan once it scrolls into view (above the
    // fold, so this fires on load).
    setStep(0);
    const io = new IntersectionObserver(
      (entries, obs) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            obs.disconnect();
            play();
            break;
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimers();
    };
  }, []);

  const cur = steps[step];
  const progress = last > 0 ? step / last : 1;
  const active = !cur.done;
  const pct = Math.round(progress * 100);

  return (
    <div ref={rootRef}>
      <ScannerWindow line={cur.line} pct={pct} active={active}>
        <SummaryCard result={result} model={model} phase={cur.settled ? "done" : "scanning"} />

        {model.vulns.slice(0, cur.vulns).map((f, i) => (
          <FindingCard key={i} finding={f} animate />
        ))}

        {cur.coverage && <CoveragePanel result={result} model={model} animate />}

        {cur.done && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="font-mono text-mono text-ink-dim">↑ run it on your own app</span>
            <button
              type="button"
              onClick={play}
              className="inline-flex items-center gap-1.5 rounded font-mono text-mono text-ink-dim transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
            >
              <ReplayIcon className="h-3.5 w-3.5" />
              Replay
            </button>
          </div>
        )}
      </ScannerWindow>
    </div>
  );
}
