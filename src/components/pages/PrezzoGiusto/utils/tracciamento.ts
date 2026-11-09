// Tracciamento essenziale del percorso di richiesta, tramite il tag Google già caricato in index.html.
// Nessun dato personale: niente targa, email, telefono o indirizzo, solo il passaggio raggiunto.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export type EventoStima =
  /** Primo campo toccato nel modulo (una volta per pagina) */
  | "pg_stima_iniziata"
  /** "Continua" al passaggio 1 con dati validi */
  | "pg_stima_passo1_completato"
  /** Richiesta accettata dal server */
  | "pg_stima_inviata"
  /** Invio rifiutato dal server o rete assente */
  | "pg_stima_errore";

export type ParametriStima = {
  /** "pubblico" dal link o dalla pagina standard, "area" dall'area personale */
  origine: "pubblico" | "area";
  /** Arrivato dal link personalizzato di un collaboratore */
  con_referente: boolean;
};

export function tracciaStima(evento: EventoStima, parametri: ParametriStima) {
  try {
    window.gtag?.("event", evento, parametri);
  } catch {
    // Il tracciamento non deve mai bloccare la richiesta
  }
}
