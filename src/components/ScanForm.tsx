"use client";

import { useState, type FormEvent } from "react";

export type ScanMode = "surface" | "full";

export interface ScanRequest {
  url: string;
  mode: ScanMode;
}

// The input that drives the scanner window. It collects the URL and hands it up to the stage
// with the chosen depth: a free surface scan (primary), or a metered full scan (needs an
// account). The form keeps no result of its own; there's a single place a scan is shown.
export function ScanForm({
  onScan,
  pending,
  error,
  errorCta,
}: {
  onScan: (req: ScanRequest) => void;
  pending: boolean;
  error?: string | null;
  errorCta?: { href: string; label: string } | null;
}) {
  const [url, setUrl] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onScan({ url, mode: "surface" });
  }

  return (
    <div className="w-full max-w-xl">
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="group relative flex-1 rounded-md border border-border bg-well/70 transition-colors focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/25">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-app.com"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-label="Your app's URL"
              className="w-full rounded-md bg-transparent px-4 py-3 font-mono text-meta text-ink outline-none placeholder:text-ink-dim"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="btn-dawn shrink-0 rounded-md px-5 py-3 text-meta font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            {pending ? "Scanning…" : "Scan for free"}
          </button>
        </div>

        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-meta leading-relaxed">
          <button
            type="button"
            onClick={() => onScan({ url, mode: "full" })}
            disabled={pending}
            className="font-semibold text-accent underline-offset-4 hover:underline disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            Run a full scan →
          </button>
          <span className="text-ink-muted">
            Adds the deep checks (Supabase, Firebase, AI probes) and unlocks every fix. Needs an
            account; only scan apps you own.
          </span>
        </div>
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-critical/40 bg-critical/10 px-4 py-3 text-meta text-critical">
          {error}
          {errorCta && (
            <>
              {" "}
              <a href={errorCta.href} className="font-semibold underline underline-offset-2">
                {errorCta.label}
              </a>
            </>
          )}
        </p>
      )}
    </div>
  );
}
