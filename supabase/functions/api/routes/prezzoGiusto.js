import { getRequestUser, InvalidSessionError, requireUser } from "../lib/auth.js";
import { json, readJson } from "../lib/http.js";
import { rateLimit } from "../lib/rateLimit.js";
import { validateRichiesta } from "../lib/validation.js";
import { creaRichiesta, richiediRicontatto } from "../services/richieste.js";

const QUINDICI_MINUTI = 15 * 60 * 1000;

// POST /prezzo-giusto/richieste
// Registra il cliente (se nuovo), salva la richiesta e invia l'email di conferma.
// La stima arriva dopo, via email, quando devops restituisce il risultato.
export async function nuovaRichiesta(req) {
  const limited = await rateLimit(req, "richieste", { windowMs: QUINDICI_MINUTI, max: 10 });
  if (limited) return limited;

  const body = await readJson(req);
  try {
    // Dall'area personale: la richiesta va sempre all'account in sessione
    const user = await getRequestUser(req);
    const { data, error } = validateRichiesta(user ? { ...body, email: user.email } : body);
    if (error) return json(400, { message: error });

    const key = req.headers.get("Idempotency-Key")?.slice(0, 100) || undefined;
    return json(202, await creaRichiesta(data, key, user));
  } catch (err) {
    if (err instanceof InvalidSessionError) throw err;
    console.error("[prezzo-giusto] richiesta non salvata:", err.message);
    return json(503, {
      message: "Al momento non riusciamo a registrare la richiesta. Riprova tra qualche minuto.",
    });
  }
}

// POST /prezzo-giusto/richieste/:id/ricontatto
// Ricontatto richiesto dall'area personale. Non modifica il consenso marketing.
export async function ricontatto(req, { params: [id] }) {
  const limited = await rateLimit(req, "ricontatto", { windowMs: QUINDICI_MINUTI, max: 10 });
  if (limited) return limited;

  const user = await requireUser(req);
  try {
    const requestedAt = await richiediRicontatto(id, user);
    if (!requestedAt) return json(404, { message: "Richiesta non trovata." });
    return json(200, { requestedAt });
  } catch (err) {
    console.error("[prezzo-giusto] ricontatto non registrato:", err.message);
    return json(503, { message: "Riprova tra qualche minuto." });
  }
}
