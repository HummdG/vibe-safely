import { Button } from "../ui/Button";

// Shown on a locked (surface-scan) report when real vulnerabilities were found. A full scan
// unlocks the detail + fix for each; new accounts get 3 free. Only vulnerabilities are gated —
// passing checks and hardening tips stay fully visible.
export function UpgradeCallout({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <p className="text-meta text-ink-muted">
        <span className="font-semibold text-ink">
          {count} issue{count > 1 ? "s" : ""} found.
        </span>{" "}
        Run a full scan to unlock the details and a fix for each — 3 free with an account.
      </p>
      <Button href="/pricing" className="shrink-0">
        See plans
      </Button>
    </div>
  );
}
