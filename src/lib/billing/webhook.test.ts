import { describe, it, expect } from "vitest";
import type Stripe from "stripe";
import { processStripeEvent, type WebhookStore } from "./webhook";

function makeStore() {
  const processed = new Set<string>();
  const calls = {
    grantCredits: [] as { userId: string; amount: number }[],
    setSubscription: [] as { customerId: string; status: string | null; periodEnd: string | null }[],
    deleted: [] as string[],
  };
  const store: WebhookStore = {
    async recordEvent(id) {
      if (processed.has(id)) return { duplicate: true };
      processed.add(id);
      return { duplicate: false };
    },
    async deleteEvent(id) {
      processed.delete(id);
      calls.deleted.push(id);
    },
    async grantCredits(userId, amount) {
      calls.grantCredits.push({ userId, amount });
    },
    async setSubscription(customerId, status, periodEnd) {
      calls.setSubscription.push({ customerId, status, periodEnd });
    },
  };
  return { store, calls };
}

function creditsCheckout(id: string): Stripe.Event {
  return {
    id,
    type: "checkout.session.completed",
    data: {
      object: {
        mode: "payment",
        client_reference_id: "user_1",
        metadata: { userId: "user_1", creditsGrant: "15" },
      },
    },
  } as unknown as Stripe.Event;
}

describe("processStripeEvent — credit grants", () => {
  it("grants credits from a one-time checkout", async () => {
    const { store, calls } = makeStore();
    await processStripeEvent(creditsCheckout("evt_1"), store);
    expect(calls.grantCredits).toEqual([{ userId: "user_1", amount: 15 }]);
  });

  it("is idempotent: a replayed event grants credits only once", async () => {
    const { store, calls } = makeStore();
    const evt = creditsCheckout("evt_dup");
    await processStripeEvent(evt, store);
    await processStripeEvent(evt, store); // replay
    expect(calls.grantCredits).toHaveLength(1);
  });

  it("ignores subscription-mode checkout sessions (handled via subscription events)", async () => {
    const { store, calls } = makeStore();
    const evt = {
      id: "evt_sub_checkout",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription", client_reference_id: "user_1", metadata: {} } },
    } as unknown as Stripe.Event;
    await processStripeEvent(evt, store);
    expect(calls.grantCredits).toHaveLength(0);
  });
});

describe("processStripeEvent — subscription sync", () => {
  it("syncs status + period end on subscription.updated", async () => {
    const { store, calls } = makeStore();
    const periodEndUnix = Math.floor(Date.UTC(2026, 7, 16) / 1000);
    const evt = {
      id: "evt_sub_1",
      type: "customer.subscription.updated",
      data: {
        object: { customer: "cus_1", status: "active", current_period_end: periodEndUnix },
      },
    } as unknown as Stripe.Event;
    await processStripeEvent(evt, store);
    expect(calls.setSubscription).toEqual([
      { customerId: "cus_1", status: "active", periodEnd: "2026-08-16T00:00:00.000Z" },
    ]);
  });

  it("marks the subscription canceled on subscription.deleted", async () => {
    const { store, calls } = makeStore();
    const evt = {
      id: "evt_sub_del",
      type: "customer.subscription.deleted",
      data: { object: { customer: "cus_1", status: "active", current_period_end: null } },
    } as unknown as Stripe.Event;
    await processStripeEvent(evt, store);
    expect(calls.setSubscription[0]?.status).toBe("canceled");
  });
});

describe("processStripeEvent — failure rollback", () => {
  it("rolls back the idempotency marker so Stripe can retry", async () => {
    const { store, calls } = makeStore();
    // Force the grant to fail.
    store.grantCredits = async () => {
      throw new Error("db down");
    };
    await expect(processStripeEvent(creditsCheckout("evt_fail"), store)).rejects.toThrow("db down");
    expect(calls.deleted).toContain("evt_fail");
  });
});
