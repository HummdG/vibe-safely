import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/AuthForm";
import { getUser } from "@/lib/dal";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const configured = isSupabaseConfigured();
  if (configured && (await getUser())) redirect("/account");

  const { next, error } = await searchParams;
  const notice = !configured
    ? "Accounts aren't enabled yet — add your Supabase keys to .env.local and restart."
    : error === "auth"
      ? "That sign-in link didn't work. Please try again."
      : undefined;

  return (
    <main className="mx-auto flex max-w-3xl items-center justify-center px-6 py-20 sm:py-28">
      <AuthForm mode="sign-in" next={next} notice={notice} />
    </main>
  );
}
