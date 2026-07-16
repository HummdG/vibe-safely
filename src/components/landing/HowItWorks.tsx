import { Section } from "@/components/ui/Section";
import { Panel } from "@/components/ui/Panel";
import { Reveal } from "@/components/ui/Reveal";

// A real sequence, so numbered markers earn their place here.
const STEPS = [
  {
    n: "01",
    title: "Paste your URL",
    body: "No install, no repo access, no account. VibeSafely only reads what your site already sends the browser.",
  },
  {
    n: "02",
    title: "Watch it scan",
    body: "Secrets, headers, databases and AI endpoints: probed in seconds, with masked evidence for anything it finds.",
  },
  {
    n: "03",
    title: "Ship the fix",
    body: "Every finding comes with a copy-ready prompt for Cursor or Claude and a before → after patch.",
  },
];

export function HowItWorks() {
  return (
    <Section eyebrow="How it works" eyebrowTick="bg-pass" title="Paste, scan, fix.">
      <div className="grid gap-8 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 90}>
            <div className="border-t border-border-strong pt-4">
              <span className="font-display text-title font-extrabold text-dawn">{s.n}</span>
              <h3 className="mt-3 font-display text-heading font-bold text-ink">{s.title}</h3>
              <p className="mt-2 text-meta leading-relaxed text-ink-muted">{s.body}</p>
            </div>
          </Reveal>
        ))}
      </div>

      <Reveal delay={120}>
        <Panel className="mt-10 overflow-hidden">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
            <span className="text-meta font-semibold text-accent-2">
              Fix it · paste into Cursor / Claude
            </span>
            <span className="font-mono text-mono text-ink-faint">supabase.ts</span>
          </div>
          <pre className="overflow-x-auto bg-well p-4 font-mono text-mono leading-relaxed">
            <div className="text-critical/90">- const supabase = createClient(url, SUPABASE_SERVICE_ROLE)</div>
            <div className="text-pass/90">+ // the browser uses the anon key; service_role stays server-only</div>
            <div className="text-pass/90">+ const supabase = createClient(url, SUPABASE_ANON_KEY)</div>
          </pre>
        </Panel>
      </Reveal>
    </Section>
  );
}
