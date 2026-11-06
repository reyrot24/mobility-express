-- Servizio "OK, il prezzo è giusto?": documenti legali versionati e adesione tracciabile.
-- Documenti v1.0 di Alca Broker del 04/11/2026 (Condizioni Generali + Informativa Privacy).
--
-- Flusso:
-- 1. Richiesta dal form: adesione "in_attesa" con l'informativa resa (versione e data).
-- 2. Email con i link ai due documenti e il link personale di conferma (token opaco, 7 giorni, monouso).
--    Aprire il link NON accetta nulla: registra solo l'evento "link_aperto".
-- 3. Conferma esplicita sulla pagina (Condizioni spuntate, marketing separato e mai preselezionato):
--    la funzione conferma_adesione() registra tutto in una transazione con data/ora del server.
-- 4. Cessazione dall'area personale o da devops (richiesta via email): blocco immediato delle
--    comunicazioni di servizio.
--
-- Tutte le tabelle sono solo per la funzione "api" (chiave secret): nessun permesso al browser.

-- ───────────── Documenti legali ─────────────
-- Una riga per versione, mai modificata: se cambia un documento si inserisce una nuova versione
-- e si sposta "attivo". sha256 è l'hash del PDF pubblicato in public/legal/il-prezzo-giusto/.
create table public.documenti_legali (
  id text primary key,                                   -- es. condizioni-1.0
  tipo text not null check (tipo in ('condizioni', 'privacy')),
  versione text not null,
  data_versione date not null,
  sha256_pdf text not null check (sha256_pdf ~ '^[0-9a-f]{64}$'),
  url_pdf text not null,
  url_pagina text not null,
  attivo boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tipo, versione)
);
create unique index documenti_legali_attivo_idx on public.documenti_legali (tipo) where attivo;

insert into public.documenti_legali (id, tipo, versione, data_versione, sha256_pdf, url_pdf, url_pagina, attivo) values
  ('condizioni-1.0', 'condizioni', '1.0', '2026-11-04',
   '00d0a327b1b229c8b1d25b970a78c95ffcf54f86cb58bb9462795581cbf9c9b0',
   '/legal/il-prezzo-giusto/condizioni-v1.0.pdf', '/prezzo-giusto/condizioni', true),
  ('privacy-1.0', 'privacy', '1.0', '2026-11-04',
   'c061bf4afd16bd36b7016c79b6bc9e851afba25fb1ee31b2010cec4dfc36ed40',
   '/legal/il-prezzo-giusto/privacy-v1.0.pdf', '/prezzo-giusto/privacy', true);

