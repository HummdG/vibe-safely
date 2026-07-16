"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { generateApiKey } from "@/lib/api-keys";

export type CreateKeyState =
  | { plaintext?: string; prefix?: string; error?: string }
  | undefined;

export async function createApiKey(
  _prev: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState> {
  if (!isSupabaseConfigured()) return { error: "Accounts aren't enabled yet." };
  const user = await getUser();
  if (!user) return { error: "Please sign in." };

  const label = (formData.get("label")?.toString() ?? "").trim() || null;
  const { plaintext, hash, prefix } = generateApiKey();

  const admin = createAdminClient();
  const { error } = await admin
    .from("api_keys")
    .insert({ user_id: user.id, key_hash: hash, key_prefix: prefix, label });
  if (error) return { error: "Could not create the key. Please try again." };

  revalidatePath("/account");
  // The plaintext is returned to the client exactly once, then never stored anywhere.
  return { plaintext, prefix };
}

export async function revokeApiKey(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const user = await getUser();
  if (!user) return;

  const admin = createAdminClient();
  await admin
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id); // ownership-scoped
  revalidatePath("/account");
}
