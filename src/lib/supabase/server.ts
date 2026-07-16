import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// SSR Supabase client for Server Components, Route Handlers and Server Actions. Wired
// through Next.js 16's async `cookies()` so the auth session travels with the request.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // `setAll` is called from a Server Component render, where setting cookies
            // throws. That's fine: the proxy refreshes the session cookie on every request.
          }
        },
      },
    },
  );
}
