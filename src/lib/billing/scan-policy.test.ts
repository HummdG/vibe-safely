import { describe, it, expect } from "vitest";
import { decideScan } from "./scan-policy";
import type { Entitlements } from "./entitlements";

const anon: Entitlements = { userId: null, credits: 0, subscribed: false };
const noCredits: Entitlements = { userId: "u1", credits: 0, subscribed: false };
const withCredits: Entitlements = { userId: "u1", credits: 3, subscribed: false };
const subscriber: Entitlements = { userId: "u1", credits: 0, subscribed: true };

describe("decideScan", () => {
  it("surface scan regardless of who's asking", () => {
    expect(decideScan({ wantsFull: false, ent: anon, devPreview: false }).kind).toBe("surface");
    expect(decideScan({ wantsFull: false, ent: subscriber, devPreview: false }).kind).toBe("surface");
  });

  it("full scan by an anonymous visitor requires auth", () => {
    expect(decideScan({ wantsFull: true, ent: anon, devPreview: false }).kind).toBe("auth_required");
  });

  it("dev preview lets an anonymous full scan through as unlimited", () => {
    expect(decideScan({ wantsFull: true, ent: anon, devPreview: true }).kind).toBe("full_unlimited");
  });

  it("subscribers run full scans without spending credits", () => {
    expect(decideScan({ wantsFull: true, ent: subscriber, devPreview: false }).kind).toBe(
      "full_unlimited",
    );
  });

  it("a signed-in non-subscriber with credits must meter", () => {
    expect(decideScan({ wantsFull: true, ent: withCredits, devPreview: false }).kind).toBe(
      "full_metered",
    );
  });

  it("a signed-in non-subscriber with no credits still routes to metered (route returns 402)", () => {
    expect(decideScan({ wantsFull: true, ent: noCredits, devPreview: false }).kind).toBe(
      "full_metered",
    );
  });
});
