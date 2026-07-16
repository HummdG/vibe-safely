import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost";
type Size = "md" | "lg";

// primary = the dawn gradient, the one warm, colourful action. ghost = soft hairline.
const VARIANT: Record<Variant, string> = {
  primary: "btn-dawn font-semibold",
  ghost: "card-soft text-ink hover:border-border-strong",
};

const SIZE: Record<Size, string> = {
  md: "px-4 py-2 text-meta",
  lg: "px-5 py-3 text-body",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";

export function Button({
  href,
  variant = "primary",
  size = "md",
  type,
  disabled,
  className = "",
  children,
}: {
  href?: string;
  variant?: Variant;
  size?: Size;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const cls = `${BASE} ${VARIANT[variant]} ${SIZE[size]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} disabled={disabled} className={`${cls} disabled:opacity-60`}>
      {children}
    </button>
  );
}
