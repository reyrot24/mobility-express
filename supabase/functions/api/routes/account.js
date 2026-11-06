import { isDebug, requireUser } from "../lib/auth.js";
import { json, readJson } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { validateAttivazione } from "../lib/validation.js";
import { updatePassword } from "../data/db.js";
import { cessaAdesione, impostaMarketing, statoServizio } from "../services/adesioni.js";
import { attivaArea, datiAttivazione, ErroreAdesione } from "../services/richieste.js";

const QUINDICI_MINUTI = 15 * 60 * 1000;

const LINK_NON_VALIDO = {
  message: "Il link di attivazione non è valido o è scaduto. Fai una nuova richiesta per riceverne un altro.",
};

// GET /account/attivazione?token=...
// Dati per la pagina di conferma dell'adesione: documenti in vigore, veicolo, email.
// Non accetta nulla: registra solo che il link è stato aperto.
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
// Conferma esplicita dell'adesione: { token, temporaryPassword, password?, condizioniAccettate: true,
// marketing: boolean, documenti: { condizioni, privacy } }. Poi la richiesta parte verso devops.
export async function attiva(req) {
  const limited = await rateLimit(req, "attivazione", { windowMs: QUINDICI_MINUTI, max: 10 });
  if (limited) return limited;

  const { data, error } = validateAttivazione(await readJson(req));
  if (error) return json(400, { message: error });
  try {
    const result = await attivaArea(data.token, data, {
      debug: isDebug(req),
      userAgent: req.headers.get("User-Agent") ?? undefined,
    });
    if (!result) return json(404, LINK_NON_VALIDO);
    return json(201, result);
  } catch (err) {
    if (err instanceof ErroreAdesione) return json(err.status, { message: err.message });
    console.error("[account] attivazione non riuscita:", err.message);
    return json(503, { message: "Non è stato possibile confermare l’adesione. Riprova." });
  }
}

// GET /account/servizio
// "Gestisci servizio": adesioni del cliente in sessione, consenso marketing, documenti in vigore.
export async function servizio(req) {
  const user = await requireUser(req);
  try {
    return json(200, await statoServizio(user));
  } catch (err) {
    console.error("[account] lettura servizio non riuscita:", err.message);
    return json(503, { message: "Riprova tra qualche minuto." });
  }
}

// POST /account/adesioni/:id/cessa   { motivo?: string }
// "Interrompi monitoraggio": blocco immediato delle comunicazioni di servizio per quel veicolo.
export async function cessa(req, { params: [id] }) {
  const limited = await rateLimit(req, "cessazione", { windowMs: QUINDICI_MINUTI, max: 20 });
  if (limited) return limited;
  const user = await requireUser(req);
  const body = await readJson(req);
  const motivo = typeof body?.motivo === "string" ? body.motivo.trim().slice(0, 500) : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return json(404, { message: "Servizio non trovato o già interrotto." });
  try {
    const adesione = await cessaAdesione(id, { userId: user.id, canale: "area_personale", motivo, attore: "cliente" });
    if (!adesione) return json(404, { message: "Servizio non trovato o già interrotto." });
    return json(200, { id: adesione.id, stato: adesione.stato, cessataIl: adesione.cessata_at });
  } catch (err) {
    console.error("[account] cessazione non riuscita:", err.message);
    return json(503, { message: "Non è stato possibile interrompere il servizio. Riprova." });
  }
}

// POST /account/marketing   { granted: boolean }
// Consenso commerciale: separato dal servizio, si concede o revoca in qualsiasi momento.
export async function marketing(req) {
  const limited = await rateLimit(req, "marketing", { windowMs: QUINDICI_MINUTI, max: 20 });
  if (limited) return limited;
  const user = await requireUser(req);
  const body = await readJson(req);
  if (typeof body?.granted !== "boolean") return json(400, { message: "Scelta non valida." });
  try {
    return json(200, await impostaMarketing(user, body.granted));
  } catch (err) {
    console.error("[account] marketing non aggiornato:", err.message);
    return json(503, { message: "Non è stato possibile salvare la scelta. Riprova." });
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
