import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashApiKey, looksLikeApiKey } from "@/lib/api-keys";
import { computeEntitlements, type Entitlements } from "@/lib/billing/entitlements";

// Server-side API-key authentication + entitlements for the MCP endpoints. Mirrors the
// session-based DAL, but resolves the user from a Bearer key instead of a cookie.

export async function resolveUserFromApiKey(key: string): Promise<string | null> {
  if (!looksLikeApiKey(key)) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("api_keys")
    .select("id, user_id, revoked_at")
    .eq("key_hash", hashApiKey(key))
    .maybeSingle();
  if (!data || data.revoked_at) return null;

  // Best-effort "last used" touch — never block or fail auth on it.
  admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(
      () => {},
      () => {},
    );

  return data.user_id as string;
}

export async function authenticateApiKey(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const key = match?.[1]?.trim();
  if (!key) return null;
  return resolveUserFromApiKey(key);
}

export async function entitlementsForUser(userId: string): Promise<Entitlements> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("full_scan_credits, subscription_status, subscription_current_period_end")
    .eq("id", userId)
    .maybeSingle();
  return computeEntitlements(userId, data ?? null);
}

/** Best-effort domain extraction for the scan_events ledger. */
export function mcpDomain(url: string | undefined): string {
  if (!url) return "unknown";
  try {
    return new URL(url.includes("://") ? url : `https://${url}`).hostname;
  } catch {
    return "unknown";
  }
}
