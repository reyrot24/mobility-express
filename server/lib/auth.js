import { supabase } from "../services/supabase.js";

export class InvalidSessionError extends Error {}

/**
 * Legge il token di sessione Supabase dall'header Authorization e restituisce l'utente.
 * @returns {Promise<import("@supabase/supabase-js").User|null>} null se l'header è assente
 * @throws {InvalidSessionError} se il token c'è ma non è valido (scaduto o sessione chiusa)
 */
export async function getRequestUser(req) {
  const header = req.get("Authorization");
  if (!header) return null;
  const token = header.match(/^Bearer (.+)$/)?.[1];
  if (!token || !supabase) throw new InvalidSessionError();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new InvalidSessionError();
  return data.user;
}

const SESSION_EXPIRED = "La sessione è scaduta. Accedi di nuovo alla tua area personale.";

/** Risponde 401 se l'errore è una sessione non valida. Restituisce true se ha risposto. */
export function handleInvalidSession(err, res) {
  if (!(err instanceof InvalidSessionError)) return false;
  res.status(401).json({ message: SESSION_EXPIRED });
  return true;
}

/** Middleware: richiede un utente autenticato e lo mette in req.user. */
export async function requireUser(req, res, next) {
  try {
    const user = await getRequestUser(req);
    if (!user) return res.status(401).json({ message: SESSION_EXPIRED });
    req.user = user;
    next();
  } catch (err) {
    if (!handleInvalidSession(err, res)) next(err);
  }
}
