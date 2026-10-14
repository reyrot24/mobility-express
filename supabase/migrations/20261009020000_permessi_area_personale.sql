-- Area personale: il cliente legge anche il referente della richiesta,
-- ma non la risposta grezza delle API salvata in risultati.dettagli.
grant select (referral_id) on public.richieste to authenticated;

revoke select on public.risultati from anon, authenticated;
grant select (richiesta_id, prezzo, prezzo_min, prezzo_max, valuta, periodicita, fonte, demo, created_at)
  on public.risultati to authenticated;
