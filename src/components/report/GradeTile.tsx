import { SEV, gradeToSeverity } from "./severity";

const BOX = "grid h-20 w-20 shrink-0 place-items-center rounded-lg border";

// The report's loudest object: an A–F letter, a warn/pass glyph when ungraded, or a
// pulsing placeholder while the demo scan is still running.
export function GradeTile({
  graded,
  grade,
  warn,
  scanning = false,
}: {
  graded: boolean;
  grade: string;
  warn: boolean;
  scanning?: boolean;
}) {
  if (scanning) {
    return (
      <div className={`tile-breathe ${BOX} border-live/30 bg-well`}>
        <span className="scan-pulse font-mono text-label uppercase tracking-label text-live">
          scan
        </span>
      </div>
    );
  }

  if (graded) {
    const s = SEV[gradeToSeverity(grade)];
    return (
      <div
        className={`grade-land ${BOX} ${s.border} ${s.bg} font-display text-[2.5rem] font-extrabold leading-none ${s.text}`}
      >
        {grade}
      </div>
    );
  }

  const s = warn ? SEV.medium : SEV.pass;
  return (
    <div className={`grade-land ${BOX} ${s.border} ${s.bg} text-[2.25rem] leading-none ${s.text}`}>
      {warn ? "⚠" : "✓"}
    </div>
  );
}
