import { config } from "../config.js";
import { hasApiKey } from "../lib/auth.js";
import { json, readJson } from "../lib/http.js";
import { validatePagina } from "../lib/pagina.js";
import { REFERRAL_CODE } from "../lib/validation.js";
import { eliminaPagina, leggiPagina, salvaPagina } from "../services/pagine.js";

const nonDisponibile = () => json(503, { message: "Riprova più tardi." });

// ───────────── Sito pubblico ─────────────

// GET /prezzo-giusto/pagine/:referralId
// Configurazione della pagina del referente. 404 = nessuna configurazione: il sito mostra la pagina standard.
export async function paginaPubblica(_req, { params: [referralId] }) {
  if (!REFERRAL_CODE.test(referralId)) return json(404, { message: "Pagina non configurata." });
  try {
    const pagina = await leggiPagina(referralId);
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

function autorizza(req, referralId) {
  if (!config.devopsWebhook.secret) return json(503, { message: "API non configurata." });
  if (!hasApiKey(req, config.devopsWebhook.secret)) return json(401, { message: "Non autorizzato." });
  if (!REFERRAL_CODE.test(referralId)) return json(400, { message: "referral_id non valido." });
  return null;
}

// GET /devops/pagine/:referralId
// Configurazione salvata, per precompilare l'editor su devops. 404 se non è mai stata salvata.
export async function leggiPaginaDevops(req, { params: [referralId] }) {
  const negato = autorizza(req, referralId);
  if (negato) return negato;
  try {
    const pagina = await leggiPagina(referralId);
    if (!pagina) return json(404, { message: "Pagina non configurata." });
    return json(200, pagina);
  } catch (err) {
    console.error("[pagine] lettura non riuscita:", err.message);
    return nonDisponibile();
  }
}

// PUT /devops/pagine/:referralId
// Devops, dopo aver salvato la pagina del referente nel suo database, ci invia la configurazione (JSON):
// la salviamo (creata o sostituita) e la restituiamo normalizzata.
// 422 con il campo sbagliato nel messaggio, es. "hero.titolo: massimo 80 caratteri."
export async function salvaPaginaDevops(req, { params: [referralId] }) {
  const negato = autorizza(req, referralId);
  if (negato) return negato;
  const { data, error } = validatePagina(await readJson(req));
  if (error) return json(422, { message: error });
  try {
    const updatedAt = await salvaPagina(referralId, data);
    return json(200, { configurazione: data, updatedAt });
  } catch (err) {
    console.error("[pagine] salvataggio non riuscito:", err.message);
    return nonDisponibile();
  }
}

// DELETE /devops/pagine/:referralId
// Elimina la configurazione: il link torna alla pagina standard.
export async function eliminaPaginaDevops(req, { params: [referralId] }) {
  const negato = autorizza(req, referralId);
  if (negato) return negato;
  try {
    await eliminaPagina(referralId);
    return json(200, { ok: true });
  } catch (err) {
    console.error("[pagine] eliminazione non riuscita:", err.message);
    return nonDisponibile();
  }
}
