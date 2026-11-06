// Documenti del servizio "OK, il prezzo è giusto?" di Alca Broker S.r.l. — versione 1.0 del 04/11/2026.
// Testo identico ai PDF in public/legal/il-prezzo-giusto/. Gli id devono coincidere con le righe attive
// della tabella documenti_legali (migrazione 20261105000000): il server rifiuta una conferma fatta su
// una versione diversa. Nuova versione = nuovo PDF, nuovo id, nuova riga nel database.
// "**testo**" = grassetto.

export type DocumentoLegale = {
  id: string;
  tipo: "condizioni" | "privacy";
  etichetta: string;
  titolo: string;
  sottotitolo: string;
  versione: string;
  data: string;
  pdf: string;
  sezioni: { titolo: string; paragrafi: string[] }[];
  nota: string;
};

export const CONDIZIONI: DocumentoLegale = {
  id: "condizioni-1.0",
  tipo: "condizioni",
  etichetta: "Documento 1 / Condizioni del servizio",
  titolo: "Condizioni Generali del Servizio",
  sottotitolo:
    "“OK, il prezzo è giusto?” - Servizio gratuito di stima e monitoraggio del costo RC Auto. Versione 1.0, 4 novembre 2026.",
  versione: "1.0",
  data: "2026-11-04",
  pdf: "/legal/il-prezzo-giusto/condizioni-v1.0.pdf",
  sezioni: [
    {
      titolo: "1. Soggetto che offre il servizio",
      paragrafi: [
        "Il servizio **“OK, il prezzo è giusto?”** (il “Servizio”) è proposto da **Alca Broker S.r.l.**, sede legale in Via Vittoria Colonna 14, 80121 Napoli (NA), C.F. e P.IVA 07965051217, intermediario iscritto alla sezione B del RUI con numero B000514026 (di seguito “Alca Broker”). Contatti: info@alcabroker.it; PEC alcabrokersrl@legalmail.it.",
        "Il Servizio è supportato dalla piattaforma tecnologica Mobility Express. I trattamenti di dati personali collegati sono descritti nell'Informativa Privacy dedicata.",
      ],
    },
    {
      titolo: "2. Finalità e oggetto",
      paragrafi: [
        "Il Servizio consente al cliente che ne faccia richiesta di ricevere **una stima indicativa, gratuita e non vincolante** del possibile costo di una copertura di responsabilità civile auto (RC Auto) per un veicolo identificato o comunque riconducibile alla sua richiesta.",
        "L'adesione comprende il **monitoraggio continuativo delle scadenze conosciute** e l'eventuale elaborazione di nuove stime in prossimità dei rinnovi futuri, quando i dati e gli strumenti disponibili consentono un'elaborazione attendibile. Non comprende automaticamente consulenze su altri prodotti né l'invio di campagne promozionali.",
        "L'adesione si riferisce al veicolo e alla richiesta individuati nel percorso di attivazione; eventuali altri veicoli richiedono una scelta e una corretta associazione dei dati.",
      ],
    },
    {
      titolo: "3. Richiesta, adesione e attivazione",
      paragrafi: [
        "Il Servizio è attivato a seguito di una richiesta effettiva del cliente e della sua conferma tramite una procedura elettronica dedicata. La pagina di adesione rende disponibili queste Condizioni e l'Informativa Privacy; le scelte facoltative in materia di marketing rimangono separate e non condizionano l'accesso al Servizio.",
        "La mera consegna o apertura dell'email, così come l'apertura del collegamento, non equivale all'accettazione. L'attivazione richiede una conferma esplicita, verificata e registrata dal sistema. La registrazione indica almeno la data e l'ora, l'identificativo della richiesta e la versione del testo accettato. L'iscrizione al Servizio non può essere presunta dalla sola presenza di un nominativo in archivio.",
      ],
    },
    {
      titolo: "4. Dati utilizzati e responsabilità del cliente",
      paragrafi: [
        "Per le elaborazioni possono essere utilizzati, nei limiti consentiti e secondo l'Informativa Privacy, dati identificativi e di contatto, targa e caratteristiche del veicolo, informazioni sul rischio, eventuali dati di polizza o di scadenza e informazioni fornite dal cliente o legittimamente disponibili nell'ambito del rapporto con Alca Broker.",
        "Il cliente è invitato a verificare che le informazioni comunicate siano corrette e aggiornate. Dati mancanti, inesatti, non aggiornati o non disponibili possono impedire la stima o modificarne significativamente l'importo. Il cliente può chiedere rettifica e aggiornamento dei dati attraverso i contatti indicati.",
      ],
    },
    {
      titolo: "5. Natura della stima e limiti",
      paragrafi: [
        "**La stima non è un preventivo ufficiale, non è un'offerta vincolante e non garantisce il prezzo di una compagnia né l'assicurabilità del rischio.** Può essere espressa come importo orientativo o intervallo di valori; il risultato e la sua metodologia devono essere chiaramente identificati come stima.",
        "Il Servizio non assicura il confronto con tutte le imprese del mercato, non garantisce il prezzo più basso e non assicura la disponibilità di una determinata garanzia o tariffa. Il premio e le condizioni effettive dipendono dalla successiva verifica dei dati e dall'eventuale preventivo rilasciato dalla compagnia.",
      ],
    },
    {
      titolo: "6. Monitoraggio dei rinnovi futuri",
      paragrafi: [
        "Finché il Servizio è attivo, Alca Broker può elaborare e trasmettere stime aggiornate in prossimità delle scadenze assicurative note, tramite l'indirizzo email confermato. Il sistema può prevedere un aggiornamento orientativo circa 30 giorni prima della scadenza: la tempistica effettiva può variare ed è subordinata alla disponibilità e alla qualità dei dati, alla funzionalità degli strumenti di calcolo e alla liceità del relativo trattamento.",
        "L'assenza di una stima o di un messaggio non modifica le scadenze della polizza del cliente e non esonera quest'ultimo dalla verifica della copertura e dall'eventuale rinnovo. Il Servizio non esegue rinnovi, pagamenti, acquisti o altre operazioni di stipula automatica.",
        "Gli avvisi strettamente inerenti al monitoraggio richiesto sono distinti dalle comunicazioni commerciali su prodotti e servizi ulteriori, per le quali si applicano le specifiche regole privacy e, quando necessario, una scelta facoltativa del cliente.",
      ],
    },
    {
      titolo: "7. Richiesta di un preventivo assicurativo ufficiale",
      paragrafi: [
        "Se desidera una proposta concreta, il cliente può richiedere separatamente un preventivo assicurativo. In tale fase potranno essere necessari ulteriori dati, la documentazione informativa e precontrattuale prevista dalla disciplina assicurativa, nonché le verifiche e le condizioni della compagnia interessata.",
        "L'adesione al Servizio non conferisce ad Alca Broker un mandato a stipulare o rinnovare automaticamente contratti assicurativi per conto del cliente.",
      ],
    },
    {
      titolo: "8. Gratuità, durata e cessazione",
      paragrafi: [
        "Il Servizio è gratuito e non impone alcun obbligo di acquisto. A seguito dell'attivazione continua sino a quando il cliente ne richiede la cessazione, fatta salva l'eventuale disattivazione per motivi tecnici, organizzativi o normativi comunicata con modalità adeguate.",
        "Il cliente può chiedere gratuitamente la cessazione del monitoraggio scrivendo a **info@alcabroker.it** o, quando attivata, mediante la funzione dedicata messa a disposizione dalla piattaforma. La cessazione interrompe le successive elaborazioni e comunicazioni di servizio, salvo quanto necessario per finalizzare richieste già in corso o adempiere a obblighi di legge. Le richieste sui dati personali seguono l'Informativa Privacy.",
      ],
    },
    {
      titolo: "9. Disponibilità e assistenza",
      paragrafi: [
        "Alca Broker si impegna a gestire il Servizio con diligenza professionale, ferma la possibilità di aggiornamenti, manutenzione e interruzioni tecniche. L'eventuale mancata disponibilità del Servizio non equivale a copertura assicurativa e non modifica i rapporti del cliente con la propria compagnia.",
        "Per assistenza: info@alcabroker.it. Restano ferme tutte le responsabilità non escludibili ai sensi della legge applicabile.",
      ],
    },
    {
      titolo: "10. Modifiche, disciplina applicabile e tutela del cliente",
      paragrafi: [
        "Le modifiche rilevanti del Servizio e delle presenti Condizioni sono comunicate con modalità adeguate; se richiedono una nuova manifestazione di volontà, questa viene raccolta prima della relativa applicazione. La versione applicabile alla richiesta viene conservata nel registro delle adesioni.",
        "Si applica la legge italiana, fatte salve le disposizioni inderogabili a tutela del consumatore. Per eventuali reclami sull'attività distributiva assicurativa si applicano gli strumenti previsti dalla normativa di settore, distinti dalle richieste di semplice assistenza sul Servizio.",
      ],
    },
  ],
  nota: "**Trasparenza:** questo documento disciplina un servizio informativo gratuito, non una proposta assicurativa. L'adesione deve essere registrata attraverso l'apposito flusso: la semplice lettura di queste Condizioni non attiva il Servizio.",
};

