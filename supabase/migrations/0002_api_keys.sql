-- VibeSafely: personal API keys for the MCP server (and future CLI).
-- A key authenticates a user's full scans against /api/mcp/*. Only the SHA-256 hash is
-- stored; the plaintext (vsk_...) is shown once at creation and never persisted.

create table if not exists public.api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  key_hash      text not null unique,     -- sha256(plaintext), hex
  key_prefix    text not null,            -- first chars for display, e.g. "vsk_ab12cd34"
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz,
  revoked_at    timestamptz
);

create index if not exists api_keys_user_idx on public.api_keys (user_id, created_at desc);

alter table public.api_keys enable row level security;

-- A user may read only their own keys (to list them). Inserts/updates (create, revoke,
-- last_used touch) are done server-side with the service role, never by the browser.
drop policy if exists api_keys_select_own on public.api_keys;
create policy api_keys_select_own on public.api_keys
  for select using ((select auth.uid()) = user_id);

grant select on public.api_keys to authenticated;
