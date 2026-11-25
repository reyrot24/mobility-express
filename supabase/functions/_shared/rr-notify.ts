// Risk Radar Aziende — email "Nuova analisi" all'ufficio e (se attivo) al titolare del link.
// Parte dal nostro SMTP, lo stesso di "OK, il prezzo è giusto?": secret SMTP_HOST, SMTP_PORT (465),
// SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM. Le Edge Functions non escono sulle porte 25 e 587.
// Destinatari in rr_settings: notify_emails (ufficio, separati da virgola) e notify_owner ('true'/'false').
// Nessun destinatario configurato = nessuna email.
import nodemailer from "npm:nodemailer@10.0.15";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (n: string) => Deno.env.get(n) || undefined;
const SITE_URL = (env("SITE_URL") ?? "https://www.mobilityexpress.it").replace(/\/$/, "");

const transporter = env("SMTP_HOST")
  ? nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port: Number(env("SMTP_PORT") ?? 465),
      secure: (env("SMTP_SECURE") ?? "true") === "true",
      auth: env("SMTP_USER") ? { user: env("SMTP_USER"), pass: env("SMTP_PASS") } : undefined,
    })
  : null;

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
export const parseEmails = (s: unknown) =>
  [...new Set(String(s ?? "").split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))];

export async function notifySettings(db: SupabaseClient) {
  const { data } = await db.from("rr_settings").select("key,value").in("key", ["notify_emails", "notify_owner"]);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return { emails: parseEmails(m.notify_emails), owner: m.notify_owner === "true" };
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const eur = (n: number) => "€ " + Math.round(n || 0).toLocaleString("it-IT");

export type AnalysisMail = {
  company_name: string | null; piva: string; address: string | null; sector: string;
  overall_risk: number; budget_low: number; budget_high: number;
  email: string; phone: string | null; wants_contact: boolean;
  referrer: { name: string; operatore_nome: string | null } | null;
  test?: boolean;
};

function render(a: AnalysisMail) {
  const level = a.overall_risk >= 70 ? "alto" : a.overall_risk >= 50 ? "medio" : "contenuto";
  const company = a.company_name || `P.IVA ${a.piva}`;
  const via = a.referrer ? `${a.referrer.name}${a.referrer.operatore_nome ? ` (${a.referrer.operatore_nome})` : ""}` : "accesso diretto";
  const dash = `${SITE_URL}/risk-radar/admin`;
  const rows: [string, string][] = [
    ["Azienda", company],
    ["Partita IVA", a.piva],
    ["Sede", a.address || "—"],
    ["Settore", a.sector],
    ["Indice di rischio", `${a.overall_risk}/100 (${level})`],
    ["Budget soluzione equilibrata", `${eur(a.budget_low)} – ${eur(a.budget_high)} l'anno`],
    ["Email", a.email],
    ["Telefono", a.phone || "—"],
    ["Vuole un consulente", a.wants_contact ? "Sì" : "No"],
    ["Link", via],
  ];
  const prefix = a.test ? "[PROVA] " : "";
  const subject = `${prefix}Risk Radar: nuova analisi di ${company}`;
  const text = [
    a.test ? "Email di prova: i dati qui sotto sono inventati.\n" : "",
    `Un'azienda ha completato l'analisi dei rischi su Risk Radar Aziende.`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Apri la dashboard: ${dash}`,
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#fdf9f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#172346">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="font-weight:800;font-size:16px;margin-bottom:16px">Risk Radar Aziende <span style="color:#7c879a;font-weight:600;font-size:13px">· ALCA Broker</span></div>
  <div style="background:#fff;border:1px solid #ece9e5;border-radius:16px;padding:22px">
    ${a.test ? `<p style="margin:0 0 14px;padding:8px 12px;border-radius:8px;background:#fff6e3;color:#a15c00;font-size:13px">Email di prova: i dati qui sotto sono inventati.</p>` : ""}
    <h1 style="font-size:20px;margin:0 0 6px">Nuova analisi: ${esc(company)}</h1>
    <p style="margin:0 0 18px;color:#5d6980;font-size:14px">Un'azienda ha completato l'analisi dei rischi.${a.wants_contact ? " <b style=\"color:#28804c\">Chiede di essere ricontattata da un consulente.</b>" : ""}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows.map(([k, v]) => `<tr><td style="padding:7px 0;color:#7c879a;width:46%;border-top:1px solid #f1efec">${esc(k)}</td><td style="padding:7px 0;font-weight:600;border-top:1px solid #f1efec">${esc(v)}</td></tr>`).join("")}
    </table>
    <p style="margin:22px 0 0"><a href="${esc(dash)}" style="display:inline-block;background:#ef6b1c;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px">Apri la dashboard</a></p>
  </div>
  <p style="font-size:11px;color:#7c879a;margin:16px 4px 0">Email automatica inviata ai collaboratori ALCA Broker. Contiene dati personali: non inoltrarla fuori dall'azienda.</p>
</div></body></html>`;
  return { subject, text, html };
}

/** Invia l'email "nuova analisi". Restituisce i destinatari effettivi; lancia un errore se l'invio fallisce. */
export async function sendAnalysisMail(to: string[], a: AnalysisMail, replyTo?: string) {
  if (!to.length) return [];
  const { subject, text, html } = render(a);
  if (!transporter) {
    console.log(`[rr-notify] SMTP_HOST non impostato, email non inviata.\nA: ${to.join(", ")}\n${subject}\n\n${text}`);
    throw new Error("SMTP non configurato");
  }
  await transporter.sendMail({
    from: env("MAIL_FROM") ?? "Mobility Express <noreply@mobilityexpress.it>",
    to: to.join(", "),
    subject, text, html,
    replyTo: replyTo && EMAIL_RE.test(replyTo) ? replyTo : undefined,
  });
  return to;
}
