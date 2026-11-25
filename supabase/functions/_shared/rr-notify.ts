// Risk Radar Aziende — tutte le email del servizio. Partono dal nostro SMTP, lo stesso di
// "OK, il prezzo è giusto?": secret SMTP_HOST, SMTP_PORT (465), SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM.
// Le Edge Functions non escono sulle porte 25 e 587.
//
//  1. "Nuova analisi"            -> ufficio (+ titolare del link)       sendAnalysisMail(kind "nuova")
//  2. "Vuole essere ricontattata" -> ufficio (+ titolare del link)       sendAnalysisMail(kind "ricontatto")
//  3. Riepilogo al cliente        -> conferma dell'email, poi riepilogo  sendConfirmMail / sendSummaryMail
//  4. "Il tuo link è pronto"      -> titolare del link, con QR code      sendLinkMail
//
// Destinatari interni in rr_settings: notify_emails (ufficio) e notify_owner ('true'/'false').
// Le email al cliente seguono le regole del referral ALCA Energia: mittente "Alca Broker", si scrive solo
// dopo la conferma dell'indirizzo, le risposte vanno al titolare del link (o all'ufficio).
// AMBIENTE DI TEST (come PG_EMAIL_ALLOWLIST): finché RR_EMAIL_REALI non è "true", le email al cliente
// partono solo verso gli indirizzi di RR_EMAIL_ALLOWLIST; le altre restano bloccate con esito "bloccata_test".
import nodemailer from "npm:nodemailer@10.0.15";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.45.4";

const env = (n: string) => Deno.env.get(n) || undefined;
export const SITE_URL = (env("SITE_URL") ?? "https://www.mobilityexpress.it").replace(/\/$/, "");

const transporter = env("SMTP_HOST")
  ? nodemailer.createTransport({
      host: env("SMTP_HOST"),
      port: Number(env("SMTP_PORT") ?? 465),
      secure: (env("SMTP_SECURE") ?? "true") === "true",
      auth: env("SMTP_USER") ? { user: env("SMTP_USER"), pass: env("SMTP_PASS") } : undefined,
    })
  : null;

const MAIL_FROM = env("MAIL_FROM") ?? "Mobility Express <noreply@mobilityexpress.it>";
/** Mittente delle email al cliente e ai titolari: stessa casella, nome "Alca Broker". */
const ALCA_FROM = env("RR_MAIL_FROM") ?? `"Alca Broker" <${MAIL_FROM.match(/<([^>]+)>/)?.[1] ?? MAIL_FROM.trim()}>`;

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]{2,}$/;
export const parseEmails = (s: unknown) =>
  [...new Set(String(s ?? "").split(/[,;\s]+/).map((e) => e.trim().toLowerCase()).filter((e) => EMAIL_RE.test(e)))];

const REALI = env("RR_EMAIL_REALI") === "true";
const ALLOWLIST = parseEmails(env("RR_EMAIL_ALLOWLIST"));
if (!REALI) console.warn(`[rr-notify] AMBIENTE DI TEST: email al cliente solo verso ${ALLOWLIST.join(", ") || "(RR_EMAIL_ALLOWLIST vuota: nessuno)"}.`);
/** Le email al cliente possono partire verso questo indirizzo? (in test: solo la allowlist) */
export const customerAllowed = (to: string) => REALI || ALLOWLIST.includes(to.toLowerCase());
/** Stato delle email al cliente, per la dashboard. */
export const customerMode = () => ({ live: REALI, allowlist: REALI ? [] : ALLOWLIST });

export async function notifySettings(db: SupabaseClient) {
  const { data } = await db.from("rr_settings").select("key,value").in("key", ["notify_emails", "notify_owner"]);
  const m = Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value]));
  return { emails: parseEmails(m.notify_emails), owner: m.notify_owner === "true" };
}

/** Codice breve dell'analisi, nell'oggetto delle email (come [ST-…] nel referral ALCA). */
export const rrCode = (id: string) => "RR-" + id.replace(/-/g, "").slice(0, 8).toUpperCase();

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const eur = (n: number) => "€ " + Math.round(n || 0).toLocaleString("it-IT");
const riskLevel = (n: number) => (n >= 70 ? "alto" : n >= 50 ? "medio" : "contenuto");

