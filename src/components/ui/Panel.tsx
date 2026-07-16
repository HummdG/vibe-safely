import type { ReactNode } from "react";

// The one surface recipe for the whole app: a soft-glass card that lets the colour behind
// breathe through. `hover` adds a gentle lift and a soft violet edge for interactive cards:
// a quiet response, never a scanning beam.
export function Panel({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div className={`card-soft rounded-lg ${hover ? "card-lift" : ""} ${className}`}>
      {children}
    </div>
  );
}
