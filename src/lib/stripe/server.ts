import "server-only";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

// Lazy singleton so importing this module never requires env at import time (keeps tests and
// the anonymous scan path working before Stripe is configured).
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
    // Pin to the SDK's bundled API version by omitting `apiVersion`.
    cached = new Stripe(key);
  }
  return cached;
}

export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_CREDITS_9 &&
      process.env.STRIPE_PRICE_SUB_19,
  );
}

// One Stripe customer per user, stored on the profile so credits/subscriptions always map back.
export async function getOrCreateCustomer(
  userId: string,
  email: string | undefined,
): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (data?.stripe_customer_id) return data.stripe_customer_id;

  const customer = await getStripe().customers.create({ email, metadata: { userId } });
  await admin.from("profiles").update({ stripe_customer_id: customer.id }).eq("id", userId);
  return customer.id;
}
