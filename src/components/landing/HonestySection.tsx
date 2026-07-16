import type { CSSProperties } from "react";
import { Section } from "@/components/ui/Section";
import { Panel } from "@/components/ui/Panel";
import { Reveal } from "@/components/ui/Reveal";
import { EyeIcon, MaskIcon, NoStoreIcon } from "@/components/icons";

// "Same app. Two verdicts." The section's subject is honest grading, so it shows the thing
// instead of describing it: one clean, client-only app graded twice. Most scanners round every
// line up to a green pass and hand back an A+; VibeSafely ticks only the four surfaces it could
// actually reach and then WITHHOLDS the letter grade for the two it couldn't. The two columns
// list the same six checks in the same order, so they read row-for-row across the divider.
//
// The motion is that difference, replayed on a shared 9s loop (keyframes in globals.css): the
// left column's marks + A+ tile flash all at once (rounding up in one stamp, --seq-delay 0.5s),
// while the right column's marks resolve one at a time and the withheld dash settles in last.
// Nothing is ever hidden, so it stays legible; reduced-motion / no-JS get the final verdicts,
// still. Server component, all CSS.

// The six checks, true to the honesty example: a client-only app with no backend or AI
// endpoint exposed, so four surfaces are genuinely testable and two have nothing to reach.
const CHECKS = [
  { label: "Exposed secrets in client code", reached: true },
  { label: "Security headers", reached: true },
  { label: "Cookie security flags", reached: true },
  { label: "Client-side AI keys", reached: true },
  { label: "Open database tables", reached: false, reason: "no backend exposed" },
  { label: "Prompt injection", reached: false, reason: "no AI endpoint found" },
] as const;

const delay = (seconds: number) => ({ "--seq-delay": `${seconds}s` }) as CSSProperties;

// Left marks all fire together (one "rounding up" stamp); right marks tick through in sequence.
const ROUND_UP = 0.5;
const RIGHT_MARK = [2.0, 2.4, 2.8, 3.2, 3.7, 4.1];
const RIGHT_SLIP = 4.8;

const ASSURANCES = [
  {
    icon: EyeIcon,
    title: "Read-only",
    body: "It only reads what your site sends the browser, and never logs in, writes, or changes anything.",
  },
  {
    icon: MaskIcon,
    title: "Secrets masked",
    body: "Any key it finds is masked before it reaches your screen. Enough to spot it, never enough to use it.",
  },
  {
    icon: NoStoreIcon,
    title: "Nothing stored",
    body: "The whole report is built in memory and gone when you close the tab. We keep none of it.",
  },
];

