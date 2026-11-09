// Testi legali della stima orientativa e delle scelte di contatto.
// Stessi testi di supabase/functions/api/lib/consensi.js: se cambiano, aggiornare le versioni in entrambi.

// Allineato alle Condizioni del Servizio v1.0, par. 5
export const ESTIMATE_DISCLAIMER =
  "Stima indicativa, gratuita e non vincolante: non è un preventivo ufficiale né un’offerta e non garantisce il prezzo di una compagnia né l’assicurabilità del rischio. Il premio e le condizioni effettive dipendono dalla verifica dei dati e dall’eventuale preventivo rilasciato dalla compagnia.";

// DA VALIDARE CON IL DPO (Informativa, par. 6): descrizione della logica effettiva della stima
export const ESTIMATE_METHOD =
  "L’intervallo è elaborato in automatico dai dati della richiesta. Non è un confronto con tutte le compagnie e non garantisce il prezzo più basso.";

export const CHOICE_VERSION = "prezzo-giusto-2026-11-10-v3";

export const CALLBACK_TEXT =
  "Chiedo di essere ricontattato via email dal referente associato alla mia richiesta per ottenere un preventivo assicurativo effettivo. Facoltativo.";

export const MARKETING_TEXT =
  "Acconsento a ricevere via email comunicazioni commerciali di Alca Broker S.r.l. su prodotti e servizi ulteriori rispetto al monitoraggio. Consenso facoltativo e revocabile, non necessario per attivare il servizio.";

export const PRIVACY_EMAIL = "privacy@alcabroker.it";

export type Estimate = {
  min: number;
  max: number;
  currency: "EUR";
  period: "year";
  basis: string;
  demo: boolean;
};

export type RequestStatus =
  | "in_attesa_attivazione"
  | "in_elaborazione"
  | "completata"
  | "non_disponibile"
  | "errore"
  | "annullata";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  in_attesa_attivazione: "In attesa di attivazione",
  in_elaborazione: "In elaborazione",
  completata: "Stima pronta",
  non_disponibile: "Stima non disponibile",
  errore: "Problema tecnico",
  annullata: "Monitoraggio interrotto",
};

// Scelte salvate con la richiesta. Condizioni accettate e marketing sono nel registro delle adesioni
// (sezione "Il servizio" dell'area personale), non qui.
export type Consents = {
  privacyAcknowledged: boolean;
  privacyDocumento?: string;
  // Dalla versione v3: Condizioni e marketing scelti nel form
  condizioni?: { accepted: boolean; documento: string | null; acceptedAt?: string };
  callback: { granted: boolean; requestedAt?: string };
  marketing?: { granted: boolean; text: string; version: string };
  version: string;
  recordedAt: string;
};

// Intervallo mostrato al cliente: da 10 € sotto a 30 € sopra il prezzo, in multipli di 10.
// Stesso calcolo di supabase/functions/api/services/stima.js.
export const intervalloStima = (prezzo: number) => ({
  min: Math.max(10, Math.floor((prezzo - 10) / 10) * 10),
  max: Math.ceil((prezzo + 30) / 10) * 10,
});

// Range (min–max) oppure prezzo puntuale quando min e max coincidono
export const estimateLabel = (estimate: Estimate) =>
  estimate.min === estimate.max
    ? `${estimate.min} €`
    : `${estimate.min}–${estimate.max} €`;
