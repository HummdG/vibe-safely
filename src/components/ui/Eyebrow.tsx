import type { ReactNode } from "react";

// A soft section label: friendly sans, sentence case, gently tinted. A small colored dot
// can tie it to the section's meaning. Calm signposting, not a classification stamp.
export function Eyebrow({
  children,
  tick,
  className = "",
}: {
  children: ReactNode;
  tick?: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-meta font-semibold text-accent-2 ${className}`}
    >
      {tick && <span className={`h-1.5 w-1.5 rounded-full ${tick}`} aria-hidden />}
      {children}
    </span>
  );
}
