-- Pagina personalizzata del referente: /prezzo-giusto/<referral_id>.
-- Il referente la configura su devops; devops la salva nel suo database e poi ci invia la
-- configurazione (JSON) con PUT /devops/pagine/<id> sulla funzione "api".
-- Il sito la legge da GET /prezzo-giusto/pagine/<id>. Le immagini restano su devops.

create table public.pagine_referenti (
  referral_id text primary key check (referral_id ~ '^[A-Za-z0-9_-]{1,64}$'),
  -- Già validata e normalizzata dalla funzione (lib/pagina.js)
  configurazione jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pagine_referenti enable row level security; -- nessuna policy: solo la funzione
revoke all on public.pagine_referenti from anon, authenticated;
