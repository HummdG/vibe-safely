import { Button } from "../ui/Button";

// Shown to free-plan users when real vulnerabilities were found. Only vulnerabilities
// are gated, passing checks and hardening tips stay fully visible.
export function UpgradeCallout({ count }: { count: number }) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-md border border-border bg-surface p-4 sm:flex-row sm:items-center">
      <p className="text-meta text-ink-muted">
        <span className="font-semibold text-ink">
          {count} issue{count > 1 ? "s" : ""} found.
        </span>{" "}
        Unlock the full details and a one-line fix for each.
      </p>
      <Button href="/pricing" className="shrink-0">
        Unlock fixes
      </Button>
    </div>
  );
}
