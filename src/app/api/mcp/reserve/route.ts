import { NextResponse } from "next/server";
import { authenticateApiKey, entitlementsForUser, mcpDomain } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

// The MCP calls this BEFORE running a full scan locally: it authenticates the API key and
// reserves one credit (subscribers are unlimited). The scan itself runs on the user's
// machine — this endpoint only meters. A failed scan is made good via /api/mcp/refund.
export async function POST(req: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const userId = await authenticateApiKey(req);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  let body: { url?: string } = {};
  try {
    body = await req.json();
  } catch {
    // url is optional (only used for the audit ledger)
  }
  const domain = mcpDomain(body.url);

  const admin = createAdminClient();
  const ent = await entitlementsForUser(userId);

  async function log(creditSpent: boolean) {
    try {
      await admin.from("scan_events").insert({
        user_id: userId,
        target_domain: domain,
        scan_depth: "full",
        plan: "pro",
        credit_spent: creditSpent,
      });
    } catch {
      // Metering ledger is non-critical.
    }
  }

  if (ent.subscribed) {
    await log(false);
    return NextResponse.json({ authorized: true, subscribed: true, remainingCredits: null });
  }

  const { data: remaining, error } = await admin.rpc("spend_full_scan_credit", {
    p_user: userId,
  });
  if (error) {
    return NextResponse.json({ error: "Could not verify your credits." }, { status: 500 });
  }
  if (remaining === null) {
    return NextResponse.json(
      { error: "You're out of full-scan credits.", code: "no_credits" },
      { status: 402 },
    );
  }

  await log(true);
  return NextResponse.json({
    authorized: true,
    subscribed: false,
    remainingCredits: remaining as number,
  });
}
