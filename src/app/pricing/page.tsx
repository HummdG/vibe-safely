import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { CheckoutButton } from "@/components/CheckoutButton";
import { isStripeConfigured } from "@/lib/stripe/server";
import { startCreditCheckout, startSubscriptionCheckout } from "@/app/actions/billing";

export const metadata: Metadata = { title: "Pricing" };

type Plan = {
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  highlighted?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Free",
    price: "£0",
    cadence: "forever",
    tagline: "Try it on any app, no account.",
    features: [
      "Unlimited surface scans",
      "Every issue by name and severity",
      "An A–F grade",
      "Hardening tips",
    ],
  },
  {
    name: "Credits",
    price: "£9",
    cadence: "one-off",
    tagline: "For shipping a few real fixes.",
    features: [
      "15 full scans",
      "Deep checks: Supabase, Firebase, AI probes",
      "Full detail + masked evidence",
      "Copy-ready AI fix prompt + patch",
      "Credits never expire",
    ],
  },
  {
    name: "Unlimited",
    price: "£19",
    cadence: "per month",
    tagline: "Ship, then keep it safe.",
    highlighted: true,
    features: [
      "Everything in Credits",
      "Unlimited full scans",
      "Continuous monitoring (coming soon)",
      "Email alerts on new issues (coming soon)",
    ],
  },
];

function Check() {
  return (
    <span className="mt-0.5 shrink-0 text-pass" aria-hidden>
      ✓
    </span>
  );
}

function ComingSoon() {
  return (
    <span className="rounded-md border border-border px-3 py-2.5 text-center text-meta font-semibold text-ink-dim">
      Opens at launch
    </span>
  );
}

export default function PricingPage() {
  const stripeReady = isStripeConfigured();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16 sm:py-24">
      <Reveal className="max-w-2xl">
        <Eyebrow tick="bg-pass">Pricing</Eyebrow>
        <h1 className="mt-4 font-display text-title font-bold tracking-tight text-ink sm:text-[2.25rem]">
          Find it free. <span className="text-pass">Fix it when you&apos;re ready.</span>
        </h1>
        <p className="mt-4 text-body leading-relaxed text-ink-muted">
          Surface scans are free and unlimited. A full scan runs the deep checks and unlocks the
          fix for every issue. New accounts start with 3 free full scans.
        </p>
      </Reveal>

      <Reveal delay={80} className="mt-10 grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.name}
            className={`flex flex-col rounded-lg border bg-surface p-6 ${
              plan.highlighted ? "border-accent/60 ring-1 ring-accent/20" : "border-border"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-body font-bold text-ink">{plan.name}</h2>
              {plan.highlighted && (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-mono text-accent">
                  popular
                </span>
              )}
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-display text-title font-bold text-ink">{plan.price}</span>
              <span className="font-mono text-mono text-ink-dim">{plan.cadence}</span>
            </div>
            <p className="mt-2 text-meta text-ink-muted">{plan.tagline}</p>

            <ul className="mt-5 flex-1 space-y-2.5">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-meta text-ink-muted">
                  <Check />
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-6">
              {plan.name === "Free" ? (
                <Button href="/#top" variant="ghost" size="lg" className="w-full">
                  Start a free scan
                </Button>
              ) : plan.name === "Credits" ? (
                stripeReady ? (
                  <CheckoutButton action={startCreditCheckout} variant="ghost">
                    Buy 15 scans
                  </CheckoutButton>
                ) : (
                  <ComingSoon />
                )
              ) : stripeReady ? (
                <CheckoutButton action={startSubscriptionCheckout}>Subscribe</CheckoutButton>
              ) : (
                <ComingSoon />
              )}
            </div>
          </div>
        ))}
      </Reveal>

      <p className="mt-12 font-mono text-mono text-ink-dim">
        We never store your keys or your scan results. Authorized, defensive use only.
      </p>
    </main>
  );
}
