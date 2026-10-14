-- Nuovo flusso:
-- 1. Cliente non registrato: la richiesta si salva SOLO in "richieste" (nome, cognome, email),
--    senza utente né profilo, in stato "in_attesa_attivazione".
-- 2. Il cliente attiva l'area personale dal link nell'email: si creano utente e profilo
--    (nome, cognome, cellulare) e le sue richieste passano a devops.
-- 3. Devops restituisce il risultato chiamando la nostra API (webhook).

-- ───────────── Profili: cellulare e codice referente di provenienza ─────────────
alter table public.profili
  add column cellulare text not null default '' check (char_length(cellulare) <= 20),
  add column referral_id text;

-- ───────────── Richieste: dati del cliente anche senza account ─────────────
alter table public.richieste
  alter column user_id drop not null,
  add column email text,
  add column nome text not null default '' check (char_length(nome) <= 80),
  add column cognome text not null default '' check (char_length(cognome) <= 80),
  add column inviata_devops_at timestamptz;

-- Richieste già esistenti: email e nome dall'account, già passate dal servizio di stima
update public.richieste r
set email = u.email,
    nome = coalesce(p.nome, ''),
    cognome = coalesce(p.cognome, ''),
    inviata_devops_at = r.created_at
from auth.users u
left join public.profili p on p.id = u.id
where u.id = r.user_id;

alter table public.richieste alter column email set not null;

alter table public.richieste drop constraint if exists richieste_stato_check;
alter table public.richieste add constraint richieste_stato_check check (
  stato in ('in_attesa_attivazione', 'in_elaborazione', 'completata', 'non_disponibile', 'errore')
);

create index richieste_email_in_attesa_idx on public.richieste (lower(email)) where user_id is null;

-- ───────────── Link di attivazione dell'area personale ─────────────
-- Salviamo solo l'hash del token: chi legge il database non può usare i link.
create table public.attivazioni (
  token_hash text primary key,
  email text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);
alter table public.attivazioni enable row level security; -- nessuna policy: solo server
revoke all on public.attivazioni from anon, authenticated;

-- ───────────── Profilo creato all'attivazione ─────────────
create or replace function public.crea_profilo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profili (id, nome, cognome, cellulare, referral_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'cognome', ''),
    coalesce(new.raw_user_meta_data ->> 'cellulare', ''),
    new.raw_user_meta_data ->> 'referral_id'
  );
  return new;
end;
$$;

-- ───────────── Permessi del browser ─────────────
grant update (nome, cognome, cellulare) on public.profili to authenticated;

-- Email inviata per l'attivazione
alter table public.email_inviate drop constraint if exists email_inviate_tipo_check;
alter table public.email_inviate add constraint email_inviate_tipo_check check (
  tipo in ('benvenuto', 'attivazione', 'richiesta_ricevuta', 'stima', 'ricontatto')
);
