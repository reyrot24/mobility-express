import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { segnalazioneEmail } from "../templates/segnalazioneEmail.js";
import { sendMail } from "./mailer.js";
import { supabase } from "./supabase.js";

/**
 * Salva la segnalazione nel database (fonte di verità) e poi avvisa il team via email.
 * L'email è best effort: se fallisce la segnalazione resta comunque salvata.
 * @returns {Promise<{id: string}>}
 */
export async function creaSegnalazione(data) {
  if (!supabase) throw new Error("Supabase non configurato");

  const id = `SG-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const { error } = await supabase.from("segnalazioni").insert({
    id,
    tipo: data.tipo,
    area: data.area,
    titolo: data.titolo,
    descrizione: data.descrizione,
    beneficio: data.beneficio,
    impatto: data.impatto,
    contatto_nome: data.contatto?.nome || null,
    contatto_email: data.contatto?.email || null,
  });
  if (error) throw new Error(error.message);

  if (config.segnalazioniEmail)
    sendMail({
      to: config.segnalazioniEmail,
      replyTo: data.contatto?.email,
      ...segnalazioneEmail({ id, ...data }),
    }).catch((err) => console.error(`[segnalazioni] email per ${id} non inviata:`, err.message));

  return { id };
}
