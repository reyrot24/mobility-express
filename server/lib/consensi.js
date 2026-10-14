// Stessi testi di src/components/pages/PrezzoGiusto/utils/estimate.ts.
// Se cambiano, aggiornare CHOICE_VERSION in entrambi i file.
export const CHOICE_VERSION = "soft-estimate-2026-10-06-v1";

export const ESTIMATE_DISCLAIMER =
  "Stima indicativa, non vincolante, non costituisce preventivo assicurativo né offerta contrattuale. Il prezzo definitivo dipende da verifiche, garanzie selezionate e condizioni della compagnia.";

export const ESTIMATE_METHOD =
  "Metodo previsto: parametri generali e tariffe di riferimento. Il range non è calcolato su una specifica offerta di una compagnia.";

export const CALLBACK_TEXT =
  "Chiedo di essere ricontattato via email dal referente associato alla mia richiesta per ottenere un preventivo assicurativo effettivo. Facoltativo.";

export const MARKETING_TEXT =
  "Acconsento a ricevere via email comunicazioni commerciali di Alca Broker srl. Consenso facoltativo e revocabile, non necessario per ricevere la stima o chiedere il ricontatto.";

/**
 * Registro delle scelte: presa visione privacy, ricontatto e marketing restano separati,
 * con testo, versione e data. Ricontatto e marketing non si influenzano a vicenda.
 */
export const recordChoices = ({ ricontatto, marketing, referralId }, date) => ({
  privacyAcknowledged: true,
  callback: {
    granted: ricontatto,
    channel: "email",
    referralId,
    text: CALLBACK_TEXT,
    ...(ricontatto && { requestedAt: date }),
  },
  marketing: {
    granted: marketing,
    channel: "email",
    controller: "Alca Broker srl",
    text: MARKETING_TEXT,
  },
  version: CHOICE_VERSION,
  recordedAt: date,
});
