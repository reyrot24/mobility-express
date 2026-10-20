-- Il server Express è sostituito dalla Edge Function "api".
-- 1. Prenotazione dell'invio a devops: più istanze della funzione non inviano due volte la stessa richiesta.
-- 2. Rate limit condiviso tra le istanze (prima era in memoria nel server).
-- 3. pg_cron chiama la funzione per i nuovi tentativi (prima era un setInterval nel server).
--
-- Prima di questa migrazione salvare nel Vault l'indirizzo della funzione e il segreto del cron
-- (lo stesso valore del secret CRON_SECRET della funzione):
--   select vault.create_secret('https://<progetto>.supabase.co/functions/v1/api', 'prezzo_giusto_api_url');
--   select vault.create_secret('<CRON_SECRET>', 'prezzo_giusto_cron_secret');
-- Senza questi segreti il cron non chiama la funzione.

-- ───────────── 1. Prenotazione dell'invio ─────────────
alter table public.richieste add column if not exists invio_avviato_at timestamptz;

create index if not exists richieste_da_inviare_idx on public.richieste (invio_avviato_at)
  where stato = 'in_elaborazione' and inviata_devops_at is null;

-- ───────────── 2. Rate limit ─────────────
create table public.limiti_richieste (
  chiave text primary key,
  conteggio integer not null,
  reset_at timestamptz not null
);
alter table public.limiti_richieste enable row level security; -- nessuna policy: solo la funzione
revoke all on public.limiti_richieste from anon, authenticated;

-- Conta una richiesta per la chiave (rotta + IP). Restituisce 0 se può passare,
-- altrimenti i secondi da attendere.
create or replace function public.consuma_limite(p_chiave text, p_max integer, p_finestra_sec integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  riga public.limiti_richieste;
begin
  insert into public.limiti_richieste as l (chiave, conteggio, reset_at)
  values (p_chiave, 1, now() + make_interval(secs => p_finestra_sec))
  on conflict (chiave) do update set
    conteggio = case when l.reset_at <= now() then 1 else l.conteggio + 1 end,
    reset_at = case when l.reset_at <= now() then excluded.reset_at else l.reset_at end
  returning * into riga;

  if riga.conteggio <= p_max then
    return 0;
  end if;
  return greatest(1, ceil(extract(epoch from riga.reset_at - now()))::integer);
end;
$$;
revoke execute on function public.consuma_limite(text, integer, integer) from public, anon, authenticated;

-- ───────────── 3. Nuovi tentativi verso devops ─────────────
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Ogni minuto, solo se c'è qualcosa da inviare: richieste in errore con un tentativo dovuto,
-- oppure confermate ma mai partite o con un invio interrotto da più di 2 minuti.
select cron.schedule(
  'prezzo-giusto-tentativi-devops',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'prezzo_giusto_api_url')
      || '/interno/tentativi',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'prezzo_giusto_cron_secret'
      )
    ),
    body := '{}'::jsonb
  )
  where exists (select 1 from vault.decrypted_secrets where name = 'prezzo_giusto_api_url')
    and exists (select 1 from vault.decrypted_secrets where name = 'prezzo_giusto_cron_secret')
    and exists (
      select 1 from public.richieste
      where inviata_devops_at is null
        and user_id is not null
        and (
          (stato = 'errore' and prossimo_tentativo_at <= now())
          or (stato = 'in_elaborazione'
              and (invio_avviato_at is null or invio_avviato_at < now() - interval '2 minutes'))
        )
    );
  $$
);

-- Pulizia notturna dei contatori del rate limit scaduti
select cron.schedule(
  'prezzo-giusto-pulizia-limiti',
  '17 3 * * *',
  $$ delete from public.limiti_richieste where reset_at < now() $$
);
