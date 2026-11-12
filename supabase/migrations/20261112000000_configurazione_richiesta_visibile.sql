-- Area personale: il dettaglio di una richiesta mostra il referente (nome, contatti, foto) della
-- pagina personalizzata da cui è partita. Il cliente legge l'id, la pagina arriva da GET /prezzo-giusto/pagine/<id>.
grant select (id_configurazione) on public.richieste to authenticated;
