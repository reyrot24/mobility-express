-- Risk Radar Aziende: email "ricontatto", riepilogo al cliente (con conferma dell'indirizzo) e link al titolare.
-- Regole prese dal servizio referral di ALCA Energia: al cliente si scrive solo dopo che ha confermato
-- l'email con un link valido 24 ore, del token si salva solo l'impronta SHA-256, ogni invio lascia un esito.
-- Tocca solo tabelle rr_*. Idempotente: si può rieseguire.

-- 1) Email "l'azienda vuole essere ricontattata" (pulsante dopo il risultato): parte una sola volta.
alter table public.rr_analyses
  add column if not exists contact_requested_at timestamptz,
  add column if not exists contact_notified_at  timestamptz,
  add column if not exists contact_notify_error text;

comment on column public.rr_analyses.contact_requested_at is 'Quando il cliente ha premuto "Voglio essere ricontattato" dopo il risultato';
comment on column public.rr_analyses.contact_notified_at is 'Quando è partita l''email di ricontatto all''ufficio (null = non inviata)';

-- 2) Riepilogo dell'analisi al cliente: solo se spunta la casella, e solo dopo la conferma dell'email.
alter table public.rr_analyses
  add column if not exists summary_requested_at  timestamptz,
  add column if not exists summary_consent_text  text,
  add column if not exists summary_token_hash    text,
  add column if not exists summary_token_expires timestamptz,
  add column if not exists summary_confirmed_at  timestamptz,
  add column if not exists summary_sent_at       timestamptz,
  add column if not exists summary_status        text;

comment on column public.rr_analyses.summary_consent_text is 'Testo della casella spuntata dal cliente per ricevere il riepilogo';
comment on column public.rr_analyses.summary_token_hash is 'SHA-256 del link di conferma (il link in chiaro esiste solo nell''email)';
comment on column public.rr_analyses.summary_status is
  'conferma_inviata | riepilogo_inviato | bloccata_test | limite_superato | email_non_configurata | email_errore: ...';

create unique index if not exists rr_analyses_summary_token_idx
  on public.rr_analyses (summary_token_hash) where summary_token_hash is not null;
create index if not exists rr_analyses_email_summary_idx
  on public.rr_analyses (email, summary_requested_at) where summary_requested_at is not null;

-- 3) Email "il tuo link Risk Radar è pronto" al titolare del link.
alter table public.rr_referrers
  add column if not exists link_sent_at timestamptz,
  add column if not exists link_sent_to text;

comment on column public.rr_referrers.link_sent_at is 'Ultimo invio del link e del QR code al titolare';
