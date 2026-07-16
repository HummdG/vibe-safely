// Pure entitlement logic — no Supabase/Stripe imports, so it's trivially unit-testable.
// The route and the account page turn a `profiles` row into these, then decide what a
// user is allowed to do. Quotas are always resolved server-side from here.

import type { Plan } from "@vibesafely/scan-core";

export interface ProfileRow {
  full_scan_credits: number | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
}

export interface Entitlements {
  /** null when the caller is anonymous. */
  userId: string | null;
  /** Remaining one-off full-scan credits. */
  credits: number;
  /** True when an active/trialing subscription covers unlimited full scans. */
  subscribed: boolean;
}

// Stripe subscription statuses that entitle the user to unlimited full scans.
const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export function isSubscribed(
  row: Pick<ProfileRow, "subscription_status" | "subscription_current_period_end">,
  now: Date = new Date(),
): boolean {
  if (!row.subscription_status || !ACTIVE_STATUSES.has(row.subscription_status)) return false;
  // Active with no recorded period end: treat as covered (we simply haven't synced an end yet).
  if (!row.subscription_current_period_end) return true;
  return new Date(row.subscription_current_period_end).getTime() > now.getTime();
}

export function computeEntitlements(
  userId: string,
  row: ProfileRow | null,
  now: Date = new Date(),
): Entitlements {
  if (!row) return { userId, credits: 0, subscribed: false };
  return {
    userId,
    credits: Math.max(0, row.full_scan_credits ?? 0),
    subscribed: isSubscribed(row, now),
  };
}

/**
 * Whether the user can run a full (unlocked) scan right now without buying more.
 * "pro" = eligible (subscribed or has credits); "free" = not. The route still decides the
 * *actual* per-scan plan by whether a credit is successfully reserved.
 */
export function entitlementToPlan(ent: Pick<Entitlements, "credits" | "subscribed">): Plan {
  return ent.subscribed || ent.credits > 0 ? "pro" : "free";
}

export function anonymousEntitlements(): Entitlements {
  return { userId: null, credits: 0, subscribed: false };
}
