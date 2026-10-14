import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import { findReferente } from "../data/referenti.js";
import {
  claimActivation,
  createActivation,
  createUser,
  findActivation,
  findRichiestaByIdempotencyKey,
  findUltimaRichiestaInAttesa,
  findUserIdByEmail,
  getProfilo,
  getRichiesta,
  insertRichiesta,
  linkRichiesteInAttesa,
  listRichiesteDaInviare,
  logEmail,
  releaseActivation,
  saveRisultato,
  updateRichiesta,
} from "../data/db.js";
import { recordChoices } from "../lib/consensi.js";
import { sendMail } from "./mailer.js";
import { inviaAPiattaforma } from "./piattaforma.js";
import { DEMO_ESTIMATE, parseStima } from "./stima.js";
import { attivazioneEmail, richiestaRicevutaEmail } from "../templates/richiestaEmail.js";
import { ricontattoEmail } from "../templates/ricontattoEmail.js";
import { stimaEmail } from "../templates/stimaEmail.js";

const accessoUrl = () => `${config.siteUrl}/prezzo-giusto/accesso`;
const attivazioneUrl = (token) =>
  `${config.siteUrl}/prezzo-giusto/attiva?token=${encodeURIComponent(token)}`;
const indirizzo = (r) => `${r.tipo_strada} ${r.strada} ${r.civico}, ${r.cap} ${r.comune}`;

/** Invia un'email e ne registra l'esito. Non lancia mai: un invio fallito resta nel registro. */
async function sendAndLog({ tipo, userId, richiestaId, message }) {
  try {
    await sendMail(message);
    await logEmail({ tipo, user_id: userId, richiesta_id: richiestaId, destinatario: message.to, esito: "inviata" });
  } catch (err) {
    console.error(`[richieste] email "${tipo}" non inviata per ${richiestaId}:`, err.message);
    await logEmail({
      tipo, user_id: userId, richiesta_id: richiestaId, destinatario: message.to,
      esito: "fallita", errore: err.message,
    });
  }
}

/** Dati restituiti al browser: mai colonne tecniche (errore, idempotency_key, user_id). */
export const toResponse = (r) => ({
  id: r.id,
  stato: r.stato,
  data: r.created_at,
  consensi: {
    privacyAcknowledged: true,
    callback: {
      granted: r.consensi.callback.granted,
      requestedAt: r.consensi.callback.requestedAt,
    },
    marketing: { granted: r.consensi.marketing.granted },
    version: r.consensi.version,
    recordedAt: r.consensi.recordedAt,
  },
});

// ───────────── 1. Nuova richiesta ─────────────

/**
 * Salva la richiesta e avvisa il cliente.
 * - Cliente registrato (o in sessione): richiesta collegata all'account, email 2, invio a devops.
 * - Cliente non registrato: richiesta salvata solo in "richieste", email 1 con il link
 *   per attivare l'area personale. Devops viene contattato solo dopo l'attivazione.
 * @param {object} data dati validati del form
 * @param {string|undefined} idempotencyKey
 * @param {{id: string, email: string}|null} sessionUser cliente in sessione (area personale)
 */
export async function creaRichiesta(data, idempotencyKey, sessionUser = null) {
  if (idempotencyKey) {
    const existing = await findRichiestaByIdempotencyKey(idempotencyKey);
    if (existing) return toResponse(existing);
  }

  const email = sessionUser?.email ?? data.email;
  const userId = sessionUser?.id ?? (await findUserIdByEmail(email));
  // Per un cliente registrato usiamo i dati del profilo, non quelli digitati ora
  const profilo = userId ? await getProfilo(userId) : null;
  const now = new Date().toISOString();

  const { richiesta, duplicate } = await insertRichiesta({
    id: "ST-" + randomUUID().slice(0, 8).toUpperCase(),
    user_id: userId,
    email,
    nome: profilo?.nome || data.nome,
    cognome: profilo?.cognome || data.cognome,
    targa: data.targa,
    tipo_strada: data.tipoStrada,
    strada: data.strada,
    civico: data.civico,
    comune: data.comune,
    cap: data.cap,
    referral_id: data.referralId,
    stato: userId ? "in_elaborazione" : "in_attesa_attivazione",
    consensi: recordChoices(data, now),
    idempotency_key: idempotencyKey ?? null,
  });
  if (duplicate) return toResponse(richiesta);

  if (userId) {
    await sendAndLog({
      tipo: "richiesta_ricevuta",
      userId,
      richiestaId: richiesta.id,
      message: {
        to: email,
        ...richiestaRicevutaEmail({
          nome: richiesta.nome,
          id: richiesta.id,
          targa: richiesta.targa,
          accessoUrl: accessoUrl(),
        }),
      },
    });
    inviaInBackground(richiesta.id);
  } else {
    const token = await createActivation(email);
    await sendAndLog({
      tipo: "attivazione",
      userId: null,
      richiestaId: richiesta.id,
      message: {
        to: email,
        ...attivazioneEmail({
          nome: richiesta.nome,
          id: richiesta.id,
          targa: richiesta.targa,
          attivazioneUrl: attivazioneUrl(token),
        }),
      },
    });
  }

  return toResponse(richiesta);
}

