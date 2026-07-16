import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client. Bypasses Row Level Security, so it is the ONLY client allowed to
// mutate `profiles` (credit grants/spends, subscription sync) and to insert `scan_events`.
// `import "server-only"` guarantees a build error if this is ever pulled into client code.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
