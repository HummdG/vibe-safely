import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  computeEntitlements,
  anonymousEntitlements,
  type Entitlements,
} from "@/lib/billing/entitlements";

// Data Access Layer. The single place session + entitlements are resolved on the server.
// Auth is validated with `supabase.auth.getUser()` (which verifies the JWT with Supabase),
// never the unvalidated `getSession()`. `cache()` dedupes calls within one request.

export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getEntitlements = cache(async (): Promise<Entitlements> => {
  const user = await getUser();
  if (!user) return anonymousEntitlements();

  const supabase = await createClient();
  // RLS restricts this to the caller's own row.
  const { data } = await supabase
    .from("profiles")
    .select("full_scan_credits, subscription_status, subscription_current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  return computeEntitlements(user.id, data);
});
