import { config } from "../config.js";

/**
 * Inoltra la richiesta del cliente all'API esterna.
 * Senza URL: con SIMULA_DEVOPS il passaggio viene saltato, altrimenti la richiesta va in errore.
 * @returns {Promise<unknown>} la risposta di devops così com'è (JSON o testo), null se saltata
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

  // Devops risponde {"status": 1, "message": "OK", "data": {}} se ha accettato la richiesta
  const text = await response.text().catch(() => "");
  let body = null;
  try {
    body = JSON.parse(text);
  } catch {
    // risposta non JSON (es. pagina di errore di nginx)
  }
  console.log(
    `[piattaforma] risposta devops per ${richiesta.richiesta_id}: ${response.status} ${text.slice(0, 1000)}`,
  );
  // Risposta di devops così com'è: allegata agli errori per la modalità debug
  const risposta = body ?? text;

  if (!response.ok)
    throw rispostaErrata(
      `EXTERNAL_API_ERROR_${response.status}: ${body?.message ?? (text.slice(0, 300) || "nessun dettaglio")}`,
      risposta,
    );
  if (body?.status !== 1)
    throw rispostaErrata(
      `EXTERNAL_API_REJECTED: ${body?.message ?? "risposta non valida"}`,
      risposta,
    );
  return risposta;
}

const rispostaErrata = (message, risposta) =>
  Object.assign(new Error(message), { risposta });
