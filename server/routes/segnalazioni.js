import { Router } from "express";
import { rateLimit } from "../lib/rateLimit.js";
import { validateSegnalazione } from "../lib/validation.js";
import { creaSegnalazione } from "../services/segnalazioni.js";

export const segnalazioniRouter = Router();

// Idee, miglioramenti e problemi inviati dalla pagina /suggerisci/
segnalazioniRouter.post(
  "/",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }),
  async (req, res) => {
    const { data, error } = validateSegnalazione(req.body);
    if (error) return res.status(400).json({ message: error });
    try {
      res.status(201).json(await creaSegnalazione(data));
    } catch (err) {
      console.error("[segnalazioni] non salvata:", err.message);
      res.status(503).json({ message: "Al momento non riusciamo a salvare il suggerimento. Riprova tra qualche minuto." });
    }
  }
);
