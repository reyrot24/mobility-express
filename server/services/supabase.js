import { createClient } from "@supabase/supabase-js";
import { config } from "../config.js";

/**
 * Client amministrativo: usa la chiave secret e ignora le RLS.
 * Va usato solo nel server, mai esposto al browser.
 * null finché SUPABASE_URL e SUPABASE_SECRET_KEY non sono configurati.
 */
export const supabase =
  config.supabase.url && config.supabase.secretKey
    ? createClient(config.supabase.url, config.supabase.secretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;
