import { button, escapeHtml, hr, layout } from "./layout.js";

/**
 * Conferma della cessazione del monitoraggio. Ultima comunicazione di servizio per quel veicolo.
 * @param {{targa: string, cessataIl: string, areaUrl: string}} params
 */
export function cessazioneEmail({ targa, cessataIl, areaUrl }) {
  const subject = `Monitoraggio interrotto · ${targa} | Polizze Express`;
  const data = new Date(cessataIl).toLocaleString("it-IT", { timeZone: "Europe/Rome" });

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">Monitoraggio interrotto.</h1>
      <p style="font-size:14px;margin:16px 0 0">Come richiesto, il servizio “OK, il prezzo è giusto?” per il veicolo <strong>${escapeHtml(targa)}</strong> è stato interrotto il ${escapeHtml(data)}.</p>
      <p style="font-size:14px;margin:12px 0 0">Da ora non riceverai più stime né comunicazioni di servizio per questo veicolo. La tua polizza e le sue scadenze non cambiano: ricordati di verificare copertura e rinnovo.</p>
      <p style="font-size:14px;margin:12px 0 0">L’interruzione del servizio è distinta dal consenso alle comunicazioni commerciali, che puoi gestire dall’area personale. Per le richieste sui dati personali: privacy@alcabroker.it.</p>
      ${button(areaUrl, "Vai alla tua area personale", true)}
      ${hr}
      <p style="font-size:12px;color:#5e637e;margin:0">Se non hai chiesto tu l’interruzione, scrivi a info@alcabroker.it.</p>`);

  const text = [
    subject,
    "",
    `Il servizio "OK, il prezzo è giusto?" per il veicolo ${targa} è stato interrotto il ${data}.`,
    "Non riceverai più stime né comunicazioni di servizio per questo veicolo.",
    "La tua polizza e le sue scadenze non cambiano: verifica copertura e rinnovo.",
    "",
    "Il consenso alle comunicazioni commerciali si gestisce a parte dall'area personale.",
    "Richieste sui dati personali: privacy@alcabroker.it.",
    "",
    `Area personale: ${areaUrl}`,
    "Se non hai chiesto tu l'interruzione, scrivi a info@alcabroker.it.",
  ].join("\n");

  return { subject, html, text };
}
