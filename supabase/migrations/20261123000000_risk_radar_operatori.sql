-- Risk Radar Aziende: dashboard sul modello del portale ALCA Energia.
-- Tocca solo tabelle rr_*. Si parte da zero: nessun dato copiato da alca-desk.
-- Idempotente: si può rieseguire.

-- 1) Titolare del link. Gli operatori stanno in alca-desk (cbuypaehnqvdsgonkewo, energy.operatori),
--    che leggiamo soltanto: niente chiavi esterne. Per ora (accesso con chiave di amministrazione)
--    nome ed email si scrivono a mano; operatore_id si riempirà quando il login passerà ad alca-desk.
alter table public.rr_referrers
  add column if not exists operatore_id    uuid,
  add column if not exists operatore_nome  text,
  add column if not exists operatore_email text,
  add column if not exists created_by      uuid;

comment on column public.rr_referrers.operatore_id is
  'alca-desk energy.operatori.id del titolare del link (null = inserito a mano dalla dashboard)';
comment on column public.rr_referrers.operatore_nome is 'Nome e cognome del titolare del link';
comment on column public.rr_referrers.operatore_email is 'Email del titolare del link: riceve l''avviso di nuova analisi';
comment on column public.rr_referrers.created_by is 'alca-desk energy.operatori.id di chi ha creato il link';

create index if not exists rr_referrers_operatore_idx on public.rr_referrers (operatore_id);

-- 2) Gestione dell'analisi (note interne) e registro dell'email di avviso.
alter table public.rr_analyses
  add column if not exists note         text,
  add column if not exists updated_at   timestamptz,
  add column if not exists notified_at  timestamptz,
  add column if not exists notified_to  text,
  add column if not exists notify_error text;

comment on column public.rr_analyses.notified_at is 'Quando è partita l''email "nuova analisi" (null = non inviata)';
comment on column public.rr_analyses.notified_to is 'Destinatari dell''email "nuova analisi", separati da virgola';
comment on column public.rr_analyses.notify_error is 'Motivo per cui l''email non è partita';

-- 3) Destinatari dell'email "nuova analisi". Vuoto = nessuna email (si decide dalla dashboard).
insert into public.rr_settings (key, value) values
  ('notify_emails', ''),       -- indirizzi dell'ufficio, separati da virgola
  ('notify_owner',  'false')   -- 'true' = avvisa anche il titolare del link
on conflict (key) do nothing;
