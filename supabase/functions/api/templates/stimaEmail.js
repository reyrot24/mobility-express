import { ESTIMATE_DISCLAIMER, ESTIMATE_METHOD } from "../lib/consensi.js";
import { button, escapeHtml, hr, layout } from "./layout.js";

const range = (estimate) =>
  estimate.min === estimate.max ? `${estimate.min} €` : `${estimate.min}–${estimate.max} €`;

/**
 * Email al cliente con la stima orientativa.
 * @param {{id: string, targa: string, estimate: object|null, referente: {name, phone, email}|null,
 *          callbackRequested: boolean, areaUrl: string}} params
 */
export function stimaEmail({
  id,
  targa,
  estimate,
  referente,
  callbackRequested,
  areaUrl,
}) {
  const subject = "La Tua Stima | Polizze Express";

  const estimateBlock = estimate
    ? `<div style="background:#fff5eb;border-radius:12px;padding:24px;margin:24px 0">
        <span style="display:inline-block;padding:4px 10px;background:#fff0e3;border-radius:99px;font-size:12px;font-weight:600;color:#913900">${estimate.min === estimate.max ? "Prezzo indicativo" : "Range indicativo"}${estimate.demo ? " · esempio dimostrativo" : ""}</span>
        <div style="font-size:40px;font-weight:600;letter-spacing:-1.5px;margin-top:8px">${range(estimate)}<small style="font-size:15px;font-weight:400;color:#5e637e;letter-spacing:0"> / anno · indicativo</small></div>
        <p style="font-size:12px;color:#5e637e;margin:4px 0 0">Richiesta ${escapeHtml(id)} · veicolo ${escapeHtml(targa)}</p>
      </div>`
    : `<p style="margin:24px 0">Al momento non è disponibile una stima per il veicolo <strong>${escapeHtml(targa)}</strong>. Puoi chiedere al tuo referente un preventivo effettivo.</p>`;

  const notice = `<div style="border-left:4px solid #ff6b01;background:#fff5eb;border-radius:6px;padding:12px 16px;font-size:12px;line-height:1.6">
      <p style="margin:0">${ESTIMATE_DISCLAIMER}</p>
      <p style="margin:6px 0 0;color:#5e637e">${ESTIMATE_METHOD}</p>
    </div>`;

  const referenteBlock = referente
    ? `<p style="font-size:12px;color:#5e637e;margin:0">Il tuo referente</p>
      <p style="font-size:16px;font-weight:600;margin:2px 0 12px">${escapeHtml(referente.name)}</p>
      <p style="margin:0;font-size:14px">Telefono: <strong>${escapeHtml(referente.phone)}</strong><br/>Email: <strong>${escapeHtml(referente.email)}</strong></p>`
    : "";

  const callbackBlock = callbackRequested
    ? `<p style="background:#eef8f1;border:1px solid #b9dfc4;border-radius:8px;padding:12px;font-size:14px;color:#1d5a33;margin:16px 0 0"><strong>Ricontatto richiesto.</strong> Il referente ti scriverà a questo indirizzo per il preventivo effettivo.</p>`
    : `<p style="font-size:14px;margin:16px 0 0">Vuoi un preventivo effettivo? Richiedi un ricontatto: il referente raccoglierà i dati necessari e valuterà con te garanzie e condizioni.</p>
      ${button(areaUrl, "Chiedi il preventivo effettivo")}`;

  const html = layout(`
      <h1 style="font-size:28px;line-height:1.2;margin:0">Un intervallo orientativo<br/>per la tua RC auto.</h1>
      ${estimateBlock}
      ${estimate ? notice : ""}
      ${hr}
      ${referenteBlock}
      ${callbackBlock}
      ${button(areaUrl, "Entra nella tua area personale", true)}
      ${hr}
      <p style="font-size:12px;color:#5e637e;margin:0">Ricevi questa email per la richiesta di stima ${escapeHtml(id)}. Il consenso commerciale resta distinto dal ricontatto. Per revocarlo: privacy@alcabroker.it.</p>`);

  const text = [
    subject,
    "",
    estimate
      ? `${estimate.min === estimate.max ? "Prezzo" : "Range"} indicativo per il veicolo ${targa}: ${range(estimate)} / anno.`
      : `Al momento non è disponibile una stima per il veicolo ${targa}.`,
    "",
    ESTIMATE_DISCLAIMER,
    ESTIMATE_METHOD,
    "",
    referente
      ? `Il tuo referente: ${referente.name} · ${referente.phone} · ${referente.email}`
      : "",
    callbackRequested
      ? "Ricontatto richiesto: il referente ti scriverà per il preventivo effettivo."
      : `Vuoi un preventivo effettivo? Richiedi un ricontatto dall'area personale.`,
    "",
    `Area personale: ${areaUrl}`,
    "",
    `Richiesta ${id}. Per revocare il consenso commerciale: privacy@alcabroker.it.`,
  ].join("\n");

  return { subject, html, text };
}
