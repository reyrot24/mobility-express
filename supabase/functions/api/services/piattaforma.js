import { config } from "../config.js";

/**
 * Inoltra la richiesta del cliente all'API esterna.
 * Senza URL: con SIMULA_DEVOPS il passaggio viene saltato, altrimenti la richiesta va in errore.
 * @returns {Promise<object|null>} la risposta JSON dell'API, null se saltata
 */
export async function inviaAPiattaforma(richiesta) {
  const { url, token, timeoutMs } = config.externalApi;

  if (!url) {
    if (!config.simulateDevops) throw new Error("EXTERNAL_API_NOT_CONFIGURED");
    console.warn(
      `[piattaforma] EXTERNAL_API_URL non impostato: salto l'invio di ${richiesta.richiesta_id} (risposta simulata).`,
    );
    return null;
  }

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        ...(token && { "X-API-Key": `${token}` }),
      },
      body: JSON.stringify(richiesta),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error.name === "TimeoutError") throw new Error("EXTERNAL_API_TIMEOUT");
    const causa = error.cause?.code ?? error.cause?.message ?? error.message;
    throw new Error(`EXTERNAL_API_UNAVAILABLE: ${causa}`);
  }

  if (!response.ok) throw new Error(`EXTERNAL_API_ERROR_${response.status}`);
  // Devops risponde {"status": 1, "message": "OK", "data": {}} se ha accettato la richiesta
  const body = await response.json().catch(() => null);
  if (body?.status !== 1)
    throw new Error(
      `EXTERNAL_API_REJECTED: ${body?.message ?? "risposta non valida"}`,
    );
  return body;
}
