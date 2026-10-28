import { supabase } from "./supabase.js";

const requireDb = () => {
  if (!supabase) throw new Error("Supabase non configurato");
  return supabase;
};

/** @returns {Promise<{configurazione: object, updatedAt: string}|null>} null se il referente non l'ha configurata */
export async function leggiPagina(referralId) {
  const { data, error } = await requireDb()
    .from("pagine_referenti")
    .select("configurazione, updated_at")
    .eq("referral_id", referralId)
    .maybeSingle();
  if (error) throw error;
  return data && { configurazione: data.configurazione, updatedAt: data.updated_at };
}

/** Salva (crea o sostituisce) la configurazione già validata. */
export async function salvaPagina(referralId, configurazione) {
  const { data, error } = await requireDb()
    .from("pagine_referenti")
    .upsert({ referral_id: referralId, configurazione, updated_at: new Date().toISOString() })
    .select("updated_at")
    .single();
  if (error) throw error;
  return data.updated_at;
}

/** Elimina la configurazione: il link torna alla pagina standard. */
export async function eliminaPagina(referralId) {
  const { error } = await requireDb().from("pagine_referenti").delete().eq("referral_id", referralId);
  if (error) throw error;
}

/**
 * Configurazione del referente per le email al cliente (blocco "email" e dati del referente).
 * Se non c'è o non si riesce a leggere le email partono con lo stile standard: non devono mai bloccarsi.
 */
export async function configurazioneEmail(referralId) {
  if (!referralId) return null;
  try {
    return (await leggiPagina(referralId))?.configurazione ?? null;
  } catch (err) {
    console.error("[pagine] configurazione per le email non letta:", err.message);
    return null;
  }
}
