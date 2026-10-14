import express from "express";
import { config } from "./config.js";
import { prezzoGiustoRouter } from "./routes/prezzoGiusto.js";
import { accountRouter } from "./routes/account.js";
import { segnalazioniRouter } from "./routes/segnalazioni.js";
import { devopsRouter } from "./routes/devops.js";
import { verifyMailer } from "./services/mailer.js";
import { supabase } from "./services/supabase.js";
import { riprendiRichiestePendenti } from "./services/richieste.js";

const app = express();
app.disable("x-powered-by");
// Dietro un proxy (Vercel, nginx, ...) serve per leggere l'IP reale nel rate limit
app.set("trust proxy", 1);
app.use(express.json({ limit: "20kb" }));

app.use((req, res, next) => {
  const origin = req.get("Origin");
  if (origin && config.allowedOrigins.includes(origin)) {
    res.set({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, Authorization",
      Vary: "Origin",
    });
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/prezzo-giusto", prezzoGiustoRouter);
app.use("/api/account", accountRouter);
app.use("/api/segnalazioni", segnalazioniRouter);
app.use("/api/devops", devopsRouter);

app.use((_req, res) => res.status(404).json({ message: "Risorsa non trovata." }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === "entity.parse.failed")
    return res.status(400).json({ message: "Richiesta non valida." });
  console.error("[server]", err);
  res.status(500).json({ message: "Errore interno. Riprova più tardi." });
});

app.listen(config.port, () => {
  console.log(`[server] in ascolto su http://localhost:${config.port}`);
  if (config.simulateDevops)
    console.warn("[server] EXTERNAL_API_URL non impostato: risposta di devops simulata con un range dimostrativo.");
  if (!config.devopsWebhook.secret)
    console.warn("[server] DEVOPS_WEBHOOK_SECRET non impostato: devops non può inviare i risultati.");
  if (!supabase)
    console.warn("[server] SUPABASE_URL o SUPABASE_SECRET_KEY non impostati: le richieste non possono essere salvate.");
  else
    riprendiRichiestePendenti().catch((err) =>
      console.error("[server] ripresa richieste non riuscita:", err.message)
    );
  verifyMailer();
});
