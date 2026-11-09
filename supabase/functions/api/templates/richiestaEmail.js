import {
  bloccoReferente, button, escapeHtml, firma, hr, layout, linkDocumenti, multiline, notaServizio,
  notaServizioTesto, referenteTesto, stileEmail,
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
 * Email 1: richiesta ricevuta, da confermare.
 * Nel form il cliente ha già accettato le Condizioni e preso visione dell'informativa: qui trova i link
 * ai documenti e il pulsante "Conferma" verso la pagina personale (token opaco, a scadenza, senza dati
 * nell'URL; password temporanea nel frammento #, compilata dalla pagina). La richiesta parte solo
 * quando preme "Conferma" su quella pagina: aprire il link non basta.
 * @param {{nome: string, id: string, targa: string, attivazioneUrl: string, temporaryPassword: string,
 *          documenti: object, referente?: object|null, email?: object|null}} params
 *        email: personalizzazione del referente (colori, testi, firma, logo)
 */
export function attivazioneEmail({ nome, id, targa, attivazioneUrl, temporaryPassword, documenti, referente, email }) {
  const { stile, subject, titolo, messaggio } = conferma(email, {
    oggetto: OGGETTO_ADESIONE,
    titolo: TITOLO_ADESIONE,
  });

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">${multiline(titolo)}</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua richiesta per il servizio gratuito <strong>“OK, il prezzo è giusto?”</strong> di Alca Broker S.r.l.: una stima indicativa e non vincolante della RC auto e il monitoraggio delle scadenze note.</p>
      ${messaggioHtml(messaggio)}
      ${box(riepilogo(id, targa))}
      <p style="font-size:14px;margin:0"><strong>Conferma per far partire la richiesta.</strong> Ti basta scegliere una password per la tua area personale: la useremo per farti seguire la stima.</p>
      ${button(attivazioneUrl, "Conferma", false, stile.accento)}
      <p style="font-size:12px;color:#5e637e;margin:12px 0 0">Il link è personale, vale 7 giorni e si può usare una sola volta. La richiesta parte solo quando premi “Conferma” sulla pagina.</p>
      ${bloccoReferente(referente)}
      <p style="font-size:13px;margin:24px 0 0">I documenti che hai accettato nel modulo:</p>
      ${linkDocumenti(documenti, stile.accento)}
      <p style="font-size:12px;color:#5e637e;margin:16px 0 0">Se la pagina ti chiede una password temporanea: <strong>${escapeHtml(temporaryPassword)}</strong></p>
      ${firma(stile)}
      ${footer(id)}`, stile);

  const text = [
    subject,
    "",
    `${saluto(nome)} abbiamo ricevuto la tua richiesta per il servizio gratuito "OK, il prezzo è giusto?" di Alca Broker S.r.l. per il veicolo ${targa} (richiesta ${id}).`,
    "",
    ...extraText(messaggio, stile),
    "Conferma per far partire la richiesta: ti basta scegliere una password per la tua area personale.",
    `Conferma: ${attivazioneUrl}`,
    "Il link è personale, vale 7 giorni e si può usare una sola volta.",
    "",
    ...(referente ? [referenteTesto(referente), ""] : []),
    "I documenti che hai accettato nel modulo:",
    `- Condizioni del servizio (versione ${documenti.condizioni.versione}): ${documenti.condizioni.url}`,
    `- Informativa privacy del servizio (versione ${documenti.privacy.versione}): ${documenti.privacy.url}`,
    "",
    `Se la pagina ti chiede una password temporanea: ${temporaryPassword}`,
    "",
    "Se non hai fatto tu questa richiesta, ignora questo messaggio.",
  ].join("\n");

  return { subject, html, text };
}

/**
 * Email 2: richiesta ricevuta da un cliente già registrato. Solo l'accesso all'area personale.
 * @param {{nome: string, id: string, targa: string, accessoUrl: string, servizioUrl: string,
 *          referente?: object|null, email?: object|null}} params
 */
export function richiestaRicevutaEmail({ nome, id, targa, accessoUrl, servizioUrl, referente, email }) {
  const { stile, subject, titolo, messaggio } = conferma(email);

  const html = layout(`
      <h1 style="font-size:26px;line-height:1.2;margin:0">${multiline(titolo)}</h1>
      <p style="font-size:14px;margin:16px 0 0">${escapeHtml(saluto(nome))} abbiamo ricevuto la tua nuova richiesta di stima. Ti scriveremo appena sarà pronta: nel frattempo puoi seguirla dalla tua area personale.</p>
      ${messaggioHtml(messaggio)}
      ${box(riepilogo(id, targa))}
      ${button(accessoUrl, "Entra nella tua area personale", false, stile.accento)}
      ${bloccoReferente(referente)}
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
    ...(referente ? [referenteTesto(referente), ""] : []),
    "Se non hai fatto tu questa richiesta, ignora questo messaggio.",
    notaServizioTesto(servizioUrl),
  ].join("\n");

  return { subject, html, text };
}
