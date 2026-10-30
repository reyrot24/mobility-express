import { config } from "../config.js";
import { hasApiKey } from "../lib/auth.js";
import { HttpError, json, readJson } from "../lib/http.js";
import { validatePagina } from "../lib/pagina.js";
import { CONFIGURATION_ID } from "../lib/validation.js";
import { eliminaPagina, leggiPagina, salvaPagina } from "../services/pagine.js";

const nonDisponibile = () => json(503, { message: "Riprova più tardi." });

// ───────────── Sito pubblico ─────────────

// GET /prezzo-giusto/pagine/:idConfigurazione
// Configurazione della pagina personalizzata. 404 = nessuna configurazione: il sito mostra la pagina standard.
export async function paginaPubblica(_req, { params: [idConfigurazione] }) {
  if (!CONFIGURATION_ID.test(idConfigurazione)) return json(404, { message: "Pagina non configurata." });
  try {
    const pagina = await leggiPagina(idConfigurazione);
    // Breve cache: le modifiche salvate su devops si vedono entro un minuto
    const cache = { "Cache-Control": "public, max-age=60" };
    if (!pagina) return json(404, { message: "Pagina non configurata." }, cache);
    // Le impostazioni delle email servono solo al server
    const { email: _email, ...configurazione } = pagina.configurazione;
    return json(200, { configurazione }, cache);
  } catch (err) {
    console.error("[pagine] lettura non riuscita:", err.message);
    return nonDisponibile();
  }
}

// ───────────── Devops ─────────────
// Tutte le rotte /devops/pagine/... vogliono "X-API-Key: <DEVOPS_WEBHOOK_SECRET>", come /devops/risultati.
// Le chiama il backend di devops, mai il browser del referente.

const errore = (status, message) => json(status, { message });

// Il salvataggio risponde sempre { status, message, data }: status 1 = riuscito, 0 = errore
const erroreSalvataggio = (status, message) => json(status, { status: 0, message, data: null });

function autorizza(req, idConfigurazione, rispondi = errore) {
  if (!config.devopsWebhook.secret) return rispondi(503, "API non configurata.");
  if (!hasApiKey(req, config.devopsWebhook.secret)) return rispondi(401, "Non autorizzato.");
  if (!CONFIGURATION_ID.test(idConfigurazione)) return rispondi(400, "idConfiguration non valido.");
  return null;
}

// GET /devops/pagine/:idConfigurazione
// Configurazione salvata, per precompilare l'editor su devops. 404 se non è mai stata salvata.
export async function leggiPaginaDevops(req, { params: [idConfigurazione] }) {
  const negato = autorizza(req, idConfigurazione);
  if (negato) return negato;
  try {
    const pagina = await leggiPagina(idConfigurazione);
    if (!pagina) return json(404, { message: "Pagina non configurata." });
    return json(200, pagina);
  } catch (err) {
    console.error("[pagine] lettura non riuscita:", err.message);
    return nonDisponibile();
  }
}

// PUT /devops/pagine/:idConfigurazione
// Devops, dopo aver salvato la pagina del referente nel suo database, ci invia la configurazione (JSON):
// la salviamo (creata o sostituita) e la restituiamo normalizzata.
// 422 con il campo sbagliato nel messaggio, es. "hero.titolo: massimo 80 caratteri."
export async function salvaPaginaDevops(req, { params: [idConfigurazione] }) {
  const negato = autorizza(req, idConfigurazione, erroreSalvataggio);
  if (negato) return negato;
  try {
    const { data, error } = validatePagina(await readJson(req));
    if (error) {
      console.warn(`[pagine] configurazione ${idConfigurazione} rifiutata: ${error}`);
      return erroreSalvataggio(422, error);
    }
    const updatedAt = await salvaPagina(idConfigurazione, data);
    return json(200, { status: 1, message: "", data: { configuration: data, updatedAt } });
  } catch (err) {
    // JSON non valido (400) o corpo troppo grande (413)
    if (err instanceof HttpError) return erroreSalvataggio(err.status, err.message);
    console.error("[pagine] salvataggio non riuscito:", err.message);
    return erroreSalvataggio(503, "Riprova più tardi.");
  }
}

// DELETE /devops/pagine/:idConfigurazione
// Elimina la configurazione: il link torna alla pagina standard.
export async function eliminaPaginaDevops(req, { params: [idConfigurazione] }) {
  const negato = autorizza(req, idConfigurazione);
  if (negato) return negato;
  try {
    await eliminaPagina(idConfigurazione);
    return json(200, { ok: true });
  } catch (err) {
    console.error("[pagine] eliminazione non riuscita:", err.message);
    return nonDisponibile();
  }
}
