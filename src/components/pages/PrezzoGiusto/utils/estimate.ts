// Testi legali della stima orientativa e delle scelte di contatto.
// Se cambiano, aggiornare CHOICE_VERSION (qui e in server/lib/consensi.js).

export const ESTIMATE_DISCLAIMER =
  "Stima indicativa, non vincolante, non costituisce preventivo assicurativo né offerta contrattuale. Il prezzo definitivo dipende da verifiche, garanzie selezionate e condizioni della compagnia.";

export const ESTIMATE_METHOD =
  "Metodo previsto: parametri generali e tariffe di riferimento. Il range non è calcolato su una specifica offerta di una compagnia.";

export const CHOICE_VERSION = "soft-estimate-2026-10-06-v1";

export const CALLBACK_TEXT =
  "Chiedo di essere ricontattato via email dal referente associato alla mia richiesta per ottenere un preventivo assicurativo effettivo. Facoltativo.";

export const MARKETING_TEXT =
  "Acconsento a ricevere via email comunicazioni commerciali di Alca Broker srl. Consenso facoltativo e revocabile, non necessario per ricevere la stima o chiedere il ricontatto.";

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
  | "errore";

export const STATUS_LABELS: Record<RequestStatus, string> = {
  in_attesa_attivazione: "In attesa di attivazione",
  in_elaborazione: "In elaborazione",
  completata: "Stima pronta",
  non_disponibile: "Stima non disponibile",
  errore: "Problema tecnico",
};

export type Consents = {
  privacyAcknowledged: boolean;
  callback: { granted: boolean; requestedAt?: string };
  marketing: { granted: boolean };
  version: string;
  recordedAt: string;
};

// Range (min–max) oppure prezzo puntuale quando min e max coincidono
export const estimateLabel = (estimate: Estimate) =>
  estimate.min === estimate.max
    ? `${estimate.min} €`
    : `${estimate.min}–${estimate.max} €`;
