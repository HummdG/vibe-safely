"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn, signUp, type AuthState } from "@/app/actions/auth";

const COPY = {
  "sign-in": {
    title: "Welcome back",
    submit: "Sign in",
    pending: "Signing in…",
    switchText: "Need an account?",
    switchHref: "/sign-up",
    switchCta: "Create one",
  },
  "sign-up": {
    title: "Create your account",
    submit: "Sign up",
    pending: "Creating account…",
    switchText: "Already have an account?",
    switchHref: "/sign-in",
    switchCta: "Sign in",
  },
} as const;

export function AuthForm({
  mode,
  next,
  notice,
}: {
  mode: "sign-in" | "sign-up";
  next?: string;
  notice?: string;
}) {
  const action = mode === "sign-in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, undefined);
  const copy = COPY[mode];

  return (
    <div className="w-full max-w-sm">
      <h1 className="font-display text-title font-bold tracking-tight text-ink">{copy.title}</h1>
      <p className="mt-2 text-meta text-ink-muted">
        {mode === "sign-up"
          ? "New accounts get 3 free full scans."
          : "Sign in to run full scans and manage your plan."}
      </p>

      <form action={formAction} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next ?? ""} />
        <label className="block">
          <span className="mb-1 block text-meta text-ink-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-md border border-border bg-well/70 px-4 py-3 font-mono text-meta text-ink outline-none transition-colors placeholder:text-ink-dim focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-meta text-ink-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
            placeholder="At least 8 characters"
            className="w-full rounded-md border border-border bg-well/70 px-4 py-3 font-mono text-meta text-ink outline-none transition-colors placeholder:text-ink-dim focus:border-accent/60 focus:ring-2 focus:ring-accent/25"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="btn-dawn w-full rounded-md px-5 py-3 text-meta font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
        >
          {pending ? copy.pending : copy.submit}
        </button>
      </form>

      {notice && (
        <p className="mt-3 rounded-md border border-border bg-surface-2/40 px-4 py-3 text-meta text-ink-muted">
          {notice}
        </p>
      )}
      {state?.error && (
        <p className="mt-3 rounded-md border border-critical/40 bg-critical/10 px-4 py-3 text-meta text-critical">
          {state.error}
        </p>
      )}
      {state?.message && (
        <p className="mt-3 rounded-md border border-pass/40 bg-pass/10 px-4 py-3 text-meta text-ink">
          {state.message}
        </p>
      )}

      <p className="mt-6 text-meta text-ink-dim">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="font-semibold text-accent hover:underline">
          {copy.switchCta}
        </Link>
      </p>
    </div>
  );
}
