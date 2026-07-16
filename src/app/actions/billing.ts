"use server";

import { redirect } from "next/navigation";
import { getUser } from "@/lib/dal";
import { getStripe, getOrCreateCustomer } from "@/lib/stripe/server";
import { CREDITS_PER_PACK } from "@/lib/billing/plans";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// £9 one-off: 15 full-scan credits. One-time Payment Checkout.
export async function startCreditCheckout() {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/pricing");

  const price = process.env.STRIPE_PRICE_CREDITS_9;
  if (!price) throw new Error("STRIPE_PRICE_CREDITS_9 is not set.");

  const customer = await getOrCreateCustomer(user.id, user.email ?? undefined);
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer,
    client_reference_id: user.id,
    // The webhook grants credits from this metadata, so the amount lives with the purchase.
    metadata: { userId: user.id, creditsGrant: String(CREDITS_PER_PACK) },
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/account?checkout=credits`,
    cancel_url: `${appUrl()}/pricing`,
  });

  redirect(session.url!);
}

// £19/mo: unlimited full scans + monitoring. Subscription Checkout.
export async function startSubscriptionCheckout() {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/pricing");

  const price = process.env.STRIPE_PRICE_SUB_19;
  if (!price) throw new Error("STRIPE_PRICE_SUB_19 is not set.");

  const customer = await getOrCreateCustomer(user.id, user.email ?? undefined);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer,
    client_reference_id: user.id,
    metadata: { userId: user.id },
    line_items: [{ price, quantity: 1 }],
    success_url: `${appUrl()}/account?checkout=subscription`,
    cancel_url: `${appUrl()}/pricing`,
  });

  redirect(session.url!);
}

// Manage / cancel an existing subscription via Stripe's hosted Billing Portal.
export async function openBillingPortal() {
  const user = await getUser();
  if (!user) redirect("/sign-in?next=/account");

  const customer = await getOrCreateCustomer(user.id, user.email ?? undefined);
  const session = await getStripe().billingPortal.sessions.create({
    customer,
    return_url: `${appUrl()}/account`,
  });

  redirect(session.url!);
}
