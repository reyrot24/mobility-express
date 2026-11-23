-- Risk Radar Aziende (ALCA Broker): tabelle rr_* usate SOLO dalle Edge Functions risk-radar e risk-radar-admin.
-- Unione degli script 001 → 003 del progetto originale (ALCA-Risk-Radar/2-backend-supabase/database).
-- Non tocca nessuna tabella esistente. Idempotente: si può rieseguire.

-- ===== 001_risk_radar.sql =====
-- Risk Radar Aziende: schema iniziale.
-- Tutte le tabelle hanno RLS attivo e NESSUNA policy pubblica:
-- l'accesso avviene solo tramite le Edge Functions (service role).

create table if not exists public.rr_referrers (
  code        text primary key check (code ~ '^[a-z0-9-]{3,40}$'),
  name        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.rr_analyses (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  piva          text not null check (piva ~ '^[0-9]{11}$'),
  company_name  text,
  address       text,
  vies_valid    boolean,
  vies_checked  boolean not null default false,
  ref_code      text references public.rr_referrers(code) on delete set null,
  params        jsonb not null,
  result        jsonb not null,
  overall_risk  int,
  budget_low    int,
  budget_high   int,
  email         text,
  phone         text,
  wants_contact boolean not null default false,
  consent_text  text,
  status        text not null default 'nuova' check (status in ('nuova','contattata','proposta','chiusa','persa'))
);
create index if not exists rr_analyses_created_idx on public.rr_analyses (created_at desc);
create index if not exists rr_analyses_ref_idx on public.rr_analyses (ref_code);

create table if not exists public.rr_settings (
  key   text primary key,
  value text not null
);

alter table public.rr_referrers enable row level security;
alter table public.rr_analyses  enable row level security;
alter table public.rr_settings  enable row level security;

revoke all on public.rr_referrers, public.rr_analyses, public.rr_settings from anon, authenticated;

-- ===== 002_ateco.sql =====
-- ATECO automatico: cache delle ricerche (VIES + dati camerali) e colonne ATECO sulle analisi.
create table if not exists public.rr_lookups (
  piva       text primary key check (piva ~ '^[0-9]{11}$'),
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.rr_lookups enable row level security;
revoke all on public.rr_lookups from anon, authenticated;

alter table public.rr_analyses add column if not exists ateco_code text;
alter table public.rr_analyses add column if not exists ateco_source text check (ateco_source in ('registro','cliente'));

-- ===== 003_web_source.sql =====
-- Ricerca online di ATECO e fatturato (Claude + ricerca web).
alter table public.rr_analyses drop constraint if exists rr_analyses_ateco_source_check;
alter table public.rr_analyses add constraint rr_analyses_ateco_source_check check (ateco_source in ('registro','web','cliente'));
alter table public.rr_lookups add column if not exists web_checked_at timestamptz;

