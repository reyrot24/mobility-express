import {
  button, escapeHtml, firma, hr, layout, linkDocumenti, multiline, notaServizio, notaServizioTesto, stileEmail,
} from "./layout.js";

const box = (content) =>
  `<div style="background:#fff5eb;border-radius:12px;padding:20px 24px;margin:24px 0">${content}</div>`;

const riepilogo = (id, targa) =>
  `<p style="font-size:12px;color:#5e637e;margin:0">Richiesta ${escapeHtml(id)} · veicolo ${escapeHtml(targa)}</p>`;

const footer = (id) =>
  `${hr}<p style="font-size:12px;color:#5e637e;margin:0">Ricevi questa email per la richiesta di stima ${escapeHtml(id)}. Se non l'hai fatta tu, ignora questo messaggio o scrivici rispondendo a questa email.</p>`;

const saluto = (nome) => (nome ? `Ciao ${nome},` : "Ciao,");

const OGGETTO = "La tua richiesta è in elaborazione | Polizze Express";
const TITOLO = "La tua richiesta\nè in elaborazione.";

const OGGETTO_ADESIONE = "Conferma la tua richiesta | Polizze Express";
const TITOLO_ADESIONE = "Conferma la tua\nrichiesta di stima.";

/** Testi della conferma scelti dal referente (configurazione.email.conferma), altrimenti standard. */
function conferma(email, standard = { oggetto: OGGETTO, titolo: TITOLO }) {
  const c = email?.conferma;
  return {
    stile: stileEmail(email),
    subject: c?.oggetto ?? standard.oggetto,
    titolo: c?.titolo ?? standard.titolo,
    messaggio: c?.messaggio ?? null,
  };
}

const messaggioHtml = (messaggio) =>
  messaggio ? `<p style="font-size:14px;margin:16px 0 0">${multiline(messaggio)}</p>` : "";

// Messaggio e firma del referente nella versione testo
const extraText = (messaggio, stile) => [messaggio, stile.firma].filter(Boolean).flatMap((t) => [t, ""]);

/**
 * Email 1: richiesta ricevuta, adesione da confermare.
 * Contiene i link ai due documenti e il link personale alla pagina di conferma (token opaco, a scadenza,
 * senza dati del cliente nell'URL). Aprire il link non accetta nulla: si conferma solo sulla pagina.
 * @param {{nome: string, id: string, targa: string, attivazioneUrl: string, temporaryPassword: string,
 *          documenti: object, email?: object|null}} params email: personalizzazione del referente
 */
export function attivazioneEmail({ nome, id, targa, attivazioneUrl, temporaryPassword, documenti, email }) {
  const { stile, subject, titolo, messaggio } = conferma(email, {
    oggetto: OGGETTO_ADESIONE,
    titolo: TITOLO_ADESIONE,
  });

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">${multiline(titolo)}</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua richiesta di aderire al servizio gratuito <strong>“OK, il prezzo è giusto?”</strong> di Alca Broker S.r.l.: una stima indicativa e non vincolante della RC auto e il monitoraggio delle scadenze note.</p>
      ${messaggioHtml(messaggio)}
      ${box(riepilogo(id, targa))}
      <p style="font-size:14px;margin:0"><strong>Prima di confermare, leggi i documenti del servizio:</strong></p>
      ${linkDocumenti(documenti, stile.accento)}
      <p style="font-size:14px;margin:16px 0 0">Poi apri la pagina di conferma: lì potrai accettare le Condizioni e, se vuoi, scegliere separatamente se ricevere comunicazioni commerciali. <strong>Aprire il link non attiva nulla</strong>: il servizio parte solo quando confermi sulla pagina.</p>
      <p style="font-size:14px;margin:16px 0 0">Password temporanea: <strong>${escapeHtml(temporaryPassword)}</strong></p>
      <p style="font-size:12px;color:#5e637e;margin:6px 0 0">Ti verrà chiesta nella pagina di conferma, per verificare che l’email sia tua.</p>
      ${button(attivazioneUrl, "Vai alla pagina di conferma", false, stile.accento)}
      <p style="font-size:12px;color:#5e637e;margin:12px 0 0">Il link è personale, vale 7 giorni e si può usare una sola volta.</p>
      ${firma(stile)}
      ${footer(id)}`, stile);

  const text = [
    subject,
    "",
    `${saluto(nome)} abbiamo ricevuto la tua richiesta di aderire al servizio gratuito "OK, il prezzo è giusto?" di Alca Broker S.r.l. per il veicolo ${targa} (richiesta ${id}).`,
    "",
    ...extraText(messaggio, stile),
    "Prima di confermare, leggi i documenti del servizio:",
    `- Condizioni del servizio (versione ${documenti.condizioni.versione}): ${documenti.condizioni.url}`,
    `- Informativa privacy del servizio (versione ${documenti.privacy.versione}): ${documenti.privacy.url}`,
    "",
    "Aprire il link non attiva nulla: il servizio parte solo quando confermi sulla pagina.",
    "",
    `Password temporanea: ${temporaryPassword}`,
    "",
    `Pagina di conferma: ${attivazioneUrl}`,
    "Il link è personale, vale 7 giorni e si può usare una sola volta.",
    "",
    "Se non hai fatto tu questa richiesta, ignora questo messaggio.",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Email 2: richiesta ricevuta da un cliente già registrato. Solo l'accesso all'area personale.
 * @param {{nome: string, id: string, targa: string, accessoUrl: string, servizioUrl: string,
 *          email?: object|null}} params
 */
export function richiestaRicevutaEmail({ nome, id, targa, accessoUrl, servizioUrl, email }) {
  const { stile, subject, titolo, messaggio } = conferma(email);

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">${multiline(titolo)}</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua nuova richiesta di stima. Ti scriveremo appena sarà pronta: nel frattempo puoi seguirla dalla tua area personale.</p>
      ${messaggioHtml(messaggio)}
      ${box(riepilogo(id, targa))}
      ${button(accessoUrl, "Entra nella tua area personale", false, stile.accento)}
      ${firma(stile)}
      ${footer(id)}
      ${notaServizio(servizioUrl)}`, stile);

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
    notaServizioTesto(servizioUrl),
  ].join("\n");

  return { subject, html, text };
}
