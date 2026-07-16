import type { ReactNode } from "react";

// A submit button that invokes a Stripe-checkout server action. Rendering it as a plain
// <form action={serverAction}> keeps the price IDs and secret key entirely server-side.
export function CheckoutButton({
  action,
  children,
  variant = "solid",
}: {
  action: () => Promise<void>;
  children: ReactNode;
  variant?: "solid" | "ghost";
}) {
  const base =
    "w-full rounded-md px-4 py-2.5 text-meta font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas";
  const style =
    variant === "solid"
      ? "bg-ink text-canvas hover:bg-white"
      : "border border-border text-ink hover:bg-surface-2/60";

  return (
    <form action={action}>
      <button type="submit" className={`${base} ${style}`}>
        {children}
      </button>
    </form>
  );
}
