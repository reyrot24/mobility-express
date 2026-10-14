const env = process.env;

export const config = {
  port: Number(env.PORT ?? 3001),
  // Origini autorizzate a chiamare l'API (separate da virgola). Vuoto = solo same-origin/proxy.
  allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  siteUrl: (env.SITE_URL ?? "http://localhost:5173").replace(/\/$/, ""),

  // Chiave "secret" (o la legacy service_role): solo lato server, ignora le RLS.
  supabase: {
    url: env.SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  },

  smtp: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 587),
    secure: env.SMTP_SECURE === "true",
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  mailFrom: env.MAIL_FROM ?? "Mobility Express <noreply@mobilityexpress.it>",
  // Destinatario delle richieste di ricontatto quando il referente non è noto al server
  callbackFallbackEmail: env.RICONTATTO_FALLBACK_EMAIL,
  // Destinatario delle notifiche per le nuove segnalazioni dalla pagina Suggerisci (vuoto = nessuna email)
  segnalazioniEmail: env.SEGNALAZIONI_EMAIL,

  // API esterna a cui inoltrare la richiesta del cliente (URL non ancora disponibile)
  externalApi: {
    url: env.EXTERNAL_API_URL,
    token: env.EXTERNAL_API_TOKEN,
    timeoutMs: Number(env.EXTERNAL_API_TIMEOUT_MS ?? 15000),
  },

  // Devops chiama POST /api/devops/risultati con "Authorization: Bearer <segreto>"
  devopsWebhook: {
    secret: env.DEVOPS_WEBHOOK_SECRET,
  },
  // Senza API esterna, in sviluppo simuliamo la risposta di devops con un range dimostrativo
  simulateDevops: !env.EXTERNAL_API_URL && env.NODE_ENV !== "production",

};
