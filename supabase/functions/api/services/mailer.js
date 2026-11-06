import nodemailer from "nodemailer";
import { config } from "../config.js";

// Senza SMTP configurato (sviluppo) le email vengono stampate nei log invece di essere inviate.
const transporter = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user
        ? { user: config.smtp.user, pass: config.smtp.pass }
        : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true });

if (!config.smtp.host)
  console.warn("[mailer] SMTP_HOST non impostato: le email saranno solo stampate nei log.");
if (!config.adesioniReali)
  console.warn(
    `[mailer] AMBIENTE DI TEST: email solo verso ${config.emailAllowlist.join(", ") || "(allowlist vuota: nessuno)"}.`
  );

/** Destinatario rifiutato dall'ambiente di test: l'invio non parte e viene registrato come "bloccata". */
export class EmailBloccataError extends Error {}

/** true se l'email può partire verso questo indirizzo nell'ambiente attuale. */
export const destinatarioAmmesso = (to) =>
  config.adesioniReali || config.emailAllowlist.includes(String(to).trim().toLowerCase());

/**
 * Invia un'email.
 * @param {{to: string, subject: string, html: string, text: string, replyTo?: string}} message
 * @returns {Promise<string>} messageId
 * @throws {EmailBloccataError} in ambiente di test, se il destinatario non è nella allowlist
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
  // Unico punto di uscita delle email: nessun percorso può saltare il blocco dell'ambiente di test
  if (!destinatarioAmmesso(to))
    throw new EmailBloccataError(`AMBIENTE_TEST: ${to} non è in PG_EMAIL_ALLOWLIST`);

  const info = await transporter.sendMail({
    from: config.mailFrom,
    to,
    subject,
    html,
    text,
    replyTo,
  });
  if (!config.smtp.host)
    console.log(
      `\n[mailer] email simulata (non inviata)\nA: ${to}\nOggetto: ${subject}\n\n${text}\n`
    );
  // Con un account Ethereal (smtp.ethereal.email) stampa il link per vedere l'email nel browser
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) console.log(`[mailer] anteprima: ${previewUrl}`);
  return info.messageId;
}
