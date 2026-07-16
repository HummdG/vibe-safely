import { describe, it, expect } from "vitest";
import { priceToGrant, CREDITS_PER_PACK } from "./plans";

const ids = { credits: "price_credits_9", subscription: "price_sub_19" };

describe("priceToGrant", () => {
  it("maps the credits price to a 15-credit grant", () => {
    expect(priceToGrant("price_credits_9", ids)).toEqual({
      kind: "credits",
      amount: CREDITS_PER_PACK,
    });
  });

  it("maps the subscription price to a subscription grant", () => {
    expect(priceToGrant("price_sub_19", ids)).toEqual({ kind: "subscription" });
  });

  it("returns null for an unknown price", () => {
    expect(priceToGrant("price_other", ids)).toBeNull();
  });

  it("returns null for a missing price id", () => {
    expect(priceToGrant(null, ids)).toBeNull();
    expect(priceToGrant(undefined, ids)).toBeNull();
  });

  it("never matches when the configured ids are undefined", () => {
    expect(priceToGrant("price_credits_9", { credits: undefined, subscription: undefined })).toBeNull();
  });
});
