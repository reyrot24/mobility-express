import type { QuoteRequest } from "./model";
import type { Consents, RequestStatus } from "./estimate";

// In sviluppo Vite inoltra /api al server Express (vedi vite.config.ts).
// In produzione impostare VITE_PG_API_URL con l'indirizzo del server.
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

export type DatiAttivazione = { email: string; nome: string; cognome: string };

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

/** Attiva l'area personale: crea l'account con i dati e la password scelti dal cliente. */
export const attivaArea = (payload: {
  token: string;
  nome: string;
  cognome: string;
  cellulare: string;
  password: string;
}) => post<{ email: string; alreadyRegistered: boolean }>("/account/attivazione", payload);

/** Nuova password: passa dal server, che toglie anche l'obbligo di cambio al primo accesso. */
export const cambiaPassword = (password: string, token: string) =>
  post<{ ok: true }>("/account/password", { password }, bearer(token));