-- ───────────── Adesioni ─────────────
-- Una per richiesta (veicolo). Sopravvive alla cancellazione di richiesta e account: è la prova
-- dell'adesione (richiesta_id e user_id diventano null, restano email, targa e versioni).
create table public.adesioni (
  id uuid primary key default gen_random_uuid(),
  richiesta_id text unique references public.richieste (id) on delete set null,
  user_id uuid references public.profili (id) on delete set null,
  email text not null,
  targa text not null,
  referral_id text,                                      -- intermediario
  id_configurazione text,
  privacy_doc_id text not null references public.documenti_legali (id),
  informativa_resa_at timestamptz not null,
  condizioni_doc_id text references public.documenti_legali (id),
  condizioni_accettate_at timestamptz,                   -- sempre now() del database
  verifica_identita text check (verifica_identita in ('link_email+password_temporanea', 'sessione')),
  stato text not null default 'in_attesa' check (stato in ('in_attesa', 'attiva', 'cessata')),
  cessata_at timestamptz,
  cessazione_canale text check (cessazione_canale in ('area_personale', 'email_operatore')),
  cessazione_motivo text check (char_length(cessazione_motivo) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (stato = 'in_attesa' or (condizioni_doc_id is not null and condizioni_accettate_at is not null
                                 and verifica_identita is not null)),
  check (stato <> 'cessata' or (cessata_at is not null and cessazione_canale is not null))
);
create index adesioni_user_idx on public.adesioni (user_id);
create index adesioni_email_idx on public.adesioni (lower(email));

create trigger adesioni_updated_at before update on public.adesioni
  for each row execute function public.set_updated_at();

-- ───────────── Consenso marketing ─────────────
-- Storico: vale l'ultima riga per email. Separato dall'adesione e dalla cessazione del servizio.
create table public.consensi_marketing (
  id bigint generated always as identity primary key,
  email text not null,
  user_id uuid references public.profili (id) on delete set null,
  adesione_id uuid references public.adesioni (id) on delete set null,
  granted boolean not null,
  testo text not null,
  versione text not null,
  fonte text not null check (fonte in ('conferma_adesione', 'area_personale')),
  created_at timestamptz not null default now()
);
create index consensi_marketing_email_idx on public.consensi_marketing (lower(email), created_at desc);

-- ───────────── Registro eventi ─────────────
-- Solo inserimenti: UPDATE e DELETE sono bloccati. Per la pulizia dei dati di test (o una
-- cancellazione decisa dal DPO) eseguire prima: set local app.pulizia_registro = 'on';
create table public.adesioni_eventi (
  id bigint generated always as identity primary key,
  adesione_id uuid references public.adesioni (id) on delete cascade,
  richiesta_id text,                                     -- senza FK: resta anche se la richiesta sparisce
  tipo text not null check (tipo in (
    'richiesta_ricevuta', 'email_adesione_inviata', 'email_adesione_fallita',
    'link_aperto', 'token_inesistente', 'token_scaduto', 'token_riusato',
    'conferma_rifiutata', 'condizioni_accettate', 'marketing_concesso', 'marketing_negato',
    'marketing_revocato', 'stima_inviata', 'stima_non_disponibile', 'comunicazione_bloccata',
    'cessata', 'email_cessazione_inviata'
  )),
  attore text not null,                                  -- cliente, sistema, devops, operatore:<nome>
  dettagli jsonb,
  created_at timestamptz not null default now()
);
create index adesioni_eventi_adesione_idx on public.adesioni_eventi (adesione_id, created_at);
create index adesioni_eventi_richiesta_idx on public.adesioni_eventi (richiesta_id);

create function public.blocca_modifica_registro()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and current_setting('app.pulizia_registro', true) = 'on' then
    return old;
  end if;
  raise exception 'Il registro delle adesioni accetta solo nuove righe (%).', tg_op;
end;
$$;

create trigger adesioni_eventi_solo_inserimenti before update or delete on public.adesioni_eventi
  for each row execute function public.blocca_modifica_registro();

-- ───────────── Link di attivazione legato alla richiesta ─────────────
-- Ogni link conferma una sola richiesta (un veicolo), non tutte quelle della stessa email.
alter table public.attivazioni
  add column richiesta_id text references public.richieste (id) on delete cascade;

-- ───────────── Richieste annullate dalla cessazione ─────────────
-- Una richiesta non ancora arrivata a devops quando il cliente interrompe il servizio non parte più.
alter table public.richieste drop constraint if exists richieste_stato_check;
alter table public.richieste add constraint richieste_stato_check check (
  stato in ('in_attesa_attivazione', 'in_elaborazione', 'completata', 'non_disponibile', 'errore', 'annullata')
);

-- ───────────── Email ─────────────
alter table public.email_inviate drop constraint if exists email_inviate_tipo_check;
alter table public.email_inviate add constraint email_inviate_tipo_check check (
  tipo in ('benvenuto', 'attivazione', 'richiesta_ricevuta', 'stima', 'ricontatto', 'cessazione')
);
alter table public.email_inviate drop constraint if exists email_inviate_esito_check;
alter table public.email_inviate add constraint email_inviate_esito_check check (
  esito in ('inviata', 'fallita', 'bloccata')
);

-- ───────────── Conferma dell'adesione (una transazione) ─────────────
-- Chiamata dalla funzione dopo aver verificato token e password temporanea (o la sessione).
-- Attiva l'adesione, registra il marketing e gli eventi, passa la richiesta in elaborazione.
create function public.conferma_adesione(
  p_adesione_id uuid,
  p_user_id uuid,
  p_condizioni_doc_id text,
  p_verifica text,
  p_marketing boolean,
  p_marketing_testo text,
  p_marketing_versione text,
  p_dettagli jsonb
)
returns public.adesioni
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.adesioni;
begin
  update public.adesioni
  set stato = 'attiva',
      user_id = p_user_id,
      condizioni_doc_id = p_condizioni_doc_id,
      condizioni_accettate_at = now(),
      verifica_identita = p_verifica
  where id = p_adesione_id and stato = 'in_attesa'
  returning * into a;
  if a.id is null then
    raise exception 'ADESIONE_NON_IN_ATTESA';
  end if;

  insert into public.adesioni_eventi (adesione_id, richiesta_id, tipo, attore, dettagli) values
    (a.id, a.richiesta_id, 'condizioni_accettate', 'cliente',
     coalesce(p_dettagli, '{}'::jsonb) || jsonb_build_object(
       'condizioni', p_condizioni_doc_id, 'privacy', a.privacy_doc_id, 'verifica', p_verifica));

  -- null = scelta non chiesta (cliente con account: il marketing si gestisce nell'area personale)
  if p_marketing is not null then
    insert into public.consensi_marketing (email, user_id, adesione_id, granted, testo, versione, fonte)
    values (a.email, p_user_id, a.id, p_marketing, p_marketing_testo, p_marketing_versione, 'conferma_adesione');
    insert into public.adesioni_eventi (adesione_id, richiesta_id, tipo, attore, dettagli)
    values (a.id, a.richiesta_id, case when p_marketing then 'marketing_concesso' else 'marketing_negato' end,
            'cliente', jsonb_build_object('versione', p_marketing_versione));
  end if;

  update public.richieste
  set user_id = p_user_id, stato = 'in_elaborazione'
  where id = a.richiesta_id and stato = 'in_attesa_attivazione';

  return a;
end;
$$;
revoke execute on function public.conferma_adesione(uuid, uuid, text, text, boolean, text, text, jsonb)
  from public, anon, authenticated;

-- ───────────── Permessi ─────────────
alter table public.documenti_legali enable row level security;
alter table public.adesioni enable row level security;
alter table public.consensi_marketing enable row level security;
alter table public.adesioni_eventi enable row level security;
revoke all on public.documenti_legali, public.adesioni, public.consensi_marketing, public.adesioni_eventi
  from anon, authenticated;
