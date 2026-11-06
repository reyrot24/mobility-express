-- Pulizia dei dati di test di UN indirizzo email, per rifare il collaudo da zero.
-- Da eseguire nel SQL Editor di Supabase. Cambia l'email nella riga "v_email" e lancia tutto.
-- Cancella: utente e profilo, richieste, risultati, link di attivazione, adesioni, registro eventi,
-- consensi marketing, log email. NON tocca la pagina personalizzata (pagine_referenti).
-- Non usarlo su clienti reali: le prove di adesione vanno conservate (Informativa, par. 9).

begin;
set local app.pulizia_registro = 'on';  -- sblocca la cancellazione del registro eventi

do $$
declare
  v_email text := lower('reyrotaru1@gmail.com');
  v_user uuid;
begin
  select id into v_user from auth.users where lower(email) = v_email;

  delete from public.adesioni_eventi
  where adesione_id in (select id from public.adesioni where lower(email) = v_email)
     or richiesta_id in (select id from public.richieste where lower(email) = v_email);
  delete from public.consensi_marketing where lower(email) = v_email;
  delete from public.adesioni where lower(email) = v_email;
  delete from public.email_inviate
  where lower(destinatario) = v_email
     or richiesta_id in (select id from public.richieste where lower(email) = v_email);
  delete from public.attivazioni where lower(email) = v_email;
  delete from public.richieste where lower(email) = v_email;  -- risultati in cascata
  if v_user is not null then
    delete from auth.users where id = v_user;                  -- profilo in cascata
  end if;
  delete from public.limiti_richieste;                         -- azzera i rate limit (collaudi ripetuti)
  raise notice 'Pulizia completata per % (utente: %)', v_email, coalesce(v_user::text, 'nessuno');
end $$;

commit;
