import type { QuoteRequest } from "./model";
import type { Consents, RequestStatus } from "./estimate";
import type { PaginaReferente } from "./pagina";

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
  token?: string
) =>
  post<RichiestaResponse>(
    "/prezzo-giusto/richieste",
    {
      nome: data.firstName,
      cognome: data.lastName,
      cellulare: data.phone,
      referral_id: referralId,
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

export type DatiAttivazione = {
  email: string;
  temporaryPasswordRequired: boolean;
};

/** Dati per precompilare il form di attivazione dell'area personale. */
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

/** Attiva l'area personale: crea l'account con i dati della richiesta e la password scelta. */
export const attivaArea = (payload: {
  token: string;
  temporaryPassword: string;
  password: string;
}) => post<{ email: string; alreadyRegistered: boolean }>("/account/attivazione", payload);

/** Nuova password: passa dal server, che toglie anche l'obbligo di cambio al primo accesso. */
export const cambiaPassword = (password: string, token: string) =>
  post<{ ok: true }>("/account/password", { password }, bearer(token));

/** Pagina personalizzata del referente. null se non l'ha configurata (404): si usa la pagina standard. */
export async function leggiPagina(referralId: string): Promise<PaginaReferente | null> {
  const response = await fetch(
    `${API_BASE}/prezzo-giusto/pagine/${encodeURIComponent(referralId)}`
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Pagina del referente non disponibile (${response.status}).`);
  const data = await response.json();
  return data.configurazione as PaginaReferente;
}
