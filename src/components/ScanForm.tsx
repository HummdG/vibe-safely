"use client";

import { useState, type FormEvent } from "react";

export interface ScanRequest {
  url: string;
  owner: boolean;
  previewPro: boolean;
}

// The input that drives the scanner window. It collects the URL + options and hands them
// up to the stage, which runs the scan and renders the result in the one window. The form
// keeps no result of its own; there's a single place a scan is shown.
export function ScanForm({
  onScan,
  pending,
  error,
}: {
  onScan: (req: ScanRequest) => void;
  pending: boolean;
  error?: string | null;
}) {
  const [url, setUrl] = useState("");
  const [owner, setOwner] = useState(false);
  const [previewPro, setPreviewPro] = useState(false);
  const isDev = process.env.NODE_ENV !== "production";

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onScan({ url, owner, previewPro });
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

        <label className="flex cursor-pointer items-start gap-2.5 text-meta leading-relaxed text-ink-muted">
          <input
            type="checkbox"
            checked={owner}
            onChange={(e) => setOwner(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span>
            I own this app. Enables the deep checks: Supabase and Firebase access, plus a couple
            of harmless prompt-injection probes to your AI endpoint. Only scan apps you own.
          </span>
        </label>

        {isDev && (
          <label className="flex cursor-pointer items-center gap-2.5 text-meta text-ink-dim">
            <input
              type="checkbox"
              checked={previewPro}
              onChange={(e) => setPreviewPro(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            <span>Preview Pro (dev only): unlock the full fix panel for every finding.</span>
          </label>
        )}
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-critical/40 bg-critical/10 px-4 py-3 text-meta text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
