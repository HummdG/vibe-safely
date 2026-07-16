// Minimal, dependency-free JWT payload decoder.
// We only read the payload to distinguish Supabase `anon` (safe, public) keys
// from `service_role` (dangerous, must never ship to the browser) keys.

export interface JwtPayload {
  ref?: string;
  role?: string;
  [k: string]: unknown;
}

export function decodeJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    payload += "=".repeat((4 - (payload.length % 4)) % 4);
    const json = Buffer.from(payload, "base64").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}
