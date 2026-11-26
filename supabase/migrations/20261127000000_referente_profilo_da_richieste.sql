-- Profili senza referente o senza pagina: prima l'area personale e le richieste fatte da lì
-- restavano con il referente demo anche se il cliente era poi arrivato dal link di un referente.
-- Da ora l'API li completa alla conferma (adottaReferente); qui si sistemano i profili esistenti.
-- Un referente già presente sul profilo non cambia.

-- 1. Profilo senza referente: referente e pagina dell'ultima richiesta confermata che ne aveva uno
update public.profili p
set referral_id = r.referral_id,
    id_configurazione = r.id_configurazione
from (
  select distinct on (user_id) user_id, referral_id, id_configurazione
  from public.richieste
  where user_id is not null and referral_id is not null and referral_id <> ''
  order by user_id, created_at desc
) r
where r.user_id = p.id and (p.referral_id is null or p.referral_id = '');

-- 2. Profilo con referente ma senza pagina: l'ultima pagina di una richiesta dello stesso referente
update public.profili p
set id_configurazione = r.id_configurazione
from (
  select distinct on (user_id, referral_id) user_id, referral_id, id_configurazione
  from public.richieste
  where user_id is not null and id_configurazione is not null
  order by user_id, referral_id, created_at desc
) r
where r.user_id = p.id and r.referral_id = p.referral_id and p.id_configurazione is null;
