import type { ScanResult } from "@/lib/scan/types";
import type { ReportModel } from "./model";
import { Panel } from "../ui/Panel";

// The honesty model, made visible: exactly what this scan tested, what wasn't
// applicable, and what it deliberately didn't test.
export function CoveragePanel({
  result,
  model,
  animate = false,
}: {
  result: ScanResult;
  model: ReportModel;
  animate?: boolean;
}) {
  const { tested, notApplicable, notTested, couldntVerify } = model;
  const full = result.scanDepth === "full";

  return (
    <Panel className={`${animate ? "reveal-in " : ""}p-5`}>
      <h3 className="font-mono text-label uppercase tracking-label text-ink-muted">
        What this {full ? "full" : "surface"} scan covered
      </h3>

      {!full ? (
        <p className="mt-2 text-meta leading-relaxed text-ink-dim">
          A surface scan reads only what your site sends the browser. A clean result means no
          client-side issues. It does <span className="text-ink-muted">not</span> certify your
          database, storage or auth.
        </p>
      ) : couldntVerify ? (
        <p className="mt-2 text-meta leading-relaxed text-ink-dim">
          We looked for a Supabase/Firebase backend or AI endpoint in your app&apos;s code and found
          none exposed. If your app reaches a database through server-side APIs, we can&apos;t see or
          test it from the outside, so it wasn&apos;t verified.
        </p>
      ) : null}

      <div className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <ul className="space-y-1.5 text-meta text-ink-muted">
          {tested.map((c) => (
            <li key={c.title} className="flex gap-2">
              <span className="text-pass" aria-hidden>
                ✓
              </span>
              {c.title}
            </li>
          ))}
        </ul>
        {(notApplicable.length > 0 || notTested.length > 0) && (
          <ul className="space-y-1.5 text-meta text-ink-dim">
            {notApplicable.map((c) => (
              <li key={c.title} className="flex gap-2">
                <span className="text-ink-faint" aria-hidden>
                  –
                </span>
                <span>
                  {c.title} <span className="text-ink-faint">(not applicable, nothing found to test)</span>
                </span>
              </li>
            ))}
            {notTested.map((c) => (
              <li key={c.title} className="flex gap-2">
                <span className="text-medium" aria-hidden>
                  ⚠
                </span>
                <span>
                  {c.title} <span className="text-ink-faint">(not tested)</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {notTested.length > 0 && (
        <p className="mt-4 rounded-md border border-medium/30 bg-medium/[0.06] px-3 py-2.5 text-meta leading-relaxed text-ink-muted">
          {result.deepChecksAvailable ? (
            <>
              <span className="font-semibold text-medium">A Supabase/Firebase backend was detected.</span>{" "}
              The checks that would test it for publicly-readable data were skipped.{" "}
            </>
          ) : (
            <>These are the highest-signal checks: open databases, storage and auth. </>
          )}
          Tick <span className="font-mono text-mono text-ink">&ldquo;I own this app&rdquo;</span> above
          and scan again to run them on an app you own.
        </p>
      )}
    </Panel>
  );
}
