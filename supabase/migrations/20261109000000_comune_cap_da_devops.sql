-- Comune e CAP non si chiedono più al cliente nel form: arrivano da devops insieme al risultato
-- (POST /devops/risultati con "comune" e "cap") e si salvano sulla richiesta e sul profilo.
-- Anche il cellulare diventa facoltativo nel form: la colonna accetta già '' (default).

-- ───────────── Richieste: comune e CAP facoltativi ─────────────
alter table public.richieste
  alter column comune drop not null,
  drop constraint if exists richieste_cap_check,
  alter column cap drop not null;

-- Le richieste salvate con stringa vuota diventano null: "non ancora noto"
update public.richieste set comune = null where comune = '';
update public.richieste set cap = null where cap = '';

alter table public.richieste
  add constraint richieste_comune_check check (comune is null or char_length(comune) between 2 and 80),
  add constraint richieste_cap_check check (cap is null or cap ~ '^\d{5}$');

-- ───────────── Profili: comune e CAP dal risultato di devops ─────────────
alter table public.profili
  add column if not exists comune text check (comune is null or char_length(comune) between 2 and 80),
  add column if not exists cap text check (cap is null or cap ~ '^\d{5}$'),
  add column if not exists residenza_aggiornata_at timestamptz;

-- Il cliente li legge (policy "Il cliente vede il proprio profilo") ma non li modifica:
-- i permessi di update restano solo su nome, cognome e cellulare (migrazione 20261013000000).