type Attachment = { filename: string; content: string; encoding: "base64"; contentType: string; cid?: string };
async function send(o: { from: string; to: string[]; subject: string; text: string; html: string; replyTo?: string; attachments?: Attachment[] }) {
  if (!o.to.length) return [];
  if (!transporter) {
    console.log(`[rr-notify] SMTP_HOST non impostato, email non inviata.\nA: ${o.to.join(", ")}\n${o.subject}\n\n${o.text}`);
    throw new Error("email_non_configurata");
  }
  await transporter.sendMail({
    from: o.from, to: o.to.join(", "), subject: o.subject, text: o.text, html: o.html,
    replyTo: o.replyTo && EMAIL_RE.test(o.replyTo) ? o.replyTo : undefined,
    attachments: o.attachments,
  });
  return o.to;
}
/** Esito breve da salvare nel database (come "notifica" nel referral ALCA). */
export const mailError = (e: unknown) => {
  const m = String((e as Error)?.message ?? e);
  if (m === "email_non_configurata") return m;
  return /535|BadCredentials|Invalid login/i.test(m) ? "email_credenziali_errate" : "email_errore: " + m.slice(0, 160);
};

/* =====================================================================
   1 e 2 — Avvisi interni (ufficio e titolare del link)
   ===================================================================== */
export type AnalysisMail = {
  id?: string;
  kind?: "nuova" | "ricontatto";
  company_name: string | null; piva: string; address: string | null; sector: string;
  overall_risk: number; budget_low: number; budget_high: number;
  email: string; phone: string | null; wants_contact: boolean;
  referrer: { name: string; operatore_nome: string | null } | null;
  test?: boolean;
};

function renderInternal(a: AnalysisMail) {
  const ricontatto = a.kind === "ricontatto";
  const company = a.company_name || `P.IVA ${a.piva}`;
  const via = a.referrer ? `${a.referrer.name}${a.referrer.operatore_nome ? ` (${a.referrer.operatore_nome})` : ""}` : "accesso diretto";
  const dash = `${SITE_URL}/risk-radar/admin`;
  const code = a.id ? ` [${rrCode(a.id)}]` : "";
  const rows: [string, string][] = [
    ["Azienda", company],
    ["Partita IVA", a.piva],
    ["Sede", a.address || "—"],
    ["Settore", a.sector],
    ["Indice di rischio", `${a.overall_risk}/100 (${riskLevel(a.overall_risk)})`],
    ["Budget soluzione equilibrata", `${eur(a.budget_low)} – ${eur(a.budget_high)} l'anno`],
    ["Email", a.email],
    ["Telefono", a.phone || "—"],
    ["Vuole un consulente", a.wants_contact ? "Sì" : "No"],
    ["Link", via],
  ];
  const prefix = a.test ? "[PROVA] " : "";
  const subject = ricontatto
    ? `${prefix}Risk Radar: ${company} vuole essere ricontattata${code}`
    : `${prefix}Risk Radar: nuova analisi di ${company}${code}${a.wants_contact ? " · da ricontattare" : ""}`;
  const title = ricontatto ? `Da ricontattare: ${company}` : `Nuova analisi: ${company}`;
  const lead = ricontatto
    ? "Dopo aver visto il risultato, l'azienda ha chiesto di essere ricontattata da un consulente."
    : "Un'azienda ha completato l'analisi dei rischi.";
  const text = [
    a.test ? "Email di prova: i dati qui sotto sono inventati.\n" : "",
    lead,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    `Apri la dashboard: ${dash}`,
    "Usa i dati solo per questa richiesta.",
  ].join("\n");
  const html = `<!doctype html><html><body style="margin:0;background:#fdf9f4;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#172346">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="font-weight:800;font-size:16px;margin-bottom:16px">Risk Radar Aziende <span style="color:#7c879a;font-weight:600;font-size:13px">· ALCA Broker</span></div>
  <div style="background:#fff;border:1px solid #ece9e5;border-radius:16px;padding:22px">
    ${a.test ? `<p style="margin:0 0 14px;padding:8px 12px;border-radius:8px;background:#fff6e3;color:#a15c00;font-size:13px">Email di prova: i dati qui sotto sono inventati.</p>` : ""}
    <h1 style="font-size:20px;margin:0 0 6px">${esc(title)}</h1>
    <p style="margin:0 0 18px;color:#5d6980;font-size:14px">${esc(lead)}${!ricontatto && a.wants_contact ? " <b style=\"color:#28804c\">Chiede di essere ricontattata da un consulente.</b>" : ""}</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${rows.map(([k, v]) => `<tr><td style="padding:7px 0;color:#7c879a;width:46%;border-top:1px solid #f1efec">${esc(k)}</td><td style="padding:7px 0;font-weight:600;border-top:1px solid #f1efec">${esc(v)}</td></tr>`).join("")}
    </table>
    <p style="margin:22px 0 0"><a href="${esc(dash)}" style="display:inline-block;background:#ef6b1c;color:#fff;text-decoration:none;font-weight:700;padding:11px 18px;border-radius:10px">Apri la dashboard</a></p>
  </div>
  <p style="font-size:11px;color:#7c879a;margin:16px 4px 0">Email automatica per i collaboratori ALCA Broker. Contiene dati personali: usali solo per questa richiesta e non inoltrarla fuori dall'azienda.</p>
</div></body></html>`;
  return { subject, text, html };
}

