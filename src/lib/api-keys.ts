import { createHash, randomBytes } from "node:crypto";

// Pure API-key crypto. No Supabase / server-only imports so it's unit-testable and safe to
// share between the server actions (create) and the auth layer (resolve). The DB access lives
// in api-auth.ts (server-only).

export const API_KEY_PREFIX = "vsk_";

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

export function generateApiKey(): { plaintext: string; hash: string; prefix: string } {
  const plaintext = `${API_KEY_PREFIX}${randomBytes(32).toString("base64url")}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    // A short, non-secret display handle (e.g. "vsk_AbCdEfGh") for listing keys in the UI.
    prefix: plaintext.slice(0, 12),
  };
}

export function looksLikeApiKey(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith(API_KEY_PREFIX) && value.length > 20;
}
