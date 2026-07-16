import Link from "next/link";
import { LogoMark } from "@/components/icons";
import { getUser, getEntitlements } from "@/lib/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOut } from "@/app/actions/auth";

// Server-rendered header. Shows auth state (sign in / account + balance) when Supabase is
// configured, and degrades to just the marketing nav when it isn't.
export async function SiteHeader() {
  const configured = isSupabaseConfigured();
  const user = configured ? await getUser() : null;
  const ent = user ? await getEntitlements() : null;

  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-canvas/60 backdrop-blur-md">
      <div className="mx-auto grid max-w-7xl grid-cols-[1fr_auto_1fr] items-center px-6 py-4">
        <Link
          href="/"
          className="group flex items-center gap-2.5 justify-self-start"
          aria-label="VibeSafely home"
        >
          <LogoMark />
          <span className="font-display text-body font-bold tracking-tight text-ink">
            VibeSafely
          </span>
        </Link>

        {/* Centered marketing nav */}
        <nav className="flex items-center gap-6 justify-self-center text-meta font-medium text-ink-muted sm:gap-8">
          <Link href="/" className="transition-colors hover:text-ink">
            Scan
          </Link>
          <Link href="/pricing" className="transition-colors hover:text-ink">
            Pricing
          </Link>
        </nav>

        {/* Auth actions, right-aligned */}
        <nav className="flex items-center gap-4 justify-self-end text-meta font-medium text-ink-muted sm:gap-5">
          {user ? (
            <>
              <Link
                href="/account"
                className="rounded-full border border-border bg-surface-2/50 px-2.5 py-1 font-mono text-mono text-ink-muted transition-colors hover:text-ink"
              >
                {ent?.subscribed ? "Unlimited" : `${ent?.credits ?? 0} credits`}
              </Link>
              <form action={signOut}>
                <button type="submit" className="transition-colors hover:text-ink">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/sign-in" className="transition-colors hover:text-ink">
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-md bg-ink px-3 py-1.5 font-semibold text-canvas transition-colors hover:bg-white"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