/** Avviso interno ("nuova analisi" o "ricontatto"). Restituisce i destinatari; lancia un errore se l'invio fallisce. */
export async function sendAnalysisMail(to: string[], a: AnalysisMail, replyTo?: string) {
  const { subject, text, html } = renderInternal(a);
  return send({ from: MAIL_FROM, to, subject, text, html, replyTo });
}

/* =====================================================================
   3 e 4 — Email esterne, con la grafica comune (mittente "Alca Broker")
   ===================================================================== */
const ALCA_LEGAL = "Alca Broker S.r.l. · Via Vittoria Colonna 14, 80121 Napoli · P.IVA 07965051217 · iscritta al RUI con numero B000514026";
const PRIVACY_EMAIL = "privacy@alcabroker.it";

function layout(o: { site: string; title: string; body: string; button?: { text: string; url: string }; signature?: string; note: string }) {
  return `<!doctype html><html><body style="margin:0;background:#fdf9f4;font-family:Arial,Helvetica,sans-serif;color:#172346">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf9f4;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #ece9e5">
<tr><td style="padding:18px 24px;border-bottom:3px solid #ef6b1c;font-size:15px"><b>Risk Radar <span style="color:#ef6b1c">Aziende</span></b> <span style="color:#7c879a;font-size:13px">· Alca Broker</span></td></tr>
<tr><td style="padding:26px 24px 8px;font-size:15px;line-height:1.5"><h1 style="margin:0 0 14px;font-size:22px;line-height:1.25">${esc(o.title)}</h1>${o.body}
${o.button ? `<p style="margin:22px 0"><a href="${esc(o.button.url)}" style="background:#ef6b1c;color:#ffffff;text-decoration:none;padding:13px 22px;border-radius:9px;font-weight:bold;display:inline-block">${esc(o.button.text)}</a></p>` : ""}</td></tr>
${o.signature ? `<tr><td style="padding:4px 24px 20px;font-size:13px;color:#5d6980">${o.signature}</td></tr>` : ""}
<tr><td style="padding:14px 24px;background:#f6f4f1;font-size:11px;color:#7c879a;line-height:1.5">${esc(o.note)}<br>${esc(ALCA_LEGAL)}<br>
<a href="${esc(o.site)}/risk-radar" style="color:#7c879a">Risk Radar Aziende</a> · Privacy: <a href="mailto:${PRIVACY_EMAIL}" style="color:#7c879a">${PRIVACY_EMAIL}</a></td></tr>
</table></td></tr></table></body></html>`;
}
const p = (t: string) => `<p style="margin:0 0 12px">${t}</p>`;
const small = (t: string) => `<p style="margin:12px 0 0;font-size:12px;color:#7c879a">${t}</p>`;
const owner = (o: { nome: string | null; email: string | null } | null) =>
  o?.nome ? `<b>${esc(o.nome)}</b> · Il tuo consulente Alca Broker${o.email ? ` · ${esc(o.email)}` : ""}` : "Il team Alca Broker";

/* ---------- 3a: conferma dell'indirizzo ---------- */
export async function sendConfirmMail(to: string, o: {
  id: string; company: string; url: string; site: string; owner: { nome: string | null; email: string | null } | null; replyTo?: string;
}) {
  const code = rrCode(o.id);
  const subject = `Conferma l'email per ricevere il tuo Risk Radar [${code}]`;
  const body =
    p(`Abbiamo ricevuto la richiesta di inviare a questo indirizzo il riepilogo dell'analisi dei rischi di <b>${esc(o.company)}</b>.`) +
    p("Per riceverlo, conferma l'email con il pulsante qui sotto. Il link dura 24 ore.") +
    p("Se non sei stato tu, ignora questa email: senza conferma non ti invieremo nient'altro.") +
    small(`Richiesta ${code}`);
  const text = [
    `Abbiamo ricevuto la richiesta di inviare a questo indirizzo il riepilogo dell'analisi dei rischi di ${o.company}.`,
    "", "Per riceverlo, conferma l'email aprendo questo link (dura 24 ore):", o.url, "",
    "Se non sei stato tu, ignora questa email: senza conferma non ti invieremo nient'altro.", "",
    `Richiesta ${code}`, ALCA_LEGAL,
  ].join("\n");
  const html = layout({
    site: o.site, title: "Conferma la tua email", body, button: { text: "Confermo la mia email", url: o.url },
    signature: owner(o.owner), note: "Ricevi questa email perché l'indirizzo è stato indicato su Risk Radar Aziende.",
  });
  return send({ from: ALCA_FROM, to: [to], subject, text, html, replyTo: o.replyTo });
}

