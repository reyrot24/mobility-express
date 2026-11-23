// Risk Radar Aziende — API della dashboard ALCA Broker.
// Ogni richiesta deve avere l'header  x-admin-key  (la chiave non è salvata in chiaro:
// nel database c'è solo il suo SHA-256, in rr_settings.admin_key_sha256).
//   POST /risk-radar-admin/data      {}                 -> collaboratori + analisi
//   POST /risk-radar-admin/referrer  { name }           -> nuovo link collaboratore
//   POST /risk-radar-admin/status    { id, status }     -> stato opportunità
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-admin-key, authorization, apikey, x-client-info",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
const STATUSES = ["nuova", "contattata", "proposta", "chiusa", "persa"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const key = req.headers.get("x-admin-key") ?? "";
  const { data: setting } = await db.from("rr_settings").select("value").eq("key", "admin_key_sha256").maybeSingle();
  if (!key || !setting || !safeEq(await sha256(key), setting.value)) return json({ error: "Chiave non valida" }, 401);

  const route = new URL(req.url).pathname.split("/").pop();
  let body: any = {};
  try { body = await req.json(); } catch { /* corpo vuoto */ }

  try {
    if (route === "data") {
      const [refs, an] = await Promise.all([
        db.from("rr_referrers").select("*").order("created_at"),
        db.from("rr_analyses")
          .select("id,created_at,piva,company_name,address,vies_valid,ref_code,params,ateco_code,ateco_source,overall_risk,budget_low,budget_high,email,phone,wants_contact,status")
          .order("created_at", { ascending: false }).limit(1000),
      ]);
      if (refs.error) throw refs.error;
      if (an.error) throw an.error;
      return json({ referrers: refs.data, analyses: an.data });
    }

    if (route === "referrer") {
      const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
      if (!name) return json({ error: "Nome mancante" }, 400);
      const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 20) || "collab";
      const code = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
      const { data, error } = await db.from("rr_referrers").insert({ code, name }).select().single();
      if (error) throw error;
      return json(data);
    }

    if (route === "status") {
      if (!STATUSES.includes(body.status) || typeof body.id !== "string") return json({ error: "Dati non validi" }, 400);
      const { error } = await db.from("rr_analyses").update({ status: body.status }).eq("id", body.id);
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Percorso sconosciuto" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "Errore interno" }, 500);
  }
});
