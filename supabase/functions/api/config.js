const env = (name) => Deno.env.get(name) || undefined;

/**
 * Chiave secret di Supabase. In produzione la inietta Supabase (le variabili SUPABASE_*
 * non si possono impostare a mano): SUPABASE_SECRET_KEYS con le nuove chiavi,
 * SUPABASE_SERVICE_ROLE_KEY con quelle legacy.
 */
function supabaseSecretKey() {
  try {
    const keys = JSON.parse(env("SUPABASE_SECRET_KEYS") ?? "{}");
    if (keys.default) return keys.default;
  } catch {
    // formato inatteso: si usa la chiave legacy
  }
  return env("SUPABASE_SERVICE_ROLE_KEY");
}

export const config = {
  // Origini autorizzate a chiamare l'API (separate da virgola), es. https://www.mobilityexpress.it
  allowedOrigins: (env("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  siteUrl: (env("SITE_URL") ?? "http://localhost:5173").replace(/\/$/, ""),

  // Chiave secret: ignora le RLS, resta solo nella funzione.
  supabase: {
    url: env("SUPABASE_URL"),
    secretKey: supabaseSecretKey(),
  },

  // Le Edge Functions non possono uscire sulle porte 25 e 587: usare 465 con SMTP_SECURE=true.
  smtp: {
    host: env("SMTP_HOST"),
    port: Number(env("SMTP_PORT") ?? 465),
    secure: (env("SMTP_SECURE") ?? "true") === "true",
    user: env("SMTP_USER"),
    pass: env("SMTP_PASS"),
  },
  mailFrom: env("MAIL_FROM") ?? "Mobility Express <noreply@mobilityexpress.it>",
  // Destinatario delle richieste di ricontatto quando il referente non è noto
  callbackFallbackEmail: env("RICONTATTO_FALLBACK_EMAIL"),

  // API devops a cui inoltrare la richiesta del cliente
  externalApi: {
    url: env("EXTERNAL_API_URL"),
    token: env("EXTERNAL_API_TOKEN"),
    timeoutMs: Number(env("EXTERNAL_API_TIMEOUT_MS") ?? 15000),
  },

  // Devops chiama POST /devops/risultati con "X-API-Key: <segreto>"
  devopsWebhook: {
    secret: env("DEVOPS_WEBHOOK_SECRET"),
  },
  // pg_cron chiama POST /interno/tentativi con "Authorization: Bearer <segreto>"
  cronSecret: env("CRON_SECRET"),
  // Solo in sviluppo: senza API esterna simuliamo la risposta di devops con un range dimostrativo
  simulateDevops: !env("EXTERNAL_API_URL") && env("SIMULA_DEVOPS") === "true",
};