/* ---------- 3b: riepilogo dell'analisi ---------- */
type SummaryResult = {
  sector: { code: string; name: string }; revenue: string; employees: string;
  risks: { label: string; score: number }[];
  covers: { name: string; why: string; prio: string; limit: string; low: number; high: number }[];
  packages: { name: string; low: number; high: number; items: { name: string }[] }[];
  overall: number; disclaimer: string;
};
const bar = (n: number) => {
  const c = n >= 70 ? "#d92d20" : n >= 45 ? "#ef6b1c" : "#28804c";
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1efec;border-radius:6px"><tr><td width="${Math.max(4, n)}%" style="background:${c};height:8px;border-radius:6px;font-size:0;line-height:0">&nbsp;</td><td style="font-size:0;line-height:0">&nbsp;</td></tr></table>`;
};

export async function sendSummaryMail(to: string, o: {
  id: string; company: string; piva: string; result: SummaryResult; site: string;
  owner: { nome: string | null; email: string | null } | null; replyTo?: string; wantsContact: boolean;
}) {
  const r = o.result, code = rrCode(o.id);
  const risks = [...r.risks].sort((a, b) => b.score - a.score).slice(0, 5);
  const covers = r.covers.filter((c) => c.prio !== "bassa").slice(0, 6);
  const subject = `Il tuo Risk Radar: ${o.company} [${code}]`;
  const td = "padding:7px 0;border-top:1px solid #f1efec;vertical-align:top";
  const body =
    p(`Ecco il riepilogo dell'analisi dei rischi di <b>${esc(o.company)}</b> (P.IVA ${esc(o.piva)}).`) +
    `<div style="margin:6px 0 18px;padding:14px 16px;border-radius:12px;background:#fff1e6;border:1px solid #ffd9bf">
      <div style="font-size:12px;color:#a14a12;font-weight:bold;text-transform:uppercase;letter-spacing:.04em">Indice di rischio</div>
      <div style="font-size:30px;font-weight:800;color:#c2410c;line-height:1.2">${r.overall}<span style="font-size:15px;color:#a14a12">/100 · ${riskLevel(r.overall)}</span></div>
      <div style="font-size:13px;color:#5d6980">${esc(r.sector.name)} · fatturato ${esc(r.revenue)} · ${esc(r.employees)} dipendenti</div></div>` +
    `<h2 style="font-size:16px;margin:0 0 6px">I rischi principali</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:18px">
      ${risks.map((k) => `<tr><td style="${td};width:48%">${esc(k.label)}</td><td style="${td};width:38%;padding-top:13px">${bar(k.score)}</td><td style="${td};text-align:right;font-weight:bold">${k.score}</td></tr>`).join("")}
    </table>` +
    (covers.length ? `<h2 style="font-size:16px;margin:0 0 6px">Le coperture da valutare</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:18px">
      ${covers.map((c) => `<tr><td style="${td}"><b>${esc(c.name)}</b>${c.prio === "alta" ? ` <span style="font-size:11px;color:#c2410c;font-weight:bold">PRIORITÀ ALTA</span>` : ""}<br><span style="font-size:13px;color:#5d6980">${esc(c.why)}</span></td><td style="${td};text-align:right;white-space:nowrap;font-size:13px">${eur(c.low)} – ${eur(c.high)}</td></tr>`).join("")}
    </table>` : "") +
    `<h2 style="font-size:16px;margin:0 0 6px">Budget annuo indicativo</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;margin-bottom:12px">
      ${r.packages.map((k, i) => `<tr><td style="${td}"><b>${esc(k.name)}</b>${i === 1 ? ` <span style="font-size:11px;color:#c2410c;font-weight:bold">CONSIGLIATA</span>` : ""}<br><span style="font-size:12px;color:#7c879a">${k.items.length} coperture</span></td><td style="${td};text-align:right;white-space:nowrap;font-weight:bold">${eur(k.low)} – ${eur(k.high)}</td></tr>`).join("")}
    </table>` +
    small(esc(r.disclaimer)) +
    `<div style="height:14px"></div>` +
    p(o.wantsContact
      ? "Hai chiesto di essere ricontattato: un consulente Alca Broker ti scriverà o ti chiamerà a breve. Puoi anche rispondere a questa email."
      : "Vuoi approfondire? Rispondi a questa email: un consulente Alca Broker ti aiuterà a trasformare l'analisi in una proposta su misura, senza impegno.");
  const text = [
    `Riepilogo dell'analisi dei rischi di ${o.company} (P.IVA ${o.piva})`, "",
    `Indice di rischio: ${r.overall}/100 (${riskLevel(r.overall)})`,
    `${r.sector.name} · fatturato ${r.revenue} · ${r.employees} dipendenti`, "",
    "I rischi principali:", ...risks.map((k) => `- ${k.label}: ${k.score}/100`), "",
    ...(covers.length ? ["Le coperture da valutare:", ...covers.map((c) => `- ${c.name}${c.prio === "alta" ? " (priorità alta)" : ""}: ${eur(c.low)} – ${eur(c.high)}`), ""] : []),
    "Budget annuo indicativo:", ...r.packages.map((k) => `- ${k.name}: ${eur(k.low)} – ${eur(k.high)}`), "",
    r.disclaimer, "",
    "Per approfondire rispondi a questa email.", "", `Richiesta ${code}`, ALCA_LEGAL,
  ].join("\n");
  const html = layout({
    site: o.site, title: "Il tuo Risk Radar", body, signature: owner(o.owner),
    note: `Hai ricevuto questa email perché l'hai chiesta su Risk Radar Aziende e hai confermato l'indirizzo. Non riceverai altre email promozionali. Richiesta ${code}.`,
  });
  return send({ from: ALCA_FROM, to: [to], subject, text, html, replyTo: o.replyTo });
}

