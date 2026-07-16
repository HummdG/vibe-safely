"use client";

import { useState } from "react";

// Placeholder until Stripe checkout is wired (task 5). Keeps the CTA honest
// rather than shipping a dead or 404 button.
export function UpgradeButton() {
  const [clicked, setClicked] = useState(false);
  return (
    <div>
      <button
        onClick={() => setClicked(true)}
        className="w-full rounded-md bg-ink px-4 py-2.5 text-meta font-semibold text-canvas transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
      >
        Get Pro
      </button>
      {clicked && (
        <p className="mt-2 text-center text-mono text-ink-muted">
          Checkout is being connected. Pro opens at launch.
        </p>
      )}
    </div>
  );
}
