import type { ReactNode } from "react";
import type { LogLine, LogTone } from "./demoSteps";

// The scan line's colour by tone, for the live status in the window's title bar.
const LINE_TONE: Record<LogTone, string> = {
  live: "text-live",
  warn: "text-critical",
  ok: "text-pass",
  muted: "text-ink-dim",
};

// The one scanner-window shell: a title bar streaming the current scan line + progress,
// a progress track, and a well-lit body. It's the product surface: the auto-running demo,
// a live scan, and a finished real report all wear this exact frame, so a real result is
// indistinguishable from the demo the visitor was shown.
export function ScannerWindow({
  line,
  pct,
  active,
  fill = "live",
  children,
  bodyClassName = "space-y-3 bg-well/40 p-3 sm:p-4",
}: {
  line: LogLine;
  pct: number;
  active: boolean;
  /** progress-fill colour; a failed scan tints the bar instead of reading as complete */
  fill?: "live" | "critical";
  children: ReactNode;
  bodyClassName?: string;
}) {
  return (
    <div className="card-soft overflow-hidden rounded-xl">
      {/* title bar: what the scanner is doing right now */}
      <div className="flex items-center gap-3 border-b border-hairline px-4 py-3 font-mono text-mono">
        <span className="flex shrink-0 items-center gap-2 text-ink-dim">
          <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
          vibesafely
        </span>
        <span className={`min-w-0 flex-1 truncate ${LINE_TONE[line.tone]}`}>
          {line.text}
          {active && (
            <span className="caret text-live" aria-hidden>
              ▍
            </span>
          )}
        </span>
        <span className="shrink-0 tabular-nums text-ink-dim">{pct}%</span>
      </div>

      {/* the progress track under the title bar */}
      <div className={`h-0.5 w-full overflow-hidden bg-border ${active ? "progress-shimmer" : ""}`}>
        <div
          className={`h-full ${fill === "critical" ? "bg-critical" : "bg-live"}`}
          style={{ width: `${pct}%`, transition: "width 0.4s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </div>

      {/* the body: the report (demo, live, or finished) */}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