export const PRIVACY: DocumentoLegale = {
  id: "privacy-1.0",
  tipo: "privacy",
  etichetta: "Documento 2 / Informativa privacy",
  titolo: "Informativa sul trattamento dei dati",
  sottotitolo:
    "Servizio “OK, il prezzo è giusto?” - stima e monitoraggio continuativo del costo RC Auto. Informativa dedicata ai sensi degli artt. 13 e 14 del Regolamento (UE) 2016/679. Versione 1.0, 4 novembre 2026.",
  versione: "1.0",
  data: "2026-11-04",
  pdf: "/legal/il-prezzo-giusto/privacy-v1.0.pdf",
  sezioni: [
    {
      titolo: "1. Titolare e contatti",
      paragrafi: [
        "Il titolare del trattamento per il Servizio è **Alca Broker S.r.l.**, con sede legale in Via Vittoria Colonna 14, 80121 Napoli (NA), C.F. e P.IVA 07965051217, iscritta alla sezione B del RUI con numero B000514026.",
        "Per richieste privacy: **privacy@alcabroker.it**; PEC: alcabrokersrl@legalmail.it. Il Responsabile della Protezione dei Dati (DPO) è contattabile all'indirizzo **dpo@alcabroker.it**.",
      ],
    },
    {
      titolo: "2. Ambito del trattamento",
      paragrafi: [
        "Questa informativa riguarda la gestione della richiesta di adesione al servizio gratuito “OK, il prezzo è giusto?”, l'elaborazione di una prima stima indicativa RC Auto, il monitoraggio delle scadenze assicurative note e l'eventuale aggiornamento e invio di stime in occasione dei rinnovi futuri.",
        "Non sostituisce le informative specifiche eventualmente necessarie per la successiva richiesta di preventivi ufficiali, la distribuzione o gestione di una polizza, le attività svolte dalle compagnie assicurative né le informative generali degli altri siti e servizi utilizzati.",
      ],
    },
    {
      titolo: "3. Categorie e provenienza dei dati",
      paragrafi: [
        "In funzione della richiesta potranno essere trattati: nome, cognome, email e altri recapiti forniti; identificativo del cliente e dell'intermediario; targa, caratteristiche del veicolo e informazioni rilevanti sul rischio; scadenza e dati essenziali della copertura; storico delle stime e delle richieste; preferenze del Servizio; conferme, disattivazioni e log tecnici necessari a sicurezza e prova dell'adesione.",
        "I dati possono essere comunicati direttamente dall'interessato, essere già legittimamente disponibili presso Alca Broker nell'ambito del rapporto esistente, oppure pervenire da intermediari incaricati o altri soggetti coinvolti nel rapporto in conformità alle rispettive autorizzazioni. La disponibilità di dati nel CRM non comporta automaticamente l'adesione al Servizio. Se i dati non sono raccolti presso l'interessato, viene resa l'informativa nei tempi e alle condizioni dell'art. 14 GDPR.",
      ],
    },
    {
      titolo: "4. Finalità e basi giuridiche",
      paragrafi: [
        "**a) Erogazione del Servizio richiesto:** raccolta della richiesta, conferma dell'adesione, elaborazione delle stime, gestione delle scadenze conosciute, comunicazioni strettamente attinenti al monitoraggio e assistenza. Base giuridica: art. 6, par. 1, lett. b) GDPR, nella misura necessaria all'esecuzione del Servizio effettivamente richiesto dall'interessato.",
        "**b) Obblighi di legge:** gestione degli adempimenti effettivamente applicabili e delle richieste delle autorità. Base: art. 6, par. 1, lett. c) GDPR.",
        "**c) Sicurezza e tutela dei diritti:** controlli sugli accessi, prevenzione di abusi, conservazione della prova delle adesioni e gestione delle controversie nella misura necessaria. Base: art. 6, par. 1, lett. f) GDPR, previo bilanciamento degli interessi e fatte salve le eventuali diverse basi applicabili.",
        "**d) Comunicazioni commerciali facoltative:** eventuale invio tramite email di offerte e iniziative ulteriori rispetto al monitoraggio richiesto, esclusivamente quando sussista un'idonea condizione di liceità e, di regola, previo consenso specifico e separato ai sensi dell'art. 6, par. 1, lett. a) GDPR e dell'art. 130 del Codice Privacy. Il rifiuto non impedisce il Servizio.",
        "La presa visione dell'informativa e l'accettazione delle Condizioni del Servizio non costituiscono da sole consenso al marketing o alla profilazione commerciale. Eventuali trattamenti ulteriori di profilazione richiederanno una distinta valutazione e, ove previsto, una scelta separata.",
      ],
    },
    {
      titolo: "5. Natura del conferimento",
      paragrafi: [
        "I dati indicati come necessari per identificare la richiesta, elaborare la stima e associare la corretta scadenza sono richiesti per l'esecuzione del Servizio. Il mancato conferimento può impedirne l'attivazione o rendere impossibile l'elaborazione di una stima attendibile. I recapiti e le preferenze non necessari sono facoltativi. Il consenso marketing, se richiesto, è sempre separato e facoltativo.",
      ],
    },
    {
      titolo: "6. Elaborazioni automatizzate e significato della stima",
      paragrafi: [
        "Il Servizio può utilizzare procedure automatizzate per determinare un importo o intervallo stimato sulla base dei dati disponibili. La stima ha finalità orientativa, non costituisce una tariffa ufficiale della compagnia e **non comporta da sola emissione, rinnovo o rifiuto di una copertura**.",
        "La logica effettivamente impiegata, i criteri significativi, gli eventuali strumenti di intelligenza artificiale e il loro impatto sui diritti degli interessati devono essere mappati e descritti dal titolare prima dell'avvio; ove ricorrano decisioni automatizzate rilevanti ai sensi dell'art. 22 GDPR, dovranno essere fornite le ulteriori informazioni e garanzie richieste dalla norma.",
      ],
    },
    {
      titolo: "7. Destinatari e soggetti coinvolti",
      paragrafi: [
        "I dati potranno essere trattati da personale autorizzato di Alca Broker, intermediari coinvolti nel rapporto in base ai rispettivi ruoli, fornitori effettivamente utilizzati per hosting, software, elaborazione, comunicazione email, conservazione dei log e sicurezza, consulenti e autorità quando necessario.",
        "I fornitori che operano per conto del titolare sono disciplinati da accordi ai sensi dell'art. 28 GDPR. Compagnie e altri intermediari possono agire come titolari autonomi per servizi distinti richiesti dal cliente, secondo le proprie informative. Informazioni aggiornate sull'identità dei responsabili del trattamento possono essere richieste a privacy@alcabroker.it.",
      ],
    },
    {
      titolo: "8. Trasferimenti internazionali",
      paragrafi: [
        "Laddove i servizi tecnologici, di posta elettronica o di assistenza comportino un trasferimento di dati personali verso Paesi esterni allo Spazio Economico Europeo, il titolare applica le condizioni e le garanzie previste dal Capo V del GDPR, incluse le eventuali decisioni di adeguatezza o le clausole contrattuali standard pertinenti. L'interessato può richiedere informazioni sui Paesi coinvolti e sulle garanzie applicabili scrivendo a privacy@alcabroker.it.",
      ],
    },
    {
      titolo: "9. Conservazione",
      paragrafi: [
        "I dati necessari al monitoraggio sono trattati per la durata del Servizio attivato dall'interessato. In caso di cessazione, vengono interrotte le successive elaborazioni periodiche; gli eventuali dati e le prove delle scelte che debbano essere conservati per obblighi applicabili o per la tutela di diritti sono limitati a quanto necessario.",
        "Le preferenze commerciali sono mantenute fino alla revoca o al venir meno della finalità, secondo i criteri di conservazione adottati dal titolare. I log tecnici sono conservati solo per il tempo necessario alla sicurezza, alla gestione degli incidenti e alla prova delle operazioni. Le prove di adesione, modifica e cessazione sono conservate per il tempo necessario a documentare la liceità del Servizio e a tutelare i diritti delle parti, nei limiti dei termini applicabili. Alla scadenza dei rispettivi periodi, i dati sono cancellati o anonimizzati secondo le procedure adottate anche per i backup.",
      ],
    },
    {
      titolo: "10. Diritti degli interessati",
      paragrafi: [
        "Nei casi previsti dal GDPR, l'interessato può chiedere accesso, rettifica, cancellazione, limitazione, portabilità dei dati, nonché opporsi ai trattamenti fondati sul legittimo interesse e al marketing diretto in qualsiasi momento. Può revocare i consensi facoltativi senza pregiudicare la liceità dei trattamenti precedenti. L'interruzione del Servizio è distinta dalla revoca del consenso marketing.",
        "Per esercitare i diritti: **privacy@alcabroker.it** o **dpo@alcabroker.it**. È possibile proporre reclamo al Garante per la protezione dei dati personali (www.garanteprivacy.it) e utilizzare gli altri strumenti di tutela previsti dalla legge.",
      ],
    },
    {
      titolo: "11. Aggiornamenti dell'informativa",
      paragrafi: [
        "Questa informativa è riferita alla versione del Servizio indicata e dovrà essere aggiornata se cambiano finalità, dati, fonti, destinatari o strumenti. Le modifiche rilevanti verranno comunicate con modalità adeguate. Le nuove finalità soggette a consenso saranno attivate solo dopo averlo raccolto validamente.",
      ],
    },
  ],
  nota: "**Nota:** l'attivazione del monitoraggio è distinta dal consenso a ricevere comunicazioni commerciali. La semplice lettura di questa informativa non costituisce un consenso generale al trattamento.",
};

/** Id delle versioni mostrate: il server li confronta con quelle attive prima di registrare la conferma. */
export const DOCUMENTI_MOSTRATI = { condizioni: CONDIZIONI.id, privacy: PRIVACY.id };