export function HonestySection() {
  return (
    <Section
      eyebrow="The honest part"
      eyebrowTick="bg-pass"
      title="We won’t hand you a grade we didn’t earn."
      intro="Most scanners round up to a green checkmark. VibeSafely tells you exactly what it tested, and refuses a letter grade unless it actually reached your backend. Same app, side by side:"
      backdrop
    >
      <Reveal>
        <Panel className="overflow-hidden p-0">
          {/* report chrome: what you're looking at, plus a quiet "grading" pulse so the
              looping pass reads as an active re-grade, not idle flicker */}
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5 sm:px-5">
            <span className="text-meta font-semibold text-ink">
              One clean app, graded twice
            </span>
            <span className="flex items-center gap-2 font-mono text-mono text-ink-dim">
              <span className="grading-dot h-1.5 w-1.5 rounded-full bg-accent-2" aria-hidden />
              grading
            </span>
          </div>

          <div className="grid gap-px bg-hairline/60 sm:grid-cols-2">
            {/* Most scanners: rounds every line up and stamps an A+ */}
            <div className="bg-well px-5 py-6">
              <div className="text-meta font-semibold text-ink-dim">Most scanners</div>
              <p className="mt-0.5 text-meta text-ink-faint">round up to a pass</p>

              <div className="mt-4 flex items-center gap-4">
                <div
                  className="grade-slip grid h-20 w-20 shrink-0 place-items-center rounded-lg border border-pass/40 bg-pass/[0.08] opacity-90"
                  style={delay(ROUND_UP)}
                >
                  <span className="font-display text-[2.5rem] font-extrabold leading-none text-pass/85">
                    A+
                  </span>
                </div>
                <div className="text-meta leading-relaxed text-ink-dim">
                  <span className="font-semibold text-pass/85">All clear</span>
                  <br />
                  every check passed
                </div>
              </div>

              <ul className="mt-5 space-y-2.5">
                {CHECKS.map((c) => (
                  <li key={c.label} className="flex items-baseline gap-2.5 text-meta">
                    <span
                      className="grade-mark inline-block w-3 shrink-0 text-center font-semibold text-pass/75"
                      style={delay(ROUND_UP)}
                      aria-hidden
                    >
                      ✓
                    </span>
                    <span className={c.reached ? "text-ink-muted" : "text-ink-dim"}>
                      {c.label}
                      {!c.reached && (
                        <span className="ml-1 align-super text-[0.6rem] text-ink-faint">rounded up</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-meta leading-relaxed text-ink-dim">
                Two of these were never actually run. The grade got rounded up anyway.
              </p>
            </div>

            {/* VibeSafely: ticks only what it reached, then withholds the grade */}
            <div className="bg-well px-5 py-6">
              <div className="text-meta font-semibold text-ink">VibeSafely</div>
              <p className="mt-0.5 text-meta text-ink-dim">grades only what it reached</p>

              <div className="mt-4 flex items-center gap-4">
                <div
                  className="grade-slip relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-live/40 bg-well"
                  style={delay(RIGHT_SLIP)}
                >
                  {/* the dawn crown: the site's one signature echo, marking this as ours */}
                  <span
                    className="absolute inset-x-3 top-0 h-px bg-[image:var(--gradient-dawn)]"
                    aria-hidden
                  />
                  <span className="font-display text-[2.5rem] font-extrabold leading-none text-ink-muted">
                    –
                  </span>
                </div>
                <div className="text-meta leading-relaxed text-ink-muted">
                  <span className="font-semibold text-live">Not graded</span>
                  <br />
                  and here’s exactly why
                </div>
              </div>

              <ul className="mt-5 space-y-2.5">
                {CHECKS.map((c, i) => (
                  <li key={c.label} className="flex items-baseline gap-2.5 text-meta">
                    {c.reached ? (
                      <span
                        className="grade-mark inline-block w-3 shrink-0 text-center font-semibold text-pass"
                        style={delay(RIGHT_MARK[i])}
                        aria-hidden
                      >
                        ✓
                      </span>
                    ) : (
                      <span
                        className="grade-mark inline-block w-3 shrink-0 text-center font-semibold text-ink-faint"
                        style={delay(RIGHT_MARK[i])}
                        aria-hidden
                      >
                        –
                      </span>
                    )}
                    <span className={c.reached ? "text-ink" : "text-ink-dim"}>
                      {c.label}
                      {!c.reached && (
                        <span className="ml-1 text-ink-faint">({c.reason})</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-5 text-meta leading-relaxed text-ink-muted">
                Reached four of six surfaces. We won’t grade the two we couldn’t see, so no letter.
                Just the truth about what we tested.
              </p>
            </div>
          </div>
        </Panel>
      </Reveal>

      {/* And the scan itself stays honest, too: quiet promises, not another card wall */}
      <Reveal delay={90}>
        <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-3">
          {ASSURANCES.map((a) => (
            <div key={a.title} className="flex gap-3">
              <a.icon className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent-2" />
              <div>
                <div className="text-meta font-semibold text-ink">{a.title}</div>
                <p className="mt-1 text-meta leading-relaxed text-ink-dim">{a.body}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </Section>
  );
}
