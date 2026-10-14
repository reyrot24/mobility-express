-- Segnalazioni e suggerimenti dalla pagina /suggerisci/.
-- Scritture e letture solo dal server Express (chiave secret): nessun accesso dal browser.

create table public.segnalazioni (
  id text primary key,                                   -- es. SG-1A2B3C4D
  tipo text not null check (tipo in ('idea', 'improvement', 'bug')),
  area text not null check (char_length(area) <= 80),
  titolo text not null check (char_length(titolo) between 5 and 100),
  descrizione text not null check (char_length(descrizione) between 20 and 2000),
  beneficio text not null default '' check (char_length(beneficio) <= 1000),
  impatto text not null check (impatto in ('low', 'medium', 'high')),
  contatto_nome text check (char_length(contatto_nome) <= 80),
  contatto_email text check (char_length(contatto_email) <= 254),
  stato text not null default 'ricevuto'
    check (stato in ('ricevuto', 'in_valutazione', 'pianificato', 'realizzato', 'archiviato')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index segnalazioni_stato_created_idx on public.segnalazioni (stato, created_at desc);

create trigger segnalazioni_updated_at before update on public.segnalazioni
  for each row execute function public.set_updated_at();

alter table public.segnalazioni enable row level security; -- nessuna policy: solo server
revoke all on public.segnalazioni from anon, authenticated;
