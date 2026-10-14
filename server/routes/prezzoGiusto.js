import { Router } from "express";
import { getRequestUser, handleInvalidSession, requireUser } from "../lib/auth.js";
import { rateLimit } from "../lib/rateLimit.js";
import { validateRichiesta } from "../lib/validation.js";
import { creaRichiesta, richiediRicontatto } from "../services/richieste.js";

export const prezzoGiustoRouter = Router();

// Registra il cliente (se nuovo), salva la richiesta e invia l'email di conferma.
// La stima arriva dopo, via email, quando l'elaborazione in background è completa.
prezzoGiustoRouter.post(
  "/richieste",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  async (req, res) => {
    try {
      // Dall'area personale: la richiesta va sempre all'account in sessione
      const user = await getRequestUser(req);
      const body = user ? { ...req.body, email: user.email } : req.body;
      const { data, error } = validateRichiesta(body);
      if (error) return res.status(400).json({ message: error });

      const key = req.get("Idempotency-Key")?.slice(0, 100) || undefined;
      res.status(202).json(await creaRichiesta(data, key, user));
    } catch (err) {
      if (handleInvalidSession(err, res)) return;
      console.error("[prezzo-giusto] richiesta non salvata:", err.message);
      res.status(503).json({
        message: "Al momento non riusciamo a registrare la richiesta. Riprova tra qualche minuto.",
      });
    }
  }
);

// Ricontatto richiesto dall'area personale. Non modifica il consenso marketing.
prezzoGiustoRouter.post(
  "/richieste/:id/ricontatto",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  requireUser,
  async (req, res) => {
    try {
      const requestedAt = await richiediRicontatto(req.params.id, req.user);
      if (!requestedAt) return res.status(404).json({ message: "Richiesta non trovata." });
      res.json({ requestedAt });
    } catch (err) {
      console.error("[prezzo-giusto] ricontatto non registrato:", err.message);
      res.status(503).json({ message: "Riprova tra qualche minuto." });
    }
  }
);
