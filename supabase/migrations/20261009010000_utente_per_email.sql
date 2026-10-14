-- Il server deve sapere se un'email è già registrata (email 1 o email 2).
-- L'API admin di Supabase non cerca per email: questa funzione lo fa, solo per il server.
create function public.utente_id_per_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;

revoke execute on function public.utente_id_per_email(text) from public, anon, authenticated;
grant execute on function public.utente_id_per_email(text) to service_role;

-- user_id serve alla policy RLS: lo rendiamo leggibile insieme alle altre colonne.
grant select (user_id) on public.richieste to authenticated;
