import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Reveal } from "@/components/ui/Reveal";
import { CheckoutButton } from "@/components/CheckoutButton";
import { ApiKeysManager, type ApiKeyRow } from "@/components/account/ApiKeysManager";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isStripeConfigured } from "@/lib/stripe/server";
import { computeEntitlements, isSubscribed, type ProfileRow } from "@/lib/billing/entitlements";
import {
  startCreditCheckout,
  startSubscriptionCheckout,
  openBillingPortal,
} from "@/app/actions/billing";

export const metadata: Metadata = { title: "Account" };

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect("/");

  const user = await getUser();
  if (!user) redirect("/sign-in?next=/account");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_scan_credits, subscription_status, subscription_current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  const row = (profile ?? null) as ProfileRow | null;
  const ent = computeEntitlements(user.id, row);
  const subscribed = row ? isSubscribed(row) : false;
  const stripeReady = isStripeConfigured();

  const { data: scans } = await supabase
    .from("scan_events")
    .select("target_domain, scan_depth, plan, credit_spent, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  const { data: apiKeys } = await supabase
    .from("api_keys")
    .select("id, key_prefix, label, created_at, last_used_at")
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  const { checkout } = await searchParams;
  const successNote =
    checkout === "credits"
      ? "Payment received — your credits have been added."
      : checkout === "subscription"
        ? "You're subscribed. Enjoy unlimited full scans."
        : null;

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
      <Reveal>
        <Eyebrow tick="bg-accent">Account</Eyebrow>
        <h1 className="mt-4 font-display text-title font-bold tracking-tight text-ink">
          {user.email}
        </h1>
      </Reveal>

      {successNote && (
        <p className="mt-6 rounded-md border border-pass/40 bg-pass/10 px-4 py-3 text-meta text-ink">
          {successNote}
        </p>
      )}

      <Reveal delay={60} className="mt-8 grid gap-4 sm:grid-cols-2">
        {/* Credits */}
        <div className="flex flex-col rounded-lg border border-border bg-surface p-6">
          <span className="font-mono text-label uppercase tracking-label text-ink-dim">
            Full-scan credits
          </span>
          <span className="mt-2 font-display text-title font-bold text-ink">
            {subscribed ? "Unlimited" : ent.credits}
          </span>
          <p className="mt-1 flex-1 text-meta text-ink-muted">
            {subscribed
              ? "Your subscription covers unlimited full scans."
              : "Each full scan spends one credit. Credits never expire."}
          </p>
          <div className="mt-5">
            {stripeReady ? (
              <CheckoutButton action={startCreditCheckout} variant="ghost">
                Buy 15 more (£9)
              </CheckoutButton>
            ) : (
              <span className="block rounded-md border border-border px-4 py-2.5 text-center text-meta text-ink-dim">
                Checkout opens at launch
              </span>
            )}
          </div>
        </div>

        {/* Plan */}
        <div className="flex flex-col rounded-lg border border-border bg-surface p-6">
          <span className="font-mono text-label uppercase tracking-label text-ink-dim">Plan</span>
          <span className="mt-2 font-display text-title font-bold text-ink">
            {subscribed ? "Unlimited" : "Pay as you go"}
          </span>
          <p className="mt-1 flex-1 text-meta text-ink-muted">
            {subscribed
              ? `£19/mo · renews ${formatDate(row?.subscription_current_period_end ?? null)}`
              : "£19/mo unlocks unlimited full scans and continuous monitoring."}
          </p>
          <div className="mt-5">
            {!stripeReady ? (
              <span className="block rounded-md border border-border px-4 py-2.5 text-center text-meta text-ink-dim">
                Checkout opens at launch
              </span>
            ) : subscribed ? (
              <CheckoutButton action={openBillingPortal} variant="ghost">
                Manage billing
              </CheckoutButton>
            ) : (
              <CheckoutButton action={startSubscriptionCheckout}>Subscribe</CheckoutButton>
            )}
          </div>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-10">
        <ApiKeysManager keys={(apiKeys ?? []) as ApiKeyRow[]} />
      </Reveal>

      <Reveal delay={120} className="mt-10">
        <h2 className="font-mono text-label uppercase tracking-label text-ink-dim">Recent scans</h2>
        {scans && scans.length > 0 ? (
          <ul className="mt-3 divide-y divide-hairline overflow-hidden rounded-lg border border-border bg-surface">
            {scans.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-meta">
                <span className="truncate font-mono text-ink">{s.target_domain}</span>
                <span className="flex shrink-0 items-center gap-3 text-ink-dim">
                  <span className="capitalize">{s.scan_depth}</span>
                  {s.credit_spent && <span className="text-ink-muted">−1 credit</span>}
                  <span className="font-mono text-mono">{formatDate(s.created_at)}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 rounded-lg border border-border bg-surface px-4 py-6 text-center text-meta text-ink-dim">
            No scans yet.{" "}
            <Link href="/#top" className="font-semibold text-accent hover:underline">
              Run your first
            </Link>
            .
          </p>
        )}
      </Reveal>
    </main>
  );
}
