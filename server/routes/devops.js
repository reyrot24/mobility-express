import { createHash, timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { config } from "../config.js";
import { registraRisultato } from "../services/richieste.js";

export const devopsRouter = Router();

const digest = (value) => createHash("sha256").update(value).digest();

/** Verifica "Authorization: Bearer <DEVOPS_WEBHOOK_SECRET>" a tempo costante. */
function requireDevops(req, res, next) {
  const secret = config.devopsWebhook.secret;
  if (!secret) return res.status(503).json({ message: "Webhook non configurato." });
  const token = req.get("Authorization")?.match(/^Bearer (.+)$/)?.[1] ?? "";
  if (!timingSafeEqual(digest(token), digest(secret)))
    return res.status(401).json({ message: "Non autorizzato." });
  next();
}

// Devops invia il risultato di una richiesta: salviamo il prezzo e avvisiamo il cliente.
// TODO: adattare la lettura del JSON quando devops avrà definito il formato.
devopsRouter.post("/risultati", requireDevops, async (req, res) => {
  console.log("[devops] risultato ricevuto:", JSON.stringify(req.body));
  try {
    const esito = await registraRisultato(req.body);
    if (esito === "non_trovata") return res.status(404).json({ message: "Richiesta non trovata." });
    res.json({ esito });
  } catch (err) {
    console.error("[devops] risultato non registrato:", err.message);
    const invalid = /^(INVALID|MISSING)_/.test(err.message);
    res.status(invalid ? 422 : 503).json({ message: invalid ? err.message : "Riprova più tardi." });
  }
});
