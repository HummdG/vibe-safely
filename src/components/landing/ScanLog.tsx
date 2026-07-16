import type { LogLine, LogTone } from "./demoSteps";

const TONE: Record<LogTone, string> = {
  live: "text-live",
  warn: "text-critical",
  ok: "text-pass",
  muted: "text-ink-dim",
};

// The instrument's output. The full variant is a bordered terminal with a progress
// bar. The `compact` variant is a single, borderless, centered "live" line, the
// scanner's current voice, for sitting under the radar in the hero stage.
export function ScanLog({
  lines,
  active,
  progress,
  compact = false,
}: {
  lines: LogLine[];
  active: boolean;
  progress: number;
  compact?: boolean;
}) {
  if (compact) {
    const current = lines[lines.length - 1];
    return (
      <div className="flex items-center justify-center gap-2 font-mono text-mono leading-relaxed">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-live" aria-hidden />
        <span className={`break-words ${TONE[current.tone]}`}>{current.text}</span>
        {active && (
          <span className="caret text-live" aria-hidden>
            ▍
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-well/80 p-4 font-mono text-mono leading-relaxed backdrop-blur-sm">
      <div className="mb-2.5 flex items-center justify-between gap-3 text-mono text-ink-faint">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-live" aria-hidden />
          vibesafely · live
        </span>
        <span className="tabular-nums text-ink-dim">{Math.round(progress * 100)}%</span>
      </div>
      <div
        className={`mb-3 h-1 w-full overflow-hidden rounded-full bg-border ${active ? "progress-shimmer" : ""}`}
      >
        <div
          className="h-full rounded-full bg-live"
          style={{ width: `${Math.round(progress * 100)}%`, transition: "width 0.4s cubic-bezier(0.2, 0.7, 0.2, 1)" }}
        />
      </div>
      <div className="space-y-1">
        {lines.map((l, i) => {
          const isLast = i === lines.length - 1;
          return (
            <div key={i} className={`flex gap-1 break-words ${TONE[l.tone]}`}>
              <span>{l.text}</span>
              {isLast && active && (
                <span className="caret text-live" aria-hidden>
                  ▍
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
