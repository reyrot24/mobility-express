import { Router } from "express";
import { requireUser } from "../lib/auth.js";
import { rateLimit } from "../lib/rateLimit.js";
import { validateAttivazione } from "../lib/validation.js";
import { updatePassword } from "../data/db.js";
import { attivaArea, datiAttivazione } from "../services/richieste.js";

export const accountRouter = Router();

const LINK_NON_VALIDO = {
  message: "Il link di attivazione non è valido o è scaduto. Fai una nuova richiesta per riceverne un altro.",
};

// Dati per precompilare il form di attivazione (email non modificabile)
accountRouter.get(
  "/attivazione",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 30 }),
  async (req, res) => {
    const token = typeof req.query.token === "string" ? req.query.token.slice(0, 100) : "";
    try {
      const dati = token ? await datiAttivazione(token) : null;
      if (!dati) return res.status(404).json(LINK_NON_VALIDO);
      res.json(dati);
    } catch (err) {
      console.error("[account] lettura attivazione non riuscita:", err.message);
      res.status(503).json({ message: "Riprova tra qualche minuto." });
    }
  }
);

// Attivazione: crea account e profilo, poi le richieste in attesa partono verso devops
accountRouter.post(
  "/attivazione",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  async (req, res) => {
    const { data, error } = validateAttivazione(req.body);
    if (error) return res.status(400).json({ message: error });
    try {
      const result = await attivaArea(data.token, data);
      if (!result) return res.status(404).json(LINK_NON_VALIDO);
      res.status(201).json(result);
    } catch (err) {
      console.error("[account] attivazione non riuscita:", err.message);
      res.status(503).json({ message: "Non è stato possibile attivare l’area personale. Riprova." });
    }
  }
);

// Cambio password dall'area personale (anche dopo il link di recupero)
accountRouter.post(
  "/password",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  requireUser,
  async (req, res) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (password.length < 12 || password.length > 72)
      return res.status(400).json({ message: "La password deve avere tra 12 e 72 caratteri." });
    try {
      await updatePassword(req.user.id, password);
      res.json({ ok: true });
    } catch (err) {
      console.error("[account] password non aggiornata:", err.message);
      res.status(503).json({ message: "Non è stato possibile aggiornare la password. Riprova." });
    }
  }
);
