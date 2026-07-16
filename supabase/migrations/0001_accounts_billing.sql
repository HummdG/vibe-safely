-- VibeSafely: accounts, billing & scan quotas.
-- Run in the Supabase SQL Editor, or via `supabase db push`.
--
-- Design notes:
--  * `profiles` is the entitlement source of truth (credits + subscription). It is mutated
--    ONLY by the signup trigger and the SECURITY DEFINER credit RPCs / service-role code —
--    never directly by the browser, so a user can never grant themselves a plan or credits.
--  * Credits are decremented with a single-statement UPDATE ... WHERE credits > 0 so the
--    check-and-spend is atomic (no time-of-check/time-of-use race under concurrent scans).

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id                                uuid primary key references auth.users (id) on delete cascade,
  full_scan_credits                 integer not null default 3 check (full_scan_credits >= 0),
  subscription_status               text,
  subscription_current_period_end   timestamptz,
  stripe_customer_id                text unique,
  created_at                        timestamptz not null default now()
);

-- Audit / metering ledger. One row per scan (anonymous surface scans have a null user_id).
create table if not exists public.scan_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users (id) on delete set null,
  target_domain  text not null,
  scan_depth     text not null,             -- 'surface' | 'full'
  plan           text not null,             -- 'free' | 'pro'
  credit_spent   boolean not null default false,
  created_at     timestamptz not null default now()
);

create index if not exists scan_events_user_created_idx
  on public.scan_events (user_id, created_at desc);

-- Webhook idempotency: a Stripe event.id is processed at most once.
create table if not exists public.processed_stripe_events (
  event_id      text primary key,
  type          text not null,
  processed_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.scan_events enable row level security;
alter table public.processed_stripe_events enable row level security;

-- A user may read only their own profile. There is deliberately NO insert/update/delete
-- policy: all writes go through the signup trigger, the credit RPCs, or service-role code.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = id);

-- A user may read only their own scan history. Inserts are done server-side (service role).
drop policy if exists scan_events_select_own on public.scan_events;
create policy scan_events_select_own on public.scan_events
  for select using ((select auth.uid()) = user_id);

-- processed_stripe_events has RLS on and no policies: service-role only.

grant select on public.profiles to authenticated;
grant select on public.scan_events to authenticated;

-- ---------------------------------------------------------------------------
-- Signup trigger: every new auth user gets a profile with 3 free full-scan credits.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Credit RPCs. SECURITY DEFINER + execute granted to service_role ONLY, so they can be
-- called from the trusted server (admin client) but never directly by anon/authenticated.
-- ---------------------------------------------------------------------------

-- Atomically spend one credit. Returns the new balance, or NULL if none were available.
create or replace function public.spend_full_scan_credit(p_user uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set full_scan_credits = full_scan_credits - 1
   where id = p_user
     and full_scan_credits > 0
  returning full_scan_credits;
$$;

-- Grant credits (Stripe one-time purchase). Returns the new balance.
create or replace function public.grant_full_scan_credits(p_user uuid, p_amount integer)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set full_scan_credits = full_scan_credits + p_amount
   where id = p_user
  returning full_scan_credits;
$$;

-- Refund one credit (e.g. the target was unreachable, so the scan produced nothing).
create or replace function public.refund_full_scan_credit(p_user uuid)
returns integer
language sql
security definer
set search_path = ''
as $$
  update public.profiles
     set full_scan_credits = full_scan_credits + 1
   where id = p_user
  returning full_scan_credits;
$$;

revoke all on function public.spend_full_scan_credit(uuid) from public;
revoke all on function public.grant_full_scan_credits(uuid, integer) from public;
revoke all on function public.refund_full_scan_credit(uuid) from public;
grant execute on function public.spend_full_scan_credit(uuid) to service_role;
grant execute on function public.grant_full_scan_credits(uuid, integer) to service_role;
grant execute on function public.refund_full_scan_credit(uuid) to service_role;
