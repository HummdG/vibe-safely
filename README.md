# VibeSafely

Security scanner for AI-built ("vibe-coded") apps. Paste a URL → a graded report of
exposed secrets, open Supabase/Firebase databases, leaked `.env`/`.git` files, and missing
security headers.

## Stack

Next.js 16 (App Router, TypeScript) · Tailwind v4 · vitest · Supabase (auth + Postgres) ·
Stripe (billing).

## Scripts

- `npm run dev`: dev server (picks the next free port if 3000 is taken)
- `npm run build`: production build
- `npm test`: unit tests (vitest)
- `npm run typecheck`: `tsc --noEmit`

## Scan tiers

- **Surface scan** — free, unlimited, no account. Passive checks only; the report shows
  every issue by name, severity, and grade, but the explanation + fix are locked.
- **Full scan** — requires an account (signing in is the ownership consent). Runs the
  active/deep checks too and unlocks the full report (detail + AI fix prompt + patch).
  Metered by credits: **3 free on signup → £9 for 15 credits → £19/mo unlimited** (the
  monthly plan also unlocks continuous monitoring, which is not built yet). Quotas are
  enforced server-side; the browser can never grant itself a plan or credits.

## Setup

1. Copy `.env.example` to `.env.local` and fill in Supabase + Stripe values.
2. **Supabase:** create a project, then run the SQL in `supabase/migrations/` (SQL Editor
   or `supabase db push`). This creates `profiles` / `scan_events` / `processed_stripe_events`,
   the RLS policies, the signup trigger (grants 3 credits), and the credit RPCs.
3. **Stripe:** create a one-time price (£9, 15 credits) and a recurring price (£19/mo), put
   their IDs in `.env.local`, and run `stripe listen --forward-to localhost:3000/api/stripe/webhook`
   to get `STRIPE_WEBHOOK_SECRET` for local testing.
4. `npm run dev`.

## Scan engine (`src/lib/scan/`)

Pure and server-side, with a dependency-injected `fetch` so every check is unit-tested
without real network access.

- `gatherContext`: fetches the target's HTML + JS bundles once; detects Supabase/Firebase
- `checks/`: **passive** (`bundle-secrets`, `exposed-files`, `security-headers`) always run;
  **active** (`supabase-rls`, `firebase-rules`, `storage-buckets`) run only on a full scan
- `runner`: orchestrates checks, scores 0–100 → grade A–F
- `gating`: server-side locked/unlocked paywall (locked reports never receive the fix text)
- `safety`: SSRF guard (blocks localhost / private / metadata / non-http targets)

## Accounts & billing (`src/lib/`)

- `supabase/{server,browser,admin}.ts`: SSR / browser / service-role clients
- `dal.ts`: `getUser` + `getEntitlements` (session-validated, `cache()`-memoized)
- `billing/{entitlements,plans}.ts`: pure entitlement→plan mapping and Stripe price→grant map
- `stripe/server.ts`: Stripe client + one-customer-per-user helper
- `app/api/stripe/webhook`: idempotent credit grants + subscription sync

## Ethics

Defensive, authorized use only. Scan apps you own. The active database checks require an
account and use only the app's own publicly-shipped keys. We never store user keys. If you
find a specific third-party app leaking, disclose it privately.
