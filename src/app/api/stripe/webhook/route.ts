import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processStripeEvent, type WebhookStore } from "@/lib/billing/webhook";

export const runtime = "nodejs";

// Supabase-backed implementation of the store the pure processor needs.
function supabaseStore(admin: ReturnType<typeof createAdminClient>): WebhookStore {
  return {
    async recordEvent(id, type) {
      const { error } = await admin
        .from("processed_stripe_events")
        .insert({ event_id: id, type });
      if (error) {
        // 23505 = unique_violation → we've already processed this event.
        if (error.code === "23505") return { duplicate: true };
        throw error;
      }
      return { duplicate: false };
    },
    async deleteEvent(id) {
      await admin.from("processed_stripe_events").delete().eq("event_id", id);
    },
    async grantCredits(userId, amount) {
      const { error } = await admin.rpc("grant_full_scan_credits", {
        p_user: userId,
        p_amount: amount,
      });
      if (error) throw error;
    },
    async setSubscription(customerId, status, periodEnd) {
      const { error } = await admin
        .from("profiles")
        .update({
          subscription_status: status,
          subscription_current_period_end: periodEnd,
        })
        .eq("stripe_customer_id", customerId);
      if (error) throw error;
    },
  };
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  // Raw body is required for signature verification — do NOT parse as JSON first.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    await processStripeEvent(event, supabaseStore(createAdminClient()));
  } catch {
    // Return 500 so Stripe retries; the event marker was rolled back inside the processor.
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
