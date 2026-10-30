-- La pagina personalizzata ora si identifica con l'idConfiguration di devops, non con il referral.
-- Link: /prezzo-giusto/<referral_id>/<id_configurazione>. Il referral resta per le richieste.
alter table public.pagine_referenti rename column referral_id to id_configurazione;
alter table public.pagine_referenti
  rename constraint pagine_referenti_referral_id_check to pagine_referenti_id_configurazione_check;

-- Configurazione del link da cui è arrivata la richiesta: personalizza le email al cliente.
-- Nessun permesso al browser: la legge solo la funzione.
alter table public.richieste add column id_configurazione text;
