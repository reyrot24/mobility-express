import type { QuoteRequest } from "./model";
import type { Consents, RequestStatus } from "./estimate";
import type { PaginaReferente } from "./pagina";
import { DOCUMENTI_MOSTRATI } from "./documenti";

// API: Edge Function "api" di Supabase (supabase/functions/api).
// In produzione VITE_PG_API_URL = https://<progetto>.supabase.co/functions/v1/api.
// In sviluppo Vite inoltra /api alla funzione locale (vedi vite.config.ts).
const API_BASE = import.meta.env.VITE_PG_API_URL ?? "/api";

export type RichiestaResponse = {
  id: string;
  stato: RequestStatus;
  data: string;
  consensi: Consents;
};

const bearer = (token?: string): Record<string, string> =>
  token ? { Authorization: `Bearer ${token}` } : {};

async function post<T>(
  path: string,
  body: unknown,
  headers: Record<string, string> = {}
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Non riusciamo a raggiungere il servizio. Controlla la connessione e riprova."
    );
  }

  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      data?.message ?? "Non è stato possibile completare l’operazione. Riprova più tardi."
    );
  return data as T;
}

/** Registra la richiesta: il server conferma subito via email e invia la stima appena è pronta. */
export const richiediStima = (
  data: QuoteRequest,
  referralId: string,
  idempotencyKey: string,
  token?: string,
  configurationId?: string | null
) =>
  post<RichiestaResponse>(
    "/prezzo-giusto/richieste",
    {
      nome: data.firstName,
      cognome: data.lastName,
      cellulare: data.phone,
      referral_id: referralId,
      id_configurazione: configurationId ?? "",
      targa: data.plate,
      tipoStrada: data.streetType,
      strada: data.street,
      civico: data.houseNumber,
      comune: data.city,
      cap: data.zip,
      email: data.email,
      privacy: data.privacy,
      ricontatto: data.callback,
      marketing: data.marketing,
      // Solo dall'area personale: Condizioni accettate nel form, con la versione mostrata
      condizioni: data.condizioni,
      documenti: DOCUMENTI_MOSTRATI,
    },
    { "Idempotency-Key": idempotencyKey, ...bearer(token) }
  );

/** Ricontatto richiesto dall'area personale. Non modifica il consenso marketing. */
export const richiediRicontatto = (id: string, token: string) =>
  post<{ requestedAt: string }>(
    `/prezzo-giusto/richieste/${encodeURIComponent(id)}/ricontatto`,
    {},
    bearer(token)
  );

export type DocumentoPubblico = { id: string; versione: string; data: string; url: string; pdf: string };

export type DatiAttivazione = {
  email: string;
  temporaryPasswordRequired: boolean;
  /** L'email ha già un account: niente nuova password, basta confermare */
  accountEsistente: boolean;
  richiesta: { id: string; targa: string };
  documenti: { condizioni: DocumentoPubblico; privacy: DocumentoPubblico };
  /** Referente della pagina personalizzata del link, se configurato */
  referente: { name: string; role: string | null; phone: string; email: string } | null;
  /** Solo link inviati prima che le Condizioni si accettassero nel form */
  condizioniDaAccettare: boolean;
};

/** Dati per la pagina di conferma dell'adesione. Aprirla non accetta nulla. */
export async function datiAttivazione(token: string): Promise<DatiAttivazione> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE}/account/attivazione?token=${encodeURIComponent(token)}`
    );
  } catch {
    throw new Error(
      "Non riusciamo a raggiungere il servizio. Controlla la connessione e riprova."
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(data?.message ?? "Il link di attivazione non è valido.");
  return data as DatiAttivazione;
}

/**
 * "Conferma" dalla pagina del link: fa partire la richiesta. Condizioni e marketing sono quelli
 * scelti nel form; il server li legge dalla richiesta.
 */
export const attivaArea = (payload: {
  token: string;
  temporaryPassword: string;
  password?: string;
  /** Solo per i link con condizioniDaAccettare */
  condizioniAccettate?: boolean;
}) =>
  post<{ email: string; alreadyRegistered: boolean }>("/account/attivazione", {
    ...payload,
    documenti: DOCUMENTI_MOSTRATI,
  });

export type Adesione = {
  id: string;
  richiestaId: string | null;
  targa: string;
  stato: "in_attesa" | "attiva" | "cessata";
  attivataIl: string | null;
  condizioni: string | null;
  privacy: string;
  cessataIl: string | null;
};

export type StatoServizio = {
  adesioni: Adesione[];
  marketing: { granted: boolean; aggiornatoIl: string | null; testo: string };
  documenti: { condizioni: DocumentoPubblico; privacy: DocumentoPubblico };
};

/** "Gestisci servizio": adesioni, consenso marketing e documenti in vigore. */
export async function leggiServizio(token: string): Promise<StatoServizio> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/account/servizio`, { headers: bearer(token) });
  } catch {
    throw new Error("Non riusciamo a raggiungere il servizio. Controlla la connessione e riprova.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Non riusciamo a caricare il servizio.");
  return data as StatoServizio;
}

/** "Interrompi monitoraggio" per un veicolo: blocca subito le comunicazioni di servizio. */
export const interrompiMonitoraggio = (id: string, token: string, motivo = "") =>
  post<{ id: string; stato: "cessata"; cessataIl: string }>(
    `/account/adesioni/${encodeURIComponent(id)}/cessa`,
    { motivo },
    bearer(token)
  );

/** Concede o revoca il consenso alle comunicazioni commerciali. Indipendente dal servizio. */
export const impostaMarketing = (granted: boolean, token: string) =>
  post<{ granted: boolean; aggiornatoIl: string }>("/account/marketing", { granted }, bearer(token));

/** Nuova password: passa dal server, che toglie anche l'obbligo di cambio al primo accesso. */
export const cambiaPassword = (password: string, token: string) =>
  post<{ ok: true }>("/account/password", { password }, bearer(token));

/** Pagina personalizzata. null se la configurazione non esiste (404): si usa la pagina standard. */
export async function leggiPagina(configurationId: string): Promise<PaginaReferente | null> {
  const response = await fetch(
    `${API_BASE}/prezzo-giusto/pagine/${encodeURIComponent(configurationId)}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Pagina del referente non disponibile (${response.status}).`);
  const data = await response.json();
  return data.configurazione as PaginaReferente;
}