// ───────────── 2. Attivazione dell'area personale ─────────────

/** Dati per precompilare il form di attivazione, oppure null se il link non è valido. */
export async function datiAttivazione(token) {
  const activation = await findActivation(token);
  if (!activation) return null;
  const ultima = await findUltimaRichiestaInAttesa(activation.email);
  return {
    email: activation.email,
    nome: ultima?.nome ?? "",
    cognome: ultima?.cognome ?? "",
  };
}

/**
 * Attiva l'area personale: crea utente e profilo, collega le richieste in attesa
 * e le invia a devops.
 * @returns {Promise<{email: string, alreadyRegistered: boolean}|null>} null se il link non è valido
 */
export async function attivaArea(token, { nome, cognome, cellulare, password }) {
  const activation = await findActivation(token);
  if (!activation || !(await claimActivation(token))) return null;

  let result;
  try {
    // Il referente dell'ultima richiesta diventa il referente del profilo
    const ultima = await findUltimaRichiestaInAttesa(activation.email);
    result = await createUser({
      email: activation.email,
      password,
      nome,
      cognome,
      cellulare,
      referralId: ultima?.referral_id ?? null,
    });
  } catch (err) {
    await releaseActivation(token);
    throw err;
  }

  const collegate = await linkRichiesteInAttesa(activation.email, result.userId);
  for (const r of collegate) inviaInBackground(r.id);
  return { email: activation.email, alreadyRegistered: !result.created };
}

// ───────────── 3. Invio a devops ─────────────

// Richieste in invio in questo processo: evita di inviare due volte la stessa.
const inCorso = new Set();

function inviaInBackground(id) {
  if (inCorso.has(id)) return;
  inCorso.add(id);
  inviaADevops(id)
    .catch((err) => console.error(`[richieste] invio ${id} a devops non riuscito:`, err.message))
    .finally(() => inCorso.delete(id));
}

/**
 * Invia la richiesta a devops con i dati del form e il codice referente.
 * Il risultato arriva dopo, quando devops chiama POST /api/devops/risultati.
 */
async function inviaADevops(id) {
  const richiesta = await getRichiesta(id);
  if (!richiesta || richiesta.stato !== "in_elaborazione" || richiesta.inviata_devops_at) return;
  const profilo = richiesta.user_id ? await getProfilo(richiesta.user_id) : null;

  try {
    // JSON inviato all'API devops: i dati del form della richiesta
    await inviaAPiattaforma({
      richiesta_id: richiesta.id,
      data_richiesta: richiesta.created_at,
      nome: richiesta.nome,
      cognome: richiesta.cognome,
      email: richiesta.email,
      cellulare: profilo?.cellulare || null,
      targa: richiesta.targa,
      tipo_strada: richiesta.tipo_strada,
      strada: richiesta.strada,
      civico: richiesta.civico,
      comune: richiesta.comune,
      cap: richiesta.cap,
      indirizzo: indirizzo(richiesta),
      referral_id: richiesta.referral_id,
    });
    await updateRichiesta(richiesta.id, {
      inviata_devops_at: new Date().toISOString(),
      errore: null,
    });
  } catch (err) {
    // TODO: ritentare automaticamente le richieste in errore
    await updateRichiesta(richiesta.id, { stato: "errore", errore: err.message });
    throw err;
  }

  // Il ricontatto parte solo per richieste confermate (cliente registrato o attivato)
  if (richiesta.consensi.callback.granted) await notifyReferente(richiesta);

  if (config.simulateDevops) {
    console.warn(`[richieste] devops simulato: risultato dimostrativo per ${richiesta.id} tra 2 secondi.`);
    setTimeout(
      () =>
        registraRisultato({ richiesta_id: richiesta.id, referral_id: richiesta.referral_id }, DEMO_ESTIMATE)
          .catch((err) => console.error("[richieste] risultato simulato non salvato:", err.message)),
      2000
    ).unref();
  }
}

