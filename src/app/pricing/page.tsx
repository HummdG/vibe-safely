import { Fragment } from "react";
import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { UpgradeButton } from "@/components/UpgradeButton";

export const metadata: Metadata = { title: "Pricing" };

// The pricing table mirrors the report's own coverage panel: a ledger of capabilities
// grouped by the phase of work they belong to, so pricing reads like the product.
const PHASES: { label: string; rows: { label: string; free: boolean; pro: boolean }[] }[] = [
  {
    label: "Detection",
    rows: [
      { label: "Unlimited surface scans", free: true, pro: true },
      { label: "Every issue by name and severity", free: true, pro: true },
      { label: "An A–F grade on apps you own", free: true, pro: true },
      { label: "Hardening tips, with fixes", free: true, pro: true },
    ],
  },
  {
    label: "Explanation",
    rows: [
      { label: "Full explanation for every vulnerability", free: false, pro: true },
      { label: "Masked evidence for each finding", free: false, pro: true },
    ],
  },
  {
    label: "Remediation",
    rows: [
      { label: "Copy-ready AI fix prompt per issue", free: false, pro: true },
      { label: "A before → after patch per issue", free: false, pro: true },
    ],
  },
  {
    label: "Monitoring",
    rows: [
      { label: "Continuous monitoring and email alerts", free: false, pro: true },
      { label: "Shareable report and pass badge", free: false, pro: true },
    ],
  },
];

function Cell({ on }: { on: boolean }) {
  return on ? (
    <span className="text-pass" aria-label="included">
      ✓
    </span>
  ) : (
    <span className="text-ink-faint" aria-label="not included">
      –
    </span>
  );
}

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <Reveal className="max-w-2xl">
        <Eyebrow tick="bg-pass">Pricing</Eyebrow>
        <h1 className="mt-4 font-display text-title font-bold tracking-tight text-ink sm:text-[2.25rem]">
          Find it free. <span className="text-pass">Fix it on Pro.</span>
        </h1>
        <p className="mt-4 text-body leading-relaxed text-ink-muted">
          Finding the problem is free, forever. Pro is for shipping the fix and keeping it fixed.
        </p>
      </Reveal>

      <Reveal className="mt-10 overflow-hidden rounded-lg border border-border bg-surface shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border">
              <th className="px-5 py-4">
                <span className="font-mono text-label uppercase tracking-label text-ink-dim">
                  Capability
                </span>
              </th>
              <th className="w-20 px-3 py-4 text-center sm:w-28">
                <div className="font-display text-body font-bold text-ink">Free</div>
                <div className="mt-0.5 font-mono text-mono text-ink-dim">£0</div>
              </th>
              <th className="w-24 border-l border-border bg-surface-2/50 px-3 py-4 text-center sm:w-32">
                <div className="font-display text-body font-bold text-ink">Pro</div>
                <div className="mt-0.5 font-mono text-mono text-accent">£29 · mo</div>
              </th>
            </tr>
          </thead>
          <tbody>
            {PHASES.map((p) => (
              <Fragment key={p.label}>
                <tr className="bg-surface-2/30">
                  <td
                    colSpan={3}
                    className="px-5 pb-1.5 pt-4 font-mono text-label uppercase tracking-label text-ink-dim"
                  >
                    {p.label}
                  </td>
                </tr>
                {p.rows.map((r) => (
                  <tr key={r.label} className="border-t border-hairline">
                    <td className="px-5 py-2.5 text-meta text-ink-muted">{r.label}</td>
                    <td className="px-3 py-2.5 text-center">
                      <Cell on={r.free} />
                    </td>
                    <td className="border-l border-border bg-surface-2/50 px-3 py-2.5 text-center">
                      <Cell on={r.pro} />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Reveal>

      <Reveal delay={80} className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Button href="/#top" variant="ghost" size="lg">
            Start a free scan
          </Button>
          <span className="text-center font-mono text-mono text-ink-dim">No account needed.</span>
        </div>
        <div className="flex flex-col gap-2">
          <UpgradeButton />
          <span className="text-center font-mono text-mono text-ink-dim">
            Everything you need to fix what we find.
          </span>
        </div>
      </Reveal>

      <p className="mt-12 font-mono text-mono text-ink-dim">
        We never store your keys or your scan results. Authorized, defensive use only.
      </p>
    </main>
  );
}
