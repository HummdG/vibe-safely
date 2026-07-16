import { NextResponse } from "next/server";
import {
  runScan,
  UnreachableTargetError,
  gateResult,
  assertPublicUrl,
  type ScanResult,
} from "@vibesafely/scan-core";
import { getEntitlements } from "@/lib/dal";
import { anonymousEntitlements, type Entitlements } from "@/lib/billing/entitlements";
import { decideScan } from "@/lib/billing/scan-policy";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured, isServiceRoleConfigured } from "@/lib/supabase/config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Anonymous surface scans are unlimited by design; this only blunts abusive bursts (each
// scan makes outbound fetches). Generous enough that real demo usage never hits it.
const SURFACE_LIMIT = 30;
const SURFACE_WINDOW_MS = 10 * 60 * 1000;

type ScanMode = "surface" | "full";

// Best-effort audit/metering ledger write. Never fails the request.
async function logScan(
  userId: string | null,
  result: ScanResult,
  depth: ScanMode,
  plan: "free" | "pro",
  creditSpent: boolean,
): Promise<void> {
  if (!isServiceRoleConfigured()) return;
  try {
    const admin = createAdminClient();
    await admin.from("scan_events").insert({
      user_id: userId,
      target_domain: result.domain,
      scan_depth: depth,
      plan,
      credit_spent: creditSpent,
    });
  } catch {
    // Metering is non-critical; swallow so a logging hiccup never breaks a scan.
  }
}

export async function POST(req: Request) {
  let body: { url?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const raw = (body.url || "").trim();
  if (!raw) return NextResponse.json({ error: "Enter a URL to scan." }, { status: 400 });

  let target: URL;
  try {
    target = assertPublicUrl(raw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid URL." },
      { status: 400 },
    );
  }
  const url = target.toString();
  const wantsFull = body.mode === "full";

  // Resolve entitlements server-side. Degrade to anonymous if Supabase isn't configured yet,
  // so the free surface-scan funnel keeps working before billing is wired.
  const ent: Entitlements = isSupabaseConfigured()
    ? await getEntitlements()
    : anonymousEntitlements();

  // Dev-only: preview a full scan of the local vuln-demo without an account, replacing the
  // old `plan: "pro"` escape hatch. Never active in production.
  const devPreview = process.env.NODE_ENV !== "production" && !ent.userId;
  const decision = decideScan({ wantsFull, ent, devPreview });

  // ---- Surface scan (free, unlimited, no account) ------------------------------------
  if (decision.kind === "surface") {
    if (!rateLimit(`scan:${clientIp(req)}`, SURFACE_LIMIT, SURFACE_WINDOW_MS)) {
      return NextResponse.json(
        { error: "Too many scans from this network. Please wait a minute and try again." },
        { status: 429 },
      );
    }
    try {
      const result = await runScan({ url, ownerConfirmed: false });
      const gated = gateResult(result, "free");
      await logScan(ent.userId, result, "surface", "free", false);
      return NextResponse.json({ ...gated, remainingCredits: entRemaining(ent) });
    } catch (e) {
      return scanError(e);
    }
  }

  // ---- Full scan (all checks + unlocked report, metered) -----------------------------
  if (decision.kind === "auth_required") {
    return NextResponse.json(
      { error: "Sign in to run a full scan.", code: "auth_required" },
      { status: 401 },
    );
  }

  // Subscribers (and the dev preview) run full scans without spending credits.
  if (decision.kind === "full_unlimited") {
    try {
      const result = await runScan({ url, ownerConfirmed: true });
      const gated = gateResult(result, "pro");
      await logScan(ent.userId, result, "full", "pro", false);
      return NextResponse.json({ ...gated, remainingCredits: ent.subscribed ? null : undefined });
    } catch (e) {
      return scanError(e);
    }
  }

  // full_metered — signed in, not subscribed: reserve a credit BEFORE the expensive scan
  // (closes the check-then-spend race), and refund it if the scan produces nothing.
  const admin = createAdminClient();
  const { data: remaining, error: spendError } = await admin.rpc("spend_full_scan_credit", {
    p_user: ent.userId!,
  });
  if (spendError) {
    return NextResponse.json({ error: "Could not verify your scan credits." }, { status: 500 });
  }
  if (remaining === null) {
    return NextResponse.json(
      { error: "You're out of full-scan credits.", code: "no_credits" },
      { status: 402 },
    );
  }

  try {
    const result = await runScan({ url, ownerConfirmed: true });
    const gated = gateResult(result, "pro");
    await logScan(ent.userId, result, "full", "pro", true);
    return NextResponse.json({ ...gated, remainingCredits: remaining as number });
  } catch (e) {
    // The scan failed, so the user shouldn't be charged — hand the credit back.
    try {
      await admin.rpc("refund_full_scan_credit", { p_user: ent.userId! });
    } catch {
      // If the refund itself fails, the scan_events ledger still makes it auditable.
    }
    return scanError(e);
  }
}

// Surface responses carry the current balance so signed-in UIs stay in sync; anonymous → undefined.
function entRemaining(ent: Entitlements): number | null | undefined {
  if (!ent.userId) return undefined;
  return ent.subscribed ? null : ent.credits;
}

function scanError(e: unknown): NextResponse {
  // An unreachable target is a user-fixable input error, not a server fault.
  if (e instanceof UnreachableTargetError) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
  return NextResponse.json(
    { error: "Scan failed. The site may be unreachable." },
    { status: 502 },
  );
}
