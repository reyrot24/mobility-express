import { escapeHtml, hr } from "./layout.js";

const TIPI = { idea: "Nuova idea", improvement: "Miglioramento", bug: "Problema" };
const IMPATTI = { low: "Sarebbe utile", medium: "Farebbe la differenza", high: "Alto / bloccante" };

/**
 * Notifica interna al team: nuova segnalazione dalla pagina Suggerisci.
 * @param {{id: string, tipo: string, area: string, titolo: string, descrizione: string,
 *   beneficio: string, impatto: string, contatto: {nome: string, email: string}|null}} s
 */
export function segnalazioneEmail(s) {
  const subject = `[${TIPI[s.tipo]}] ${s.titolo} · ${s.id}`;
  const contatto = s.contatto
    ? `${s.contatto.nome || "Senza nome"} <${s.contatto.email}>`
    : "Nessun contatto (anonimo)";
  const righe = [
    ["Tipo", TIPI[s.tipo]],
    ["Area", s.area],
    ["Impatto", IMPATTI[s.impatto]],
    ["Contatto", contatto],
  ];

  const html = `<!doctype html>
<html lang="it"><body style="margin:0;background:#f5f6fa;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#040c54">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border-radius:12px;border-top:4px solid #ff6b01;padding:32px;line-height:1.55">
      <p style="font-size:12px;color:#5e637e;margin:0">Nuova segnalazione · ${escapeHtml(s.id)}</p>
      <h1 style="font-size:22px;line-height:1.3;margin:8px 0 20px">${escapeHtml(s.titolo)}</h1>
      <table style="font-size:14px;border-collapse:collapse">${righe
        .map(([k, v]) => `<tr><td style="color:#5e637e;padding:2px 16px 2px 0">${k}</td><td><strong>${escapeHtml(v)}</strong></td></tr>`)
        .join("")}</table>
      ${hr}
      <p style="font-size:14px;margin:0;white-space:pre-wrap">${escapeHtml(s.descrizione)}</p>
      ${s.beneficio ? `<p style="font-size:12px;color:#5e637e;margin:20px 0 4px">Cosa cambierebbe</p><p style="font-size:14px;margin:0;white-space:pre-wrap">${escapeHtml(s.beneficio)}</p>` : ""}
    </div>
  </div>
</body></html>`;

  const text = [
    subject,
    "",
    ...righe.map(([k, v]) => `${k}: ${v}`),
    "",
    s.descrizione,
    ...(s.beneficio ? ["", `Cosa cambierebbe: ${s.beneficio}`] : []),
  ].join("\n");

  return { subject, html, text };
}
