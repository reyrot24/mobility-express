/** Errore con uno status HTTP e un messaggio da mostrare al cliente. */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });

const MAX_BODY_BYTES = 20 * 1024;

/** Legge il corpo JSON (al massimo 20 KB). Corpo vuoto = {}. */
export async function readJson(req) {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES)
    throw new HttpError(413, "Richiesta troppo grande.");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Richiesta non valida.");
  }
}

/** IP del cliente: il primo indirizzo aggiunto dal proxy di Supabase. */
export const clientIp = (req) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "sconosciuto";

/** Tiene viva la funzione finché il lavoro in background non è finito (dopo la risposta). */
export function inBackground(promise) {
  globalThis.EdgeRuntime?.waitUntil(promise);
}
