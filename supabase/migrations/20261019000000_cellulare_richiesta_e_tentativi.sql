-- 1. Il cellulare si raccoglie nel form della richiesta: all'attivazione passa al profilo.
-- 2. Nuovi tentativi automatici per le richieste che non sono arrivate a devops.
-- Colonne solo per il server: nessun permesso al browser.

alter table public.richieste
  add column if not exists cellulare text not null default '' check (char_length(cellulare) <= 20),
  add column if not exists tentativi_devops integer not null default 0,
  add column if not exists prossimo_tentativo_at timestamptz;

create index if not exists richieste_da_ritentare_idx on public.richieste (prossimo_tentativo_at)
  where stato = 'errore' and inviata_devops_at is null;
