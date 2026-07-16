"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label,
  primary = false,
}: {
  text: string;
  label: string;
  primary?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for older browsers / insecure contexts.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently */
      }
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const base =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-mono font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
  const style = primary
    ? "bg-accent text-accent-ink hover:bg-[#f2a6ff]"
    : "border border-border text-ink hover:border-border-strong";

  return (
    <button type="button" onClick={copy} className={`${base} ${style}`}>
      {copied ? "Copied!" : label}
    </button>
  );
}
