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

/**
 * Invia un'email.
 * @param {{to: string, subject: string, html: string, text: string, replyTo?: string}} message
 * @returns {Promise<string>} messageId
 */
export async function sendMail({ to, subject, html, text, replyTo }) {
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
