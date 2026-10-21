import { isDebug, requireUser } from "../lib/auth.js";
import { json, readJson } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { validateAttivazione } from "../lib/validation.js";
import { updatePassword } from "../data/db.js";
import { attivaArea, datiAttivazione } from "../services/richieste.js";

const QUINDICI_MINUTI = 15 * 60 * 1000;

const LINK_NON_VALIDO = {
  message: "Il link di attivazione non è valido o è scaduto. Fai una nuova richiesta per riceverne un altro.",
};

// GET /account/attivazione?token=...
// Dati per precompilare il form di attivazione (email non modificabile)
export async function leggiAttivazione(req, { url }) {
  const limited = await rateLimit(req, "attivazione-lettura", { windowMs: QUINDICI_MINUTI, max: 30 });
  if (limited) return limited;

  const token = (url.searchParams.get("token") ?? "").slice(0, 100);
  try {
    const dati = token ? await datiAttivazione(token) : null;
    if (!dati) return json(404, LINK_NON_VALIDO);
    return json(200, dati);
  } catch (err) {
    console.error("[account] lettura attivazione non riuscita:", err.message);
    return json(503, { message: "Riprova tra qualche minuto." });
  }
}

// POST /account/attivazione
// Attivazione: crea account e profilo, poi le richieste in attesa partono verso devops
export async function attiva(req) {
  const limited = await rateLimit(req, "attivazione", { windowMs: QUINDICI_MINUTI, max: 10 });
  if (limited) return limited;

  const { data, error } = validateAttivazione(await readJson(req));
  if (error) return json(400, { message: error });
  try {
    const result = await attivaArea(data.token, data, { debug: isDebug(req) });
    if (!result) return json(404, LINK_NON_VALIDO);
    return json(201, result);
  } catch (err) {
    if (err.message === "PASSWORD_TEMPORANEA_NON_VALIDA")
      return json(400, { message: "La password temporanea non è corretta." });
    console.error("[account] attivazione non riuscita:", err.message);
    return json(503, { message: "Non è stato possibile attivare l’area personale. Riprova." });
  }
}

// POST /account/password
// Cambio password dall'area personale (anche dopo il link di recupero)
export async function cambiaPassword(req) {
  const limited = await rateLimit(req, "password", { windowMs: QUINDICI_MINUTI, max: 10 });
  if (limited) return limited;

  const user = await requireUser(req);
  const body = await readJson(req);
  const password = typeof body?.password === "string" ? body.password : "";
  if (password.length < 12 || password.length > 72)
    return json(400, { message: "La password deve avere tra 12 e 72 caratteri." });
  try {
    await updatePassword(user.id, password);
    return json(200, { ok: true });
  } catch (err) {
    console.error("[account] password non aggiornata:", err.message);
    return json(503, { message: "Non è stato possibile aggiornare la password. Riprova." });
  }
}
