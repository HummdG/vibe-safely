import { Eyebrow } from "@/components/ui/Eyebrow";
import { HeroStage } from "./HeroStage";

const STRIP = ["read-only", "secrets masked", "nothing stored"];

// The above-the-fold pitch, standing calmly in the dawn (the aurora lives globally in the
// layout). The scanner window on the right runs a demo, then the visitor's own scan. The
// copy and trust strip are built here (server-rendered, SEO-visible) and handed to the
// client <HeroStage>, which places the scan form between them and owns the live scan.
export function Hero() {
  return (
    <section id="top" className="relative isolate py-16 sm:py-20 lg:py-24">
      <HeroStage
        pitch={
          <>
            <div className="reveal flex justify-center lg:justify-start">
              <Eyebrow tick="bg-accent">Security scanner for AI-built apps</Eyebrow>
            </div>
            <h1
              className="reveal mt-6 font-display text-[1.9rem] font-extrabold leading-[1.06] tracking-tight text-balance text-ink [text-shadow:0_2px_24px_rgba(8,7,15,0.55)] min-[420px]:text-[2.25rem] sm:text-[2.9rem] lg:text-[3.25rem]"
              style={{ animationDelay: "80ms" }}
            >
              Scan your vibe-coded app.
              <br />
              <span className="text-dawn">Breathe easy.</span>
            </h1>
            <p
              className="reveal mx-auto mt-5 max-w-md text-body leading-relaxed text-ink-muted lg:mx-0"
              style={{ animationDelay: "160ms" }}
            >
              Paste a URL. VibeSafely shows you exactly what&apos;s exposed (leaked keys, open
              databases, public <span className="font-mono text-meta text-ink">.env</span> files)
              and honestly flags what it couldn&apos;t test.
            </p>
          </>
        }
        strip={
          <ul
            className="reveal mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-meta text-ink-dim lg:justify-start"
            style={{ animationDelay: "320ms" }}
          >
            {STRIP.map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-accent-2" aria-hidden />
                {s}
              </li>
            ))}
          </ul>
        }
      />
    </section>
  );
}
