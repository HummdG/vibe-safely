// Maps a Stripe price ID to what it grants. Pure and config-injected so it's unit-testable
// without env or the Stripe SDK. The webhook and checkout actions both read from here, so the
// "£9 = 15 credits" fact lives in exactly one place.

export const CREDITS_PER_PACK = 15;

export type Grant = { kind: "credits"; amount: number } | { kind: "subscription" };

export interface PriceIds {
  credits: string | undefined;
  subscription: string | undefined;
}

export function priceIdsFromEnv(): PriceIds {
  return {
    credits: process.env.STRIPE_PRICE_CREDITS_9,
    subscription: process.env.STRIPE_PRICE_SUB_19,
  };
}

export function priceToGrant(
  priceId: string | null | undefined,
  ids: PriceIds = priceIdsFromEnv(),
): Grant | null {
  if (!priceId) return null;
  if (ids.credits && priceId === ids.credits) return { kind: "credits", amount: CREDITS_PER_PACK };
  if (ids.subscription && priceId === ids.subscription) return { kind: "subscription" };
  return null;
}
