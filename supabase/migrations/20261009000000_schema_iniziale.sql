-- Schema iniziale "Il prezzo giusto per te".
-- Da eseguire una volta nel SQL Editor di Supabase (o con `supabase db push`).
--
-- Scritture: solo dal server Express con la chiave secret, che ignora le RLS.
-- Letture dal browser: ogni cliente autenticato vede solo i propri dati.

-- ───────────────────────── Profili ─────────────────────────
-- Email e password restano in auth.users (gestite da Supabase Auth).
create table public.profili (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 80),
  cognome text not null default '' check (char_length(cognome) <= 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Richieste ─────────────────────────
create table public.richieste (
  id text primary key,                                   -- es. ST-1A2B3C4D
  user_id uuid not null references public.profili (id) on delete cascade,
  targa text not null,
  tipo_strada text not null,
  strada text not null,
  civico text not null,
  comune text not null,
  cap text not null check (cap ~ '^\d{5}$'),
  referral_id text,
  stato text not null default 'in_elaborazione'
    check (stato in ('in_elaborazione', 'completata', 'non_disponibile', 'errore')),
  errore text,                                           -- dettaglio tecnico, mai mostrato al cliente
  consensi jsonb not null,                               -- registro privacy / ricontatto / marketing
  idempotency_key text unique,                           -- evita richieste doppie da doppio invio
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index richieste_user_created_idx on public.richieste (user_id, created_at desc);

-- ───────────────────────── Risultati ─────────────────────────
-- Un risultato per richiesta. Il formato dell'API prezzo non è ancora definito:
-- range (min/max) o prezzo puntuale, più la risposta completa in "dettagli".
create table public.risultati (
  richiesta_id text primary key references public.richieste (id) on delete cascade,
  prezzo numeric(10, 2) check (prezzo > 0),
  prezzo_min numeric(10, 2) check (prezzo_min > 0),
  prezzo_max numeric(10, 2) check (prezzo_max > prezzo_min),
  valuta text not null default 'EUR',
  periodicita text not null default 'annuale',
  fonte text,
  demo boolean not null default false,
  dettagli jsonb,
  created_at timestamptz not null default now(),
  check (prezzo is not null or (prezzo_min is not null and prezzo_max is not null))
);

-- ───────────────────────── Registro email ─────────────────────────
-- Traccia le email inviate per poterle reinviare se l'invio fallisce. Solo server.
create table public.email_inviate (
  id bigint generated always as identity primary key,
  user_id uuid references public.profili (id) on delete cascade,
  richiesta_id text references public.richieste (id) on delete cascade,
  tipo text not null check (tipo in ('benvenuto', 'richiesta_ricevuta', 'stima', 'ricontatto')),
  destinatario text not null,
  esito text not null check (esito in ('inviata', 'fallita')),
  errore text,
  created_at timestamptz not null default now()
);

create index email_inviate_richiesta_idx on public.email_inviate (richiesta_id);

-- ───────────────────────── updated_at automatico ─────────────────────────
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profili_updated_at before update on public.profili
  for each row execute function public.set_updated_at();
create trigger richieste_updated_at before update on public.richieste
  for each row execute function public.set_updated_at();

-- ───────────────────────── Profilo alla registrazione ─────────────────────────
-- Il server crea l'utente con user_metadata { nome, cognome }: il profilo nasce da qui.
create function public.crea_profilo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profili (id, nome, cognome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.raw_user_meta_data ->> 'cognome', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.crea_profilo();

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profili enable row level security;
alter table public.richieste enable row level security;
alter table public.risultati enable row level security;
alter table public.email_inviate enable row level security; -- nessuna policy: solo server

create policy "Il cliente vede il proprio profilo" on public.profili
  for select to authenticated using (id = (select auth.uid()));

create policy "Il cliente modifica il proprio profilo" on public.profili
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Dal browser si possono cambiare solo nome e cognome
revoke update on public.profili from authenticated, anon;
grant update (nome, cognome) on public.profili to authenticated;

create policy "Il cliente vede le proprie richieste" on public.richieste
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Il cliente vede i risultati delle proprie richieste" on public.risultati
  for select to authenticated using (
    exists (
      select 1 from public.richieste r
      where r.id = richiesta_id and r.user_id = (select auth.uid())
    )
  );

-- Le colonne tecniche non servono al browser
revoke select on public.richieste from anon, authenticated;
grant select (id, targa, tipo_strada, strada, civico, comune, cap, stato, consensi, created_at, updated_at)
  on public.richieste to authenticated;
revoke all on public.email_inviate from anon, authenticated;
