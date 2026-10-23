import { config } from "../config.js";
import { hasApiKey, hasBearerSecret, isDebug } from "../lib/auth.js";
import { inBackground, json, readJson } from "../lib/http.js";
import { elaboraTentativi, registraRisultato, rilanciaRichiesta } from "../services/richieste.js";

// POST /devops/risultati
// Devops invia il risultato di una richiesta: salviamo il prezzo e avvisiamo il cliente.
// Autorizzazione: "X-API-Key: <DEVOPS_WEBHOOK_SECRET>".
// TODO: adattare la lettura del JSON quando devops avrà definito il formato.
export async function risultati(req) {
  if (!config.devopsWebhook.secret) return json(503, { message: "Webhook non configurato." });
  if (!hasApiKey(req, config.devopsWebhook.secret)) return json(401, { message: "Non autorizzato." });

  const body = await readJson(req);
  console.log("[devops] risultato ricevuto:", JSON.stringify(body));
  try {
    const esito = await registraRisultato(body);
    if (esito === "non_trovata") return json(404, { message: "Richiesta non trovata." });
    return json(200, { esito });
  } catch (err) {
    console.error("[devops] risultato non registrato:", err.message);
    const invalid = /^(INVALID|MISSING)_/.test(err.message);
    return json(invalid ? 422 : 503, { message: invalid ? err.message : "Riprova più tardi." });
  }
}

// POST /interno/tentativi
// Chiamato ogni minuto da pg_cron (migrazione 20261020000000) con "Authorization: Bearer <CRON_SECRET>".
// Con {"tutte": true} ritenta subito tutte le richieste in errore, es. dopo aver sistemato devops.
// Con {"id": "ST-..."} rilancia subito solo quella richiesta e restituisce sempre la risposta di devops.
// Con "X-Debug" aspetta gli invii e restituisce la risposta di devops per ogni richiesta (per id).
export async function tentativi(req) {
  if (!hasBearerSecret(req, config.cronSecret)) return json(401, { message: "Non autorizzato." });
  const body = await readJson(req);
  if (typeof body?.id === "string") {
    const rispostaDevops = await rilanciaRichiesta(body.id);
    if (!rispostaDevops)
      return json(404, { message: "Richiesta non trovata, senza account o già inviata a devops." });
    return json(200, { rispostaDevops });
  }
  if (isDebug(req)) return json(200, { rispostaDevops: await elaboraTentativi(body?.tutte === true) });
  // Si risponde subito: pg_net non aspetta la fine degli invii
  inBackground(
    elaboraTentativi(body?.tutte === true).catch((err) =>
      console.error("[tentativi] non riusciti:", err.message)
    )
  );
  return json(202, { ok: true });
}
