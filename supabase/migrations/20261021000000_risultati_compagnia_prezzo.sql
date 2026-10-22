-- Devops restituisce un prezzo puntuale e la compagnia: la tabella risultati tiene solo
-- richiesta_id, compagnia e prezzo. Range, valuta, provenienza e risposta grezza non servono più.

alter table public.risultati add column if not exists compagnia text;

-- Righe esistenti (test e simulazioni): il prezzo puntuale prende il minimo del range
update public.risultati
set prezzo = coalesce(prezzo, prezzo_min),
    compagnia = coalesce(compagnia, fonte, 'Non indicata');

-- Il drop delle colonne rimuove anche i vincoli e i permessi che le usano
alter table public.risultati
  drop column prezzo_min,
  drop column prezzo_max,
  drop column valuta,
  drop column periodicita,
  drop column fonte,
  drop column demo,
  drop column dettagli,
  drop column created_at,
  alter column prezzo set not null,
  alter column compagnia set not null;

-- Area personale: il cliente legge solo il prezzo delle proprie richieste
revoke select on public.risultati from anon, authenticated;
grant select (richiesta_id, prezzo) on public.risultati to authenticated;
