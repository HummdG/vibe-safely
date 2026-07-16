import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";
import { Reveal } from "./Reveal";

// One place that owns section rhythm and the eyebrow/title header, so vertical spacing is
// defined once. Sections are separated by generous space and the colour drifting behind
// them. No drawn dividers. (`divider` kept for API compatibility; it's a no-op now.)
export function Section({
  id,
  eyebrow,
  eyebrowTick,
  title,
  intro,
  children,
  backdrop = false,
  className = "",
}: {
  id?: string;
  eyebrow?: string;
  eyebrowTick?: string;
  title?: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  divider?: boolean;
  /** soft veil behind the header text, for sections whose header sits over a bright aurora */
  backdrop?: boolean;
  className?: string;
}) {
  return (
    <section id={id} className={`py-16 sm:py-24 ${className}`}>
      {(eyebrow || title || intro) && (
        <div className={`relative mb-10 max-w-2xl ${backdrop ? "isolate" : ""}`}>
          {backdrop && (
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-x-5 -inset-y-4 -z-10"
              style={{
                background:
                  "radial-gradient(78% 84% at 30% 45%, rgba(9,8,16,0.6), rgba(9,8,16,0.30) 56%, transparent 84%)",
              }}
            />
          )}
          <Reveal>
            {eyebrow && <Eyebrow tick={eyebrowTick}>{eyebrow}</Eyebrow>}
            {title && (
              <h2 className="mt-3 font-display text-title font-bold tracking-tight text-ink">
                {title}
              </h2>
            )}
            {intro && <p className="mt-4 text-body leading-relaxed text-ink-muted">{intro}</p>}
          </Reveal>
        </div>
      )}
      {children}
    </section>
  );
}
