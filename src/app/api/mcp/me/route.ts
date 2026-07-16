import { NextResponse } from "next/server";
import { authenticateApiKey, entitlementsForUser } from "@/lib/api-auth";
import { isServiceRoleConfigured } from "@/lib/supabase/config";

export const runtime = "nodejs";

// Reports the caller's balance, so the MCP `check_credits` tool can answer without a scan.
export async function GET(req: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: "Server not configured." }, { status: 503 });
  }

  const userId = await authenticateApiKey(req);
  if (!userId) {
    return NextResponse.json({ error: "Invalid or revoked API key." }, { status: 401 });
  }

  const ent = await entitlementsForUser(userId);
  return NextResponse.json({ credits: ent.credits, subscribed: ent.subscribed });
}
