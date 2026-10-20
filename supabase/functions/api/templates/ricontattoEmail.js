import { escapeHtml, hr, layout } from "./layout.js";

/**
 * Notifica al referente: il cliente ha chiesto di essere ricontattato via email.
 * Non contiene il consenso marketing, che è una scelta separata.
 * @param {{richiesta: object, referenteName: string|null}} params
 */
export function ricontattoEmail({ richiesta: r, referenteName }) {
  const subject = `Richiesta di ricontatto · ${r.id} · ${r.targa}`;
  const rows = [
    ["Richiesta", r.id],
    ["Email cliente", r.email],
    ["Targa", r.targa],
    ["Residenza", r.indirizzo],
    ["Link referral", r.referralId],
    ["Richiesto il", new Date(r.consents.callback.requestedAt).toLocaleString("it-IT")],
  ];

  const html = layout(`
      <h1 style="font-size:24px;line-height:1.25;margin:0 0 12px">Un cliente chiede un preventivo effettivo.</h1>
      <p style="font-size:14px;margin:0">${referenteName ? `Ciao ${escapeHtml(referenteName)}, ` : ""}il cliente ha chiesto di essere ricontattato <strong>via email</strong> per un preventivo RC auto.</p>
      ${hr}
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="padding:6px 0;color:#5e637e">${label}</td><td style="padding:6px 0;text-align:right"><strong>${escapeHtml(value)}</strong></td></tr>`
          )
          .join("")}
      </table>
      ${hr}
      <p style="font-size:12px;color:#5e637e;margin:0">Il ricontatto è autorizzato solo via email e solo per questa richiesta. Non autorizza comunicazioni commerciali.</p>`);

  const text = [
    subject,
    "",
    "Il cliente ha chiesto di essere ricontattato via email per un preventivo RC auto.",
    "",
    ...rows.map(([label, value]) => `${label}: ${value}`),
    "",
    "Il ricontatto non autorizza comunicazioni commerciali.",
  ].join("\n");

  return { subject, html, text };
}
