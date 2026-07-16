"use client";

import { useActionState, useState } from "react";
import { createApiKey, revokeApiKey, type CreateKeyState } from "@/app/actions/api-keys";

export interface ApiKeyRow {
  id: string;
  key_prefix: string;
  label: string | null;
  created_at: string;
  last_used_at: string | null;
}

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ApiKeysManager({ keys }: { keys: ApiKeyRow[] }) {
  const [state, formAction, pending] = useActionState<CreateKeyState, FormData>(
    createApiKey,
    undefined,
  );
  const [copied, setCopied] = useState(false);

  return (
    <div>
      <h2 className="font-mono text-label uppercase tracking-label text-ink-dim">API keys</h2>
      <p className="mt-2 text-meta text-ink-muted">
        Connect the VibeSafely MCP server to Claude Code and scan your app — including{" "}
        <span className="font-mono text-ink">localhost</span> before you deploy. A key is needed
        for full scans; each spends 1 credit (unlimited while subscribed).
      </p>

      {/* Newly created key — shown exactly once */}
      {state?.plaintext && (
        <div className="mt-4 rounded-lg border border-pass/40 bg-pass/10 p-4">
          <p className="text-meta font-semibold text-ink">
            Copy your key now — you won&apos;t be able to see it again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-md border border-border bg-well/70 px-3 py-2 font-mono text-mono text-ink">
              {state.plaintext}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(state.plaintext!);
                setCopied(true);
              }}
              className="shrink-0 rounded-md border border-border px-3 py-2 text-meta font-semibold text-ink transition-colors hover:bg-surface-2/60"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {state?.error && (
        <p className="mt-3 rounded-md border border-critical/40 bg-critical/10 px-4 py-3 text-meta text-critical">
          {state.error}
        </p>
      )}

      {/* Create */}
      <form action={formAction} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          name="label"
          placeholder="Label (e.g. my-laptop)"
          className="flex-1 rounded-md border border-border bg-well/70 px-4 py-2.5 font-mono text-meta text-ink outline-none transition-colors placeholder:text-ink-dim focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-md bg-ink px-4 py-2.5 text-meta font-semibold text-canvas transition-colors hover:bg-white disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create key"}
        </button>
      </form>

      {/* List */}
      {keys.length > 0 ? (
        <ul className="mt-4 divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3 text-meta">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-ink">
                  {k.key_prefix}
                  <span className="text-ink-dim">…</span>
                  {k.label ? <span className="ml-2 text-ink-muted">{k.label}</span> : null}
                </span>
                <span className="font-mono text-mono text-ink-dim">
                  created {fmt(k.created_at)} ·{" "}
                  {k.last_used_at ? `last used ${fmt(k.last_used_at)}` : "never used"}
                </span>
              </span>
              <form action={revokeApiKey.bind(null, k.id)}>
                <button
                  type="submit"
                  className="shrink-0 text-ink-dim transition-colors hover:text-critical"
                >
                  Revoke
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-6 text-center text-meta text-ink-dim">
          No API keys yet.
        </p>
      )}
    </div>
  );
}
