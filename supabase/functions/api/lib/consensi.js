// Stessi testi di src/components/pages/PrezzoGiusto/utils/estimate.ts.
// Se cambiano, aggiornare le versioni in entrambi i file.
export const CHOICE_VERSION = "prezzo-giusto-2026-11-05-v2";

// Allineato alle Condizioni del Servizio v1.0, par. 5
export const ESTIMATE_DISCLAIMER =
  "Stima indicativa, gratuita e non vincolante: non è un preventivo ufficiale né un’offerta e non garantisce il prezzo di una compagnia né l’assicurabilità del rischio. Il premio e le condizioni effettive dipendono dalla verifica dei dati e dall’eventuale preventivo rilasciato dalla compagnia.";

// DA VALIDARE CON IL DPO (Informativa, par. 6): descrizione della logica effettiva della stima
export const ESTIMATE_METHOD =
  "L’intervallo è elaborato in automatico dai dati della richiesta. Non è un confronto con tutte le compagnie e non garantisce il prezzo più basso.";

export const CALLBACK_TEXT =
  "Chiedo di essere ricontattato via email dal referente associato alla mia richiesta per ottenere un preventivo assicurativo effettivo. Facoltativo.";

export const MARKETING_VERSION = "marketing-2026-11-05-v1";

export const MARKETING_TEXT =
  "Acconsento a ricevere via email comunicazioni commerciali di Alca Broker S.r.l. su prodotti e servizi ulteriori rispetto al monitoraggio. Consenso facoltativo e revocabile, non necessario per attivare il servizio.";

/**
 * Scelte registrate nella richiesta: informativa resa (con la versione) e ricontatto.
 * Accettazione delle Condizioni e marketing NON sono qui: si registrano alla conferma
 * dell'adesione (tabelle adesioni e consensi_marketing).
 */
export const recordChoices = ({ ricontatto, referralId }, date, privacyDocId) => ({
  privacyAcknowledged: true,
  privacyDocumento: privacyDocId,
  callback: {
    granted: ricontatto,
    channel: "email",
    referralId,
    text: CALLBACK_TEXT,
    ...(ricontatto && { requestedAt: date }),
  },
  version: CHOICE_VERSION,
  recordedAt: date,
});
