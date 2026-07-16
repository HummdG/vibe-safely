import type Stripe from "stripe";

// Stripe webhook processing, decoupled from Supabase via a small store interface so the
// idempotency + grant logic is unit-testable with a fake store (no DB, no network). The
// route supplies the real Supabase-backed store.

export interface WebhookStore {
  /** Record an event id; `duplicate: true` means it was already processed (replay → skip). */
  recordEvent(id: string, type: string): Promise<{ duplicate: boolean }>;
  /** Roll back a recorded event so Stripe's retry can re-process it after a failure. */
  deleteEvent(id: string): Promise<void>;
  grantCredits(userId: string, amount: number): Promise<void>;
  setSubscription(
    customerId: string,
    status: string | null,
    periodEnd: string | null,
  ): Promise<void>;
}

function subscriptionPeriodEnd(sub: Stripe.Subscription): string | null {
  // `current_period_end` lives at the top level in most API versions and on the item in newer
  // ones — handle both. It's unix seconds.
  const top = (sub as unknown as { current_period_end?: number }).current_period_end;
  const item = sub.items?.data?.[0]?.current_period_end;
  const unix = top ?? item ?? null;
  return unix ? new Date(unix * 1000).toISOString() : null;
}

export async function processStripeEvent(
  event: Stripe.Event,
  store: WebhookStore,
): Promise<void> {
  const { duplicate } = await store.recordEvent(event.id, event.type);
  if (duplicate) return;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // Only one-time credit purchases; subscriptions are handled via subscription.* events.
        if (session.mode === "payment") {
          const userId = session.client_reference_id ?? session.metadata?.userId ?? null;
          const amount = Number(session.metadata?.creditsGrant ?? 0);
          if (userId && amount > 0) {
            await store.grantCredits(userId, amount);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const status = event.type === "customer.subscription.deleted" ? "canceled" : sub.status;
        // Cancellation leaves leftover credits intact by design (only status/period change).
        await store.setSubscription(customerId, status, subscriptionPeriodEnd(sub));
        break;
      }
      default:
        // Unhandled event types are acknowledged (recorded) so Stripe stops retrying them.
        break;
    }
  } catch (e) {
    // Undo the idempotency marker so a retry can re-run this handler.
    await store.deleteEvent(event.id);
    throw e;
  }
}
