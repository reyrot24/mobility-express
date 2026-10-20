import { supabase } from "../services/supabase.js";
import { clientIp, json } from "./http.js";

/**
 * Limite per IP condiviso tra tutte le istanze della funzione (tabella limiti_richieste).
 * Se il database non risponde la richiesta passa: il limite non deve bloccare il servizio.
 * @param {string} nome nome del limite, separa i contatori delle diverse rotte
 * @returns {Promise<Response|null>} la risposta 429 da restituire, null se la richiesta può passare
 */
export async function rateLimit(req, nome, { windowMs, max }) {
  if (!supabase) return null;
  const { data: attesa, error } = await supabase.rpc("consuma_limite", {
    p_chiave: `${nome}:${clientIp(req)}`,
    p_max: max,
    p_finestra_sec: Math.ceil(windowMs / 1000),
  });
  if (error) {
    console.error("[rate-limit] contatore non aggiornato:", error.message);
    return null;
  }
  if (!attesa) return null;
  return json(
    429,
    { message: "Troppe richieste. Riprova tra qualche minuto." },
    { "Retry-After": String(attesa) }
  );
}
