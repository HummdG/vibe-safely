import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { ArrowRightIcon } from "@/components/icons";

export function CtaSection() {
  return (
    <Section>
      <div className="relative isolate">
        {/* the page's closing moment: a soft dawn bloom rising behind the last call,
            the same colour the hero opens on, bookending the descent */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-20 left-0 -z-10 h-72 w-full max-w-xl"
          style={{
            background:
              "radial-gradient(58% 68% at 28% 42%, rgba(232,121,249,0.16), rgba(86,214,230,0.09) 46%, transparent 76%)",
          }}
        />
        <Reveal className="max-w-2xl">
          <h2 className="font-display text-title font-bold tracking-tight text-ink">
            Find out before someone else does.
          </h2>
        <p className="mt-4 text-body leading-relaxed text-ink-muted">
          Attackers already scan for this automatically. Beat them to it. It takes about thirty
          seconds and costs nothing.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href="#top" size="lg">
            Scan your app
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
          <Link
            href="/pricing"
            className="text-meta font-medium text-ink-muted underline decoration-border underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
          >
            See what Pro adds →
          </Link>
        </div>
        </Reveal>
      </div>
    </Section>
  );
}
