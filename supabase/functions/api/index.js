// Edge Function "api" di "Il prezzo giusto per te".
// Indirizzo: https://<progetto>.supabase.co/functions/v1/api/... (VITE_PG_API_URL nel frontend).
// Va pubblicata senza verifica JWT (supabase/config.toml): devops, pg_cron e il form pubblico
// non hanno una sessione Supabase. Le rotte che la richiedono la verificano da sé.
import { config } from "./config.js";
import { InvalidSessionError, SESSION_EXPIRED } from "./lib/auth.js";
import { HttpError, json } from "./lib/http.js";
import { attiva, cambiaPassword, leggiAttivazione } from "./routes/account.js";
import { risultati, tentativi } from "./routes/devops.js";
import { nuovaRichiesta, ricontatto } from "./routes/prezzoGiusto.js";
import { supabase } from "./services/supabase.js";

const routes = [
  ["GET", /^\/health$/, () => json(200, { ok: true })],
  ["POST", /^\/prezzo-giusto\/richieste$/, nuovaRichiesta],
  ["POST", /^\/prezzo-giusto\/richieste\/([^/]+)\/ricontatto$/, ricontatto],
  ["GET", /^\/account\/attivazione$/, leggiAttivazione],
  ["POST", /^\/account\/attivazione$/, attiva],
  ["POST", /^\/account\/password$/, cambiaPassword],
  ["POST", /^\/devops\/risultati$/, risultati],
  ["POST", /^\/interno\/tentativi$/, tentativi],
];

if (config.simulateDevops)
  console.warn("[api] EXTERNAL_API_URL non impostato: risposta di devops simulata con un range dimostrativo.");
if (!config.devopsWebhook.secret)
  console.warn("[api] DEVOPS_WEBHOOK_SECRET non impostato: devops non può inviare i risultati.");
if (!config.cronSecret)
  console.warn("[api] CRON_SECRET non impostato: i nuovi tentativi verso devops non partono.");
if (!supabase)
  console.warn("[api] chiave secret di Supabase mancante: le richieste non possono essere salvate.");

function corsHeaders(req) {
  const origin = req.headers.get("Origin");
  if (!origin || !config.allowedOrigins.includes(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, Authorization",
    Vary: "Origin",
  };
}

async function handle(req) {
  const url = new URL(req.url);
  // In produzione il percorso arriva come /api/..., in locale anche come /functions/v1/api/...
  const path = url.pathname.replace(/^(?:\/functions\/v1)?\/api(?=\/|$)/, "");

  for (const [method, pattern, handler] of routes) {
    const match = path.match(pattern);
    if (!match || req.method !== method) continue;
    try {
      return await handler(req, { url, params: match.slice(1).map(decodeURIComponent) });
    } catch (err) {
      if (err instanceof InvalidSessionError) return json(401, { message: SESSION_EXPIRED });
      if (err instanceof HttpError) return json(err.status, { message: err.message });
      if (err instanceof URIError) return json(400, { message: "Richiesta non valida." });
      console.error("[api]", err);
      return json(500, { message: "Errore interno. Riprova più tardi." });
    }
  }
  return json(404, { message: "Risorsa non trovata." });
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const response = await handle(req);
  for (const [name, value] of Object.entries(cors)) response.headers.set(name, value);
  return response;
});
