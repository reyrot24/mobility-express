-- Pagina personalizzata del referente da cui il cliente ha attivato l'area personale.
-- Serve alle richieste fatte dall'area personale (che non passano dal link) per usare nelle email
-- il referente, i colori e il logo giusti invece di quelli standard.
alter table public.profili
  add column if not exists id_configurazione text;

-- Profili esistenti: la configurazione della loro richiesta più recente che ne aveva una
update public.profili p
set id_configurazione = r.id_configurazione
from (
  select distinct on (user_id) user_id, id_configurazione
  from public.richieste
  where user_id is not null and id_configurazione is not null
  order by user_id, created_at desc
) r
where r.user_id = p.id and p.id_configurazione is null;

-- Il cliente non la modifica: i permessi di update restano su nome, cognome e cellulare.
