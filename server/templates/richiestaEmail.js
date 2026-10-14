import { button, escapeHtml, hr, layout } from "./layout.js";

const box = (content) =>
  `<div style="background:#fff5eb;border-radius:12px;padding:20px 24px;margin:24px 0">${content}</div>`;

const riepilogo = (id, targa) =>
  `<p style="font-size:12px;color:#5e637e;margin:0">Richiesta ${escapeHtml(id)} · veicolo ${escapeHtml(targa)}</p>`;

const footer = (id) =>
  `${hr}<p style="font-size:12px;color:#5e637e;margin:0">Ricevi questa email per la richiesta di stima ${escapeHtml(id)}. Se non l'hai fatta tu, ignora questo messaggio o scrivici rispondendo a questa email.</p>`;

const saluto = (nome) => (nome ? `Ciao ${nome},` : "Ciao,");

/**
 * Email 1: richiesta ricevuta da un cliente non registrato.
 * Contiene il link per attivare l'area personale: la richiesta passa a devops solo dopo.
 * @param {{nome: string, id: string, targa: string, attivazioneUrl: string}} params
 */
export function attivazioneEmail({ nome, id, targa, attivazioneUrl }) {
  const subject = "La tua richiesta è in elaborazione | Polizze Express";

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">La tua richiesta<br/>è in elaborazione.</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua richiesta di stima.</p>
      ${box(riepilogo(id, targa))}
      <p style="font-size:14px;margin:0"><strong>Ultimo passaggio:</strong> attiva la tua area personale. Ci serve per confermare il tuo indirizzo email: appena l’hai attivata prepariamo la stima e ti scriviamo quando è pronta.</p>
      <p style="font-size:14px;margin:12px 0 0">Nell’area personale potrai seguire lo stato delle richieste, vedere i risultati e farne di nuove.</p>
      ${button(attivazioneUrl, "Attiva la tua area personale")}
      <p style="font-size:12px;color:#5e637e;margin:12px 0 0">Il link vale 7 giorni e si può usare una sola volta.</p>
      ${footer(id)}`);

  const text = [
    subject,
    "",
    `${saluto(nome)} abbiamo ricevuto la tua richiesta di stima per il veicolo ${targa} (richiesta ${id}).`,
    "",
    "Ultimo passaggio: attiva la tua area personale per confermare il tuo indirizzo email.",
    "Appena l'hai attivata prepariamo la stima e ti scriviamo quando è pronta.",
    "",
    `Attiva l'area personale: ${attivazioneUrl}`,
    "Il link vale 7 giorni e si può usare una sola volta.",
    "",
    "Se non hai fatto tu questa richiesta, ignora questo messaggio.",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Email 2: richiesta ricevuta da un cliente già registrato. Solo l'accesso all'area personale.
 * @param {{nome: string, id: string, targa: string, accessoUrl: string}} params
 */
export function richiestaRicevutaEmail({ nome, id, targa, accessoUrl }) {
  const subject = "La tua richiesta è in elaborazione | Polizze Express";

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">La tua richiesta<br/>è in elaborazione.</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua nuova richiesta di stima. Ti scriveremo appena sarà pronta: nel frattempo puoi seguirla dalla tua area personale.</p>
      ${box(riepilogo(id, targa))}
      ${button(accessoUrl, "Entra nella tua area personale")}
      ${footer(id)}`);

  const text = [
    subject,
    "",
    `${saluto(nome)} abbiamo ricevuto la tua nuova richiesta di stima per il veicolo ${targa} (richiesta ${id}).`,
    "Ti scriveremo appena sarà pronta.",
    "",
    `Area personale: ${accessoUrl}`,
    "",
    "Se non hai fatto tu questa richiesta, ignora questo messaggio.",
  ].join("\n");

  return { subject, html, text };
}
