import { config } from "../config.js";

/**
 * Inoltra la richiesta del cliente all'API esterna.
 * TODO: confermare endpoint, autenticazione, payload e risposta quando l'URL sarà disponibile.
 * Senza URL: in sviluppo il passaggio viene saltato, in produzione la richiesta va in errore.
 * @returns {Promise<object|null>} la risposta JSON dell'API, null se saltata o vuota
 */
export async function inviaAPiattaforma(richiesta) {
  const { url, token, timeoutMs } = config.externalApi;

  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("EXTERNAL_API_NOT_CONFIGURED");
    console.warn(`[piattaforma] EXTERNAL_API_URL non impostato: salto l'invio di ${richiesta.richiesta_id} (risposta simulata).`);
    return null;
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(richiesta),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new Error(
      error.name === "TimeoutError" ? "EXTERNAL_API_TIMEOUT" : "EXTERNAL_API_UNAVAILABLE"
    );
  }
  if (!response.ok) throw new Error(`EXTERNAL_API_ERROR_${response.status}`);
  return response.status === 204 ? null : response.json().catch(() => null);
}