/* ---------- 4: link e QR code al titolare ---------- */
export async function sendLinkMail(to: string, o: { name: string; operatore_nome: string | null; url: string; qrGif: string; site: string; replyTo?: string }) {
  const subject = `Il tuo link Risk Radar è pronto: ${o.name}`;
  const hello = o.operatore_nome ? `Ciao ${esc(o.operatore_nome.split(" ")[0])},` : "Ciao,";
  const body =
    p(hello) +
    p(`è pronto il tuo link personale <b>${esc(o.name)}</b> per Risk Radar Aziende. Le aziende che lo aprono fanno l'analisi dei rischi gratuita e la richiesta arriva a tuo nome.`) +
    `<p style="margin:0 0 12px;padding:10px 12px;background:#f6f4f1;border-radius:8px;font-family:monospace;font-size:13px;word-break:break-all"><a href="${esc(o.url)}" style="color:#172346">${esc(o.url)}</a></p>` +
    p("Condividilo via WhatsApp, email o sui social, oppure stampa il QR code qui sotto (lo trovi anche in allegato).") +
    `<p style="margin:6px 0 12px;text-align:center"><img src="cid:rr-qr" alt="QR code del link" width="200" height="200" style="width:200px;height:200px;image-rendering:pixelated"></p>` +
    small("Quando un'azienda completa l'analisi dal tuo link, la trovi nella dashboard Risk Radar e, se attivo, ricevi un avviso via email. Usa i dati delle aziende solo per la loro richiesta.");
  const text = [
    o.operatore_nome ? `Ciao ${o.operatore_nome.split(" ")[0]},` : "Ciao,", "",
    `è pronto il tuo link personale "${o.name}" per Risk Radar Aziende:`, o.url, "",
    "Condividilo via WhatsApp, email o sui social. In allegato trovi il QR code da stampare.", "", ALCA_LEGAL,
  ].join("\n");
  const html = layout({ site: o.site, title: "Il tuo link Risk Radar è pronto", body, signature: "Il team Alca Broker",
    note: "Email inviata ai collaboratori Alca Broker titolari di un link Risk Radar." });
  return send({
    from: ALCA_FROM, to: [to], subject, text, html, replyTo: o.replyTo,
    attachments: [
      { filename: `qr-risk-radar-${o.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30)}.gif`, content: o.qrGif, encoding: "base64", contentType: "image/gif", cid: "rr-qr" },
    ],
  });
}
