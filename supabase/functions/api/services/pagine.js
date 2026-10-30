import { supabase } from "./supabase.js";

const requireDb = () => {
  if (!supabase) throw new Error("Supabase non configurato");
  return supabase;
};

/** @returns {Promise<{configurazione: object, updatedAt: string}|null>} null se non esiste */
export async function leggiPagina(idConfigurazione) {
  const { data, error } = await requireDb()
    .from("pagine_referenti")
    .select("configurazione, updated_at")
    .eq("id_configurazione", idConfigurazione)
    .maybeSingle();
  if (error) throw error;
  return data && { configurazione: data.configurazione, updatedAt: data.updated_at };
}

/** Salva (crea o sostituisce) la configurazione già validata. */
export async function salvaPagina(idConfigurazione, configurazione) {
  const { data, error } = await requireDb()
    .from("pagine_referenti")
    .upsert({ id_configurazione: idConfigurazione, configurazione, updated_at: new Date().toISOString() })
    .select("updated_at")
    .single();
  if (error) throw error;
  return data.updated_at;
}

/** Elimina la configurazione: il link torna alla pagina standard. */
export async function eliminaPagina(idConfigurazione) {
  const { error } = await requireDb()
    .from("pagine_referenti")
    .delete()
    .eq("id_configurazione", idConfigurazione);
  if (error) throw error;
}

/**
 * Configurazione della richiesta per le email al cliente (blocco "email" e dati del referente).
 * Se non c'è o non si riesce a leggere le email partono con lo stile standard: non devono mai bloccarsi.
 */
export async function configurazioneEmail(idConfigurazione) {
  if (!idConfigurazione) return null;
  try {
    return (await leggiPagina(idConfigurazione))?.configurazione ?? null;
  } catch (err) {
    console.error("[pagine] configurazione per le email non letta:", err.message);
    return null;
  }
}
