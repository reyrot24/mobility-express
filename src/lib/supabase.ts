import { createClient } from "@supabase/supabase-js";

// Chiave publishable: può stare nel browser. I dati sono protetti dalle RLS del database.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key)
  console.error(
    "[supabase] VITE_SUPABASE_URL o VITE_SUPABASE_PUBLISHABLE_KEY mancanti: l'area personale non funzionerà."
  );

export const supabase = createClient(url || "http://localhost", key || "missing-key");
