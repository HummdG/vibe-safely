import type { Entitlements } from "./entitlements";

// Decides, from server-resolved entitlements alone, what kind of scan to run. Pure and
// exhaustively unit-testable; the route wires the DB (credit reserve/refund) around it.
export type ScanDecision =
  | { kind: "surface" } //          free, unlimited, locked report
  | { kind: "auth_required" } //    full scan requested but not signed in
  | { kind: "full_unlimited" } //   subscriber (or dev preview): run full, no credit spend
  | { kind: "full_metered" }; //    signed in, not subscribed: must reserve a credit first

export function decideScan(opts: {
  wantsFull: boolean;
  ent: Entitlements;
  devPreview: boolean;
}): ScanDecision {
  const { wantsFull, ent, devPreview } = opts;

  if (!wantsFull) return { kind: "surface" };
  if (!ent.userId && !devPreview) return { kind: "auth_required" };
  if (ent.subscribed || devPreview) return { kind: "full_unlimited" };
  return { kind: "full_metered" };
}
