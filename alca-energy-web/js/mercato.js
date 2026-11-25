/* Offerte business del RESTO DEL MERCATO (fornitori che non abbiamo in catalogo).
   Aggiornato con una ricerca sul web ogni 3 giorni: prezzi da siti dei fornitori e comparatori, IVA e imposte escluse.
   Stessi campi delle offerte del catalogo + fonte (link) e verificata (data del controllo).
   ccv = quota fissa di commercializzazione in €/anno. */
window.MERCATO = {
  aggiornato: "2026-11-22",
  luce: [
    { azienda: "E.ON", nome: "Dinamica Click ECO Luce", inizio: null, fine: "2026-12-16", tipologia: "Variabile", fascia: "Monoraria", p1: null, p2: null, spread: 0.0124, ccv: 193.2,
      operazioni: "", pagamento: "", restrizioni: "Solo online", note: "La fonte indica anche una quota aggiuntiva di 0,0168 €/kWh (totale sopra il PUN 0,0292): verificare nelle condizioni", fonte: "https://luce-gas.it/business/fornitori/eon", verificata: "2026-11-22" },
    { azienda: "Enel Energia", nome: "Flex Business Luce", inizio: null, fine: "2026-12-03", tipologia: "Variabile", fascia: "Monoraria", p1: null, p2: null, spread: 0.022, ccv: 156,
      operazioni: "", pagamento: "", restrizioni: "Fino a 15 kW", note: "Spread fisso 12 mesi. I comparatori riportano 0,0223", fonte: "https://www.enel.it/it-it/landing/imprese/luce-impresa", verificata: "2026-11-22" },
    { azienda: "Enel Energia", nome: "Flex Impresa Luce", inizio: null, fine: null, tipologia: "Variabile", fascia: "Monoraria", p1: null, p2: null, spread: 0.02, ccv: 156,
      operazioni: "", pagamento: "", restrizioni: "Da 15 a 25 kW (dedotto dalla pagina Enel: verificare)", note: "Spread fisso 12 mesi", fonte: "https://www.enel.it/it-it/landing/imprese/luce-impresa", verificata: "2026-11-22" },
    { azienda: "Enel Energia", nome: "Flex Box", inizio: null, fine: "2026-12-03", tipologia: "Variabile", fascia: "Monoraria", p1: null, p2: null, spread: 0.041, ccv: 72,
      operazioni: "", pagamento: "", restrizioni: "Altri usi: garage e cantine", note: "", fonte: "https://luce-gas.it/business/fornitori/enel", verificata: "2026-11-22" },
    { azienda: "Enel Energia", nome: "Fix Business Luce", inizio: null, fine: null, tipologia: "Fissa", fascia: "Monoraria", p1: 0.234, p2: null, spread: null, ccv: 180,
      operazioni: "", pagamento: "", restrizioni: "Fino a 15 kW (dedotto dalla pagina Enel: verificare)", note: "Prezzo bloccato 24 mesi, perdite di rete comprese", fonte: "https://www.enel.it/it-it/landing/imprese/luce-impresa", verificata: "2026-11-22" },
    { azienda: "Enel Energia", nome: "Fix Business Start Luce", inizio: null, fine: "2026-11-30", tipologia: "Fissa", fascia: "Monoraria", p1: 0.244, p2: null, spread: null, ccv: 192,
      operazioni: "", pagamento: "", restrizioni: "Fino a 25 kW", note: "Prezzo e quota bloccati 24 mesi. La pagina Enel la cita a 0,187 €/kWh come riferimento: verificare", fonte: "https://luce-gas.it/business/fornitori/enel", verificata: "2026-11-22" },
    { azienda: "Enel Energia", nome: "Business Super Luce", inizio: null, fine: null, tipologia: "Fissa", fascia: "Monoraria", p1: 0.159, p2: null, spread: null, ccv: 192,
      operazioni: "", pagamento: "", restrizioni: "Da 3 a 25 kW", note: "Prezzo bloccato 24 mesi, perdite di rete comprese. Nella stessa pagina Enel compare anche 0,161 €/kWh con quota 180 (o 156) €/anno: verificare", fonte: "https://www.enel.it/it-it/landing/imprese/luce-impresa", verificata: "2026-11-22" },
    { azienda: "A2A Energia", nome: "Smart Business Luce", inizio: null, fine: "2026-11-25", tipologia: "Variabile", fascia: "Monoraria", p1: null, p2: null, spread: 0.02, ccv: 180,
      operazioni: "", pagamento: "", restrizioni: "Bassa tensione, sotto 50.000 kWh/anno", note: "Sito A2A non raggiungibile il 22/11; prima rilevato 0,019998 sul sito ufficiale", fonte: "https://luce-gas.it/business/fornitori/a2a", verificata: "2026-11-22" },
    { azienda: "NeN", nome: "Special 60 Luce (business)", inizio: null, fine: "2026-11-30", tipologia: "Fissa", fascia: "Monoraria", p1: 0.189, p2: null, spread: null, ccv: 180,
      operazioni: "", pagamento: "", restrizioni: "", note: "Prezzo bloccato 24 mesi (un'altra pagina dice 12). Sconto 12 €/anno. La fonte indica una quota aggiuntiva di 0,0168 €/kWh: verificare. Un comparatore indica 0,179", fonte: "https://luce-gas.it/business/fornitori/nen", verificata: "2026-11-22" },
    { azienda: "OV Energy", nome: "PUN OVvia Business Luce", inizio: null, fine: "2026-12-31", tipologia: "Variabile", fascia: "Monoraria", p1: null, p2: null, spread: 0.02, ccv: 120,
      operazioni: "", pagamento: "", restrizioni: "", note: "ATTENZIONE: Selectra indica anche una quota al consumo di 0,0768 €/kWh (molto più alta degli altri): verificare", fonte: "https://selectra.net/energia/guida/confronto/migliore-offerta-luce-impresa", verificata: "2026-11-22" },
    { azienda: "Illumia", nome: "Placet Fissa Luce Business", inizio: null, fine: "2026-12-11", tipologia: "Fissa", fascia: "Monoraria", p1: 0.285, p2: null, spread: null, ccv: 192,
      operazioni: "", pagamento: "", restrizioni: "", note: "Offerta PLACET, prezzo fisso 12 mesi", fonte: "https://www.illumia.it/placet/illumia-placet-luce-business/", verificata: "2026-11-22" },
    { azienda: "Illumia", nome: "Placet Variabile Luce Business", inizio: null, fine: "2026-12-11", tipologia: "Variabile", fascia: "Monoraria", p1: null, p2: null, spread: 0.05, ccv: 192,
      operazioni: "", pagamento: "", restrizioni: "", note: "Offerta PLACET. La formula maggiora il PUN delle perdite di rete: verificare", fonte: "https://www.illumia.it/placet/illumia-placet-luce-business/", verificata: "2026-11-22" }
  ],
  gas: [
    { azienda: "E.ON", nome: "Dinamica Click Gas", inizio: null, fine: "2026-12-16", tipologia: "Variabile", p1: null, spread: 0.074, ccv: 193.2,
      operazioni: "", pagamento: "", restrizioni: "Solo online", note: "La fonte indica anche una quota aggiuntiva di 0,0295 €/Smc (totale sopra il PSV 0,1035): verificare nelle condizioni", fonte: "https://luce-gas.it/business/fornitori/eon", verificata: "2026-11-22" },
    { azienda: "A2A Energia", nome: "Smart Business Gas", inizio: null, fine: "2026-11-25", tipologia: "Variabile", p1: null, spread: 0.11, ccv: 180,
      operazioni: "", pagamento: "", restrizioni: "Sotto 20.000 Smc/anno", note: "", fonte: "https://luce-gas.it/business/fornitori/a2a", verificata: "2026-11-22" },
    { azienda: "OV Energy", nome: "PSV OVvia Business Gas", inizio: null, fine: "2026-12-31", tipologia: "Variabile", p1: null, spread: 0.15, ccv: 120,
      operazioni: "", pagamento: "", restrizioni: "", note: "Su Selectra la bolletta stimata è molto più alta di altre offerte con lo stesso spread: verificare costi aggiuntivi", fonte: "https://bolletta-energia.it/comparazione/offerte-business-luce-gas", verificata: "2026-11-22" },
    { azienda: "Enel Energia", nome: "Flex Business Gas", inizio: null, fine: "2026-12-03", tipologia: "Variabile", p1: null, spread: 0.16, ccv: 180,
      operazioni: "", pagamento: "", restrizioni: "Sotto 10.000 Smc/anno", note: "Spread e quota fissi 12 mesi", fonte: "https://luce-gas.it/business/fornitori/enel", verificata: "2026-11-22" },
    { azienda: "Illumia", nome: "Placet Variabile Gas Business", inizio: null, fine: "2026-12-11", tipologia: "Variabile", p1: null, spread: 0.35, ccv: 192,
      operazioni: "", pagamento: "", restrizioni: "", note: "Offerta PLACET, spread fisso 12 mesi", fonte: "https://www.illumia.it/placet/illumia-placet-gas-business/", verificata: "2026-11-22" },
    { azienda: "Green Network", nome: "Plus Sicura Gas", inizio: null, fine: null, tipologia: "Fissa", p1: 0.70, spread: null, ccv: 150,
      operazioni: "", pagamento: "", restrizioni: "", note: "Scadenza e data di aggiornamento non indicate (la gemella luce risulta scaduta il 16/11): verificare", fonte: "https://selectra.net/energia/guida/confronto/migliore-offerta-gas-impresa", verificata: "2026-11-22" },
    { azienda: "NeN", nome: "Special 60 Gas (business)", inizio: null, fine: "2026-11-30", tipologia: "Fissa", p1: 0.84, spread: null, ccv: 180,
      operazioni: "", pagamento: "", restrizioni: "", note: "Prezzo bloccato 24 mesi (un'altra pagina dice 12). Sconto 12 €/anno", fonte: "https://luce-gas.it/business/fornitori/nen", verificata: "2026-11-22" },
    { azienda: "Illumia", nome: "Placet Fissa Gas Business", inizio: null, fine: "2026-12-11", tipologia: "Fissa", p1: 1.30, spread: null, ccv: 192,
      operazioni: "", pagamento: "", restrizioni: "", note: "Offerta PLACET, prezzo fisso 12 mesi", fonte: "https://www.illumia.it/placet/illumia-placet-gas-business/", verificata: "2026-11-22" }
  ]
};
