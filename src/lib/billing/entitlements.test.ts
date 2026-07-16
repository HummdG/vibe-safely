import { describe, it, expect } from "vitest";
import {
  isSubscribed,
  computeEntitlements,
  entitlementToPlan,
  anonymousEntitlements,
} from "./entitlements";

const NOW = new Date("2026-07-16T00:00:00Z");
const FUTURE = "2026-08-16T00:00:00Z";
const PAST = "2026-06-16T00:00:00Z";

describe("isSubscribed", () => {
  it("true when active and the period end is in the future", () => {
    expect(
      isSubscribed({ subscription_status: "active", subscription_current_period_end: FUTURE }, NOW),
    ).toBe(true);
  });

  it("true for trialing with a future end", () => {
    expect(
      isSubscribed({ subscription_status: "trialing", subscription_current_period_end: FUTURE }, NOW),
    ).toBe(true);
  });

  it("true when active with no recorded period end", () => {
    expect(
      isSubscribed({ subscription_status: "active", subscription_current_period_end: null }, NOW),
    ).toBe(true);
  });

  it("false when the period end has passed", () => {
    expect(
      isSubscribed({ subscription_status: "active", subscription_current_period_end: PAST }, NOW),
    ).toBe(false);
  });

  it("false for canceled / past_due / null status", () => {
    expect(
      isSubscribed({ subscription_status: "canceled", subscription_current_period_end: FUTURE }, NOW),
    ).toBe(false);
    expect(
      isSubscribed({ subscription_status: "past_due", subscription_current_period_end: FUTURE }, NOW),
    ).toBe(false);
    expect(
      isSubscribed({ subscription_status: null, subscription_current_period_end: null }, NOW),
    ).toBe(false);
  });
});

describe("computeEntitlements", () => {
  it("returns zero credits for a null profile row", () => {
    expect(computeEntitlements("u1", null, NOW)).toEqual({
      userId: "u1",
      credits: 0,
      subscribed: false,
    });
  });

  it("reads credits and subscription from the row", () => {
    const ent = computeEntitlements(
      "u1",
      {
        full_scan_credits: 5,
        subscription_status: "active",
        subscription_current_period_end: FUTURE,
      },
      NOW,
    );
    expect(ent).toEqual({ userId: "u1", credits: 5, subscribed: true });
  });

  it("clamps negative/null credits to zero", () => {
    expect(
      computeEntitlements(
        "u1",
        { full_scan_credits: -3, subscription_status: null, subscription_current_period_end: null },
        NOW,
      ).credits,
    ).toBe(0);
  });
});

describe("entitlementToPlan", () => {
  it("pro when subscribed", () => {
    expect(entitlementToPlan({ credits: 0, subscribed: true })).toBe("pro");
  });
  it("pro when credits remain", () => {
    expect(entitlementToPlan({ credits: 2, subscribed: false })).toBe("pro");
  });
  it("free when no credits and not subscribed", () => {
    expect(entitlementToPlan({ credits: 0, subscribed: false })).toBe("free");
  });
});

describe("anonymousEntitlements", () => {
  it("is a null user with no entitlements", () => {
    expect(anonymousEntitlements()).toEqual({ userId: null, credits: 0, subscribed: false });
  });
});