/**
 * All'avvio riprende le richieste confermate ma non ancora inviate a devops
 * (server riavviato a metà). Con una sola istanza non c'è rischio di doppio invio.
 */
export async function riprendiRichiestePendenti() {
  const pendenti = await listRichiesteDaInviare();
  if (pendenti.length) console.log(`[richieste] invio a devops ${pendenti.length} richieste in sospeso`);
  for (const r of pendenti) inviaInBackground(r.id);
}

// ───────────── 4. Risultato da devops ─────────────

/**
 * Risultato inviato da devops: salva il prezzo e avvisa il cliente via email.
 * Idempotente: se la richiesta ha già un risultato non invia una seconda email.
 * @param {object} body JSON ricevuto da devops (formato da confermare)
 * @param {object} [estimateOverride] stima già normalizzata (solo simulazione in sviluppo)
 * @returns {Promise<"salvato"|"gia_registrato"|"non_trovata">}
 */
export async function registraRisultato(body, estimateOverride) {
  const richiesta = await getRichiesta(String(body?.richiesta_id ?? ""));
  if (!richiesta || !richiesta.user_id) return "non_trovata";
  if (["completata", "non_disponibile"].includes(richiesta.stato)) return "gia_registrato";

  const estimate = estimateOverride ?? parseStima(body);
  if (estimate)
    await saveRisultato({
      richiesta_id: richiesta.id,
      prezzo_min: estimate.min,
      prezzo_max: estimate.max,
      valuta: estimate.currency,
      fonte: estimate.referenceSource ?? null,
      demo: estimate.demo,
      dettagli: body,
    });
  await updateRichiesta(richiesta.id, {
    stato: estimate ? "completata" : "non_disponibile",
    errore: null,
  });

  await sendAndLog({
    tipo: "stima",
    userId: richiesta.user_id,
    richiestaId: richiesta.id,
    message: {
      to: richiesta.email,
      ...stimaEmail({
        id: richiesta.id,
        targa: richiesta.targa,
        estimate,
        referente: findReferente(richiesta.referral_id),
        callbackRequested: richiesta.consensi.callback.granted,
        areaUrl: accessoUrl(),
      }),
    },
  });
  return "salvato";
}

// ───────────── Ricontatto ─────────────

/**
 * Ricontatto richiesto dal cliente autenticato. Non modifica il consenso marketing.
 * @returns {Promise<string|null>} data della richiesta di ricontatto, null se non è sua
 */
export async function richiediRicontatto(id, user) {
  const richiesta = await getRichiesta(id);
  if (!richiesta || richiesta.user_id !== user.id) return null;
  if (richiesta.consensi.callback.granted) return richiesta.consensi.callback.requestedAt;

  const requestedAt = new Date().toISOString();
  const updated = await updateRichiesta(id, {
    consensi: {
      ...richiesta.consensi,
      callback: { ...richiesta.consensi.callback, granted: true, requestedAt },
    },
  });
  await notifyReferente(updated);
  return requestedAt;
}

/** Avvisa via email il referente (o l'indirizzo di riserva) della richiesta di ricontatto. */
async function notifyReferente(richiesta) {
  const referente = findReferente(richiesta.referral_id);
  const to = referente?.email ?? config.callbackFallbackEmail;
  if (!to) {
    console.warn(
      `[richieste] ricontatto ${richiesta.id} senza destinatario: imposta RICONTATTO_FALLBACK_EMAIL`
    );
    return;
  }
  await sendAndLog({
    tipo: "ricontatto",
    userId: richiesta.user_id,
    richiestaId: richiesta.id,
    message: {
      to,
      replyTo: richiesta.email,
      ...ricontattoEmail({
        richiesta: {
          id: richiesta.id,
          email: richiesta.email,
          targa: richiesta.targa,
          indirizzo: indirizzo(richiesta),
          referralId: richiesta.referral_id,
          consents: richiesta.consensi,
        },
        referenteName: referente?.name ?? null,
      }),
    },
  });
}
