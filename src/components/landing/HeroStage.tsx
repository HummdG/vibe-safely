"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ScanResult } from "@/lib/scan/types";
import { ScanForm, type ScanRequest } from "@/components/ScanForm";
import { Report } from "@/components/Report";
import { ReplayIcon } from "@/components/icons";
import { DemoWindow } from "./DemoScan";
import { ScanningWindow } from "./ScanningWindow";
import { ScannerWindow } from "./ScannerWindow";

type Status = "demo" | "scanning" | "done";

// The hero stage: a split above the fold. The pitch + scan form stand calmly on the left and
// pin there; on the right, the single scanner window IS the product. It auto-runs the demo on
// load, and the moment a real URL is submitted that same window streams the live scan and
// lands on the real report: promise and proof in one surface. It stacks to one column on
// small screens. `pitch` and `strip` are server-rendered (SEO-visible) and handed in.
export function HeroStage({ pitch, strip }: { pitch: ReactNode; strip: ReactNode }) {
  const [status, setStatus] = useState<Status>("demo");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [domain, setDomain] = useState("");
  const windowRef = useRef<HTMLDivElement>(null);

  async function runScan({ url, owner, previewPro }: ScanRequest) {
    const isDev = process.env.NODE_ENV !== "production";
    setError(null);
    setResult(null);
    setDomain(prettyDomain(url));
    setStatus("scanning");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url,
          ownerConfirmed: owner,
          ...(isDev && previewPro ? { plan: "pro" } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // A failed scan is almost always a fixable input (bad or unreachable URL), so send
        // the visitor back to the form with the reason, and leave the demo running.
        setError(data.error || "Scan failed.");
        setStatus("demo");
      } else {
        setResult(data as ScanResult);
        setStatus("done");
      }
    } catch {
      setError("Network error. Please try again.");
      setStatus("demo");
    }
  }

  function reset() {
    setResult(null);
    setError(null);
    setStatus("demo");
  }

  // On a phone the window sits below the form, so bring a finished scan into view.
  useEffect(() => {
    if (status !== "done" || !windowRef.current) return;
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    windowRef.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, [status]);

  return (
    <div className="grid w-full grid-cols-1 items-start gap-y-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-x-10 xl:gap-x-16">
      {/* ── Left: the pitch + form. Centered on mobile, left-aligned and pinned on desktop so
             the promise stays with the reader while the report scrolls past on the right. ── */}
      <div className="relative isolate text-center lg:sticky lg:top-28 lg:self-start lg:text-left">
        {/* a soft, calm veil pooled behind the copy, so it stays crisp wherever the aurora
            happens to be bright, fading to nothing so the colour keeps its glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-6 -inset-y-8 -z-10"
          style={{
            background:
              "radial-gradient(78% 72% at 40% 38%, rgba(9,8,16,0.64) 0%, rgba(9,8,16,0.34) 56%, transparent 84%)",
          }}
        />
        {pitch}
        <div className="reveal mx-auto mt-9 w-full max-w-md text-left lg:mx-0" style={{ animationDelay: "240ms" }}>
          <ScanForm onScan={runScan} pending={status === "scanning"} error={error} />
        </div>
        {strip}
      </div>

      {/* ── Right: the single scanner window: the actual product. Demo on load, then the
             visitor's own live scan and finished report, in the same frame. ── */}
      <div ref={windowRef} className="reveal scroll-mt-24" style={{ animationDelay: "220ms" }}>
        {status === "demo" && <DemoWindow />}
        {status === "scanning" && <ScanningWindow domain={domain} />}
        {status === "done" && result && (
          <ScannerWindow
            line={{ text: "✓ scan complete", tone: "ok" }}
            pct={100}
            active={false}
            bodyClassName="bg-well/40 p-3 sm:p-4"
          >
            <Report result={result} />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-hairline pt-3">
              <span className="font-mono text-mono text-ink-dim">↑ scan another app</span>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded font-mono text-mono text-ink-dim transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                <ReplayIcon className="h-3.5 w-3.5" />
                New scan
              </button>
            </div>
          </ScannerWindow>
        )}
      </div>
    </div>
  );
}

// A tidy host for the title bar / summary: strip the scheme and any path so "https://acme.app/x"
// reads as "acme.app". Falls back to the raw input if it isn't a parseable URL.
function prettyDomain(raw: string): string {
  const trimmed = raw.trim();
  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withScheme).hostname;
  } catch {
    return trimmed;
  }
}
