import { NextResponse } from "next/server";
import { authenticateApiKey, entitlementsForUser } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { isServiceRoleConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

// Called by the MCP when a reserved full scan failed to produce a result (e.g. the target
// was unreachable), so the user isn't charged. No-op for subscribers.
export async function POST(req: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const userId = await authenticateApiKey(req);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const ent = await entitlementsForUser(userId);
  if (!ent.subscribed) {
    const admin = createAdminClient();
    await admin.rpc("refund_full_scan_credit", { p_user: userId });
  }

  return NextResponse.json({ ok: true });
}
