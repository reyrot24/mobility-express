import { button, escapeHtml, firma, hr, layout, multiline, stileEmail } from "./layout.js";

const box = (content) =>
  `<div style="background:#fff5eb;border-radius:12px;padding:20px 24px;margin:24px 0">${content}</div>`;

const riepilogo = (id, targa) =>
  `<p style="font-size:12px;color:#5e637e;margin:0">Richiesta ${escapeHtml(id)} · veicolo ${escapeHtml(targa)}</p>`;

const footer = (id) =>
  `${hr}<p style="font-size:12px;color:#5e637e;margin:0">Ricevi questa email per la richiesta di stima ${escapeHtml(id)}. Se non l'hai fatta tu, ignora questo messaggio o scrivici rispondendo a questa email.</p>`;

const saluto = (nome) => (nome ? `Ciao ${nome},` : "Ciao,");

const OGGETTO = "La tua richiesta è in elaborazione | Polizze Express";
const TITOLO = "La tua richiesta\nè in elaborazione.";

/** Testi della conferma scelti dal referente (configurazione.email.conferma), altrimenti standard. */
function conferma(email) {
  const c = email?.conferma;
  return {
    stile: stileEmail(email),
    subject: c?.oggetto ?? OGGETTO,
    titolo: c?.titolo ?? TITOLO,
    messaggio: c?.messaggio ?? null,
  };
}

const messaggioHtml = (messaggio) =>
  messaggio ? `<p style="font-size:14px;margin:16px 0 0">${multiline(messaggio)}</p>` : "";

// Messaggio e firma del referente nella versione testo
const extraText = (messaggio, stile) => [messaggio, stile.firma].filter(Boolean).flatMap((t) => [t, ""]);

/**
 * Email 1: richiesta ricevuta da un cliente non registrato.
 * Contiene il link per attivare l'area personale: la richiesta passa a devops solo dopo.
 * @param {{nome: string, id: string, targa: string, attivazioneUrl: string, temporaryPassword: string,
 *          email?: object|null}} params email: personalizzazione del referente (configurazione.email)
 */
export function attivazioneEmail({ nome, id, targa, attivazioneUrl, temporaryPassword, email }) {
  const { stile, subject, titolo, messaggio } = conferma(email);

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">${multiline(titolo)}</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua richiesta di stima.</p>
      ${messaggioHtml(messaggio)}
      ${box(riepilogo(id, targa))}
      <p style="font-size:14px;margin:0"><strong>Ultimo passaggio:</strong> attiva la tua area personale. Ci serve per confermare il tuo indirizzo email: appena l’hai attivata prepariamo la stima e ti scriviamo quando è pronta.</p>
      <p style="font-size:14px;margin:12px 0 0">Nell’area personale potrai seguire lo stato delle richieste, vedere i risultati e farne di nuove.</p>
      <p style="font-size:14px;margin:16px 0 0">Password temporanea: <strong>${escapeHtml(temporaryPassword)}</strong></p>
      <p style="font-size:12px;color:#5e637e;margin:6px 0 0">Inseriscila nella pagina di attivazione, poi scegli una nuova password personale.</p>
      ${button(attivazioneUrl, "Attiva la tua area personale", false, stile.accento)}
      <p style="font-size:12px;color:#5e637e;margin:12px 0 0">Il link vale 7 giorni e si può usare una sola volta.</p>
      ${firma(stile)}
      ${footer(id)}`, stile);

  const text = [
    subject,
    "",
    `${saluto(nome)} abbiamo ricevuto la tua richiesta di stima per il veicolo ${targa} (richiesta ${id}).`,
    "",
    ...extraText(messaggio, stile),
    "Ultimo passaggio: attiva la tua area personale per confermare il tuo indirizzo email.",
    "Appena l'hai attivata prepariamo la stima e ti scriviamo quando è pronta.",
    "",
    `Password temporanea: ${temporaryPassword}`,
    "Inseriscila nella pagina di attivazione, poi scegli una nuova password personale.",
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
 * @param {{nome: string, id: string, targa: string, accessoUrl: string, email?: object|null}} params
 */
export function richiestaRicevutaEmail({ nome, id, targa, accessoUrl, email }) {
  const { stile, subject, titolo, messaggio } = conferma(email);

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">${multiline(titolo)}</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua nuova richiesta di stima. Ti scriveremo appena sarà pronta: nel frattempo puoi seguirla dalla tua area personale.</p>
      ${messaggioHtml(messaggio)}
      ${box(riepilogo(id, targa))}
      ${button(accessoUrl, "Entra nella tua area personale", false, stile.accento)}
      ${firma(stile)}
      ${footer(id)}`, stile);

  const text = [
    subject,
    "",
    `${saluto(nome)} abbiamo ricevuto la tua nuova richiesta di stima per il veicolo ${targa} (richiesta ${id}).`,
    "Ti scriveremo appena sarà pronta.",
    "",
    ...extraText(messaggio, stile),
    `Area personale: ${accessoUrl}`,
    "",
    "Se non hai fatto tu questa richiesta, ignora questo messaggio.",
  ].join("\n");

  return { subject, html, text };
}
