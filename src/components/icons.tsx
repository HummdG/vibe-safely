// Small, crisp line icons (stroke = currentColor). No emoji, no icon library.

type Props = { className?: string };

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function EyeIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function MaskIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 5v14M5.5 8l13 8M18.5 8l-13 8" />
    </svg>
  );
}

export function NoStoreIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <ellipse cx="12" cy="6" rx="7" ry="3" />
      <path d="M5 6v6c0 1.4 2.2 2.6 5.3 2.9" />
      <path d="M19 6v4.5" />
      <path d="M5 12.5V18c0 1.6 3.1 3 7 3 1 0 2-.1 2.8-.3" />
      <path d="M4 4l16 16" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function RotateIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M20 12a8 8 0 1 1-2.3-5.6" />
      <path d="M20 4v4h-4" />
    </svg>
  );
}

export function LockIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ClipboardIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <rect x="6" y="4" width="12" height="17" rx="2" />
      <path d="M9 4V3.2A1.2 1.2 0 0 1 10.2 2h3.6A1.2 1.2 0 0 1 15 3.2V4" />
    </svg>
  );
}

export function DatabaseIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3" />
    </svg>
  );
}

export function SparkIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M12 3l1.7 4.9L18.6 9.6l-4.9 1.7L12 16.2l-1.7-4.9L5.4 9.6l4.9-1.7L12 3Z" />
      <path d="M19 14.5l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7.7-1.9Z" />
    </svg>
  );
}

export function ChevronIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ReplayIcon({ className = "h-5 w-5" }: Props) {
  return (
    <svg {...base} className={className} aria-hidden>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4h4" />
    </svg>
  );
}

// The wordmark's glyph: five bars in the five severity colors, the scanner's own
// language, descending from critical to pass.
export function LogoMark({ className = "h-6 w-6" }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect x="2.4" y="3" width="2.7" height="18" rx="1" className="fill-critical" />
      <rect x="6.9" y="6" width="2.7" height="15" rx="1" className="fill-high" />
      <rect x="11.4" y="9" width="2.7" height="12" rx="1" className="fill-medium" />
      <rect x="15.9" y="12" width="2.7" height="9" rx="1" className="fill-low" />
      <rect x="20.4" y="15" width="2.7" height="6" rx="1" className="fill-pass" />
    </svg>
  );
}
