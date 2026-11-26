-- Devops può rispondere con status 0 e un messaggio che spiega perché non c'è un prezzo.
-- Il messaggio è per il cliente (email e area personale): colonna propria, leggibile dal cliente,
-- separata da "errore" che resta tecnica e nascosta.
alter table public.richieste add column if not exists motivo_non_disponibile text;
grant select (motivo_non_disponibile) on public.richieste to authenticated;
