import { createHash, timingSafeEqual } from "node:crypto";
import { supabase } from "../services/supabase.js";

export class InvalidSessionError extends Error {}

export const SESSION_EXPIRED = "La sessione è scaduta. Accedi di nuovo alla tua area personale.";

const bearerToken = (req) =>
  req.headers.get("Authorization")?.match(/^Bearer (.+)$/)?.[1];

/**
 * Legge il token di sessione Supabase dall'header Authorization e restituisce l'utente.
 * @returns {Promise<import("@supabase/supabase-js").User|null>} null se l'header è assente
 * @throws {InvalidSessionError} se il token c'è ma non è valido (scaduto o sessione chiusa)
 */
export async function getRequestUser(req) {
  if (!req.headers.get("Authorization")) return null;
  const token = bearerToken(req);
  if (!token || !supabase) throw new InvalidSessionError();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new InvalidSessionError();
  return data.user;
}

/** Richiede un utente autenticato. Senza sessione lancia InvalidSessionError (risposta 401). */
export async function requireUser(req) {
  const user = await getRequestUser(req);
  if (!user) throw new InvalidSessionError();
  return user;
}

const digest = (value) => createHash("sha256").update(value).digest();

/** Verifica "Authorization: Bearer <segreto>" a tempo costante. */
export const hasBearerSecret = (req, secret) =>
  Boolean(secret) && timingSafeEqual(digest(bearerToken(req) ?? ""), digest(secret));
