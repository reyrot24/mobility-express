-- Risk Radar Aziende: accesso alla dashboard con nome utente e password (sostituisce la chiave unica).
-- Della password si salva solo l'hash PBKDF2-SHA256 con sale (formato pbkdf2_sha256$iterazioni$sale$hash),
-- della sessione solo l'impronta SHA-256 del token. Gli utenti si creano con  npm run rr:admin-user -- <nome>.
-- Tocca solo tabelle rr_*. Idempotente: si può rieseguire.

create table if not exists public.rr_admin_users (
  username        text primary key check (username ~ '^[a-z0-9._-]{3,40}$'),
  password_hash   text not null,
  active          boolean not null default true,
  failed_attempts integer not null default 0,
  locked_until    timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now()
);

comment on table public.rr_admin_users is 'Account della dashboard Risk Radar (/risk-radar/admin)';
comment on column public.rr_admin_users.password_hash is 'pbkdf2_sha256$<iterazioni>$<sale base64>$<hash base64>: la password in chiaro non è mai salvata';
comment on column public.rr_admin_users.locked_until is 'Dopo 5 password sbagliate l''account è bloccato per 15 minuti';

create table if not exists public.rr_admin_sessions (
  token_hash text primary key,
  username   text not null references public.rr_admin_users (username) on delete cascade on update cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

comment on table public.rr_admin_sessions is 'Sessioni della dashboard (12 ore): si salva solo lo SHA-256 del token';
create index if not exists rr_admin_sessions_user_idx on public.rr_admin_sessions (username);

alter table public.rr_admin_users    enable row level security;
alter table public.rr_admin_sessions enable row level security;
revoke all on public.rr_admin_users, public.rr_admin_sessions from anon, authenticated;
