import { Buffer } from "node:buffer";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
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
  listRichiesteDaRitentare,
  logEmail,
  prenotaInvio,
  releaseActivation,
  riprendiRichiestaInErrore,
  saveRisultato,
  updateRichiesta,
} from "../data/db.js";
import { recordChoices } from "../lib/consensi.js";
import { inBackground } from "../lib/http.js";
import { sendMail } from "./mailer.js";
import { configurazioneEmail } from "./pagine.js";
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
 * - Cliente registrato (o in sessione): richiesta collegata all'account, invio a devops
 *   ed email 2 solo se devops la accetta.
 * - Cliente non registrato: richiesta salvata solo in "richieste", email 1 con il link
 *   per attivare l'area personale. Devops viene contattato solo dopo l'attivazione.
 * @param {object} data dati validati del form
 * @param {string|undefined} idempotencyKey
 * @param {{id: string, email: string}|null} sessionUser cliente in sessione (area personale)
 * @param {{debug?: boolean}} [options] debug: aspetta devops e aggiunge la sua risposta (campo rispostaDevops)
 */
export async function creaRichiesta(data, idempotencyKey, sessionUser = null, { debug = false } = {}) {
  if (idempotencyKey) {
    const existing = await findRichiestaByIdempotencyKey(idempotencyKey);
    if (existing) return toResponse(existing);
  }

  const email = sessionUser?.email ?? data.email;
  const userId = sessionUser?.id ?? (await findUserIdByEmail(email));
  // Per un cliente registrato usiamo i dati del profilo, non quelli digitati ora
  const profilo = userId ? await getProfilo(userId) : null;
  // Cliente registrato: il referral è quello del link con cui ha attivato l'area (anche vuoto)
  const referralId = (profilo ? profilo.referral_id : data.referralId) || null;
  const now = new Date().toISOString();

  const { richiesta, duplicate } = await insertRichiesta({
    id: "ST-" + randomUUID().slice(0, 8).toUpperCase(),
    user_id: userId,
    email,
    nome: profilo?.nome || data.nome,
    cognome: profilo?.cognome || data.cognome,
    cellulare: profilo?.cellulare || data.cellulare,
    targa: data.targa,
    tipo_strada: data.tipoStrada,
    strada: data.strada,
    civico: data.civico,
    comune: data.comune,
    cap: data.cap,
    referral_id: referralId,
    stato: userId ? "in_elaborazione" : "in_attesa_attivazione",
    consensi: recordChoices({ ...data, referralId }, now),
    idempotency_key: idempotencyKey ?? null,
  });
  if (duplicate) return toResponse(richiesta);

  if (userId) {
    // L'email di conferma parte da inviaADevops, solo se devops accetta la richiesta
    if (debug) return { ...toResponse(richiesta), rispostaDevops: await rispostaDevops(richiesta.id) };
    inviaInBackground(richiesta.id);
  } else {
    const { token, temporaryPassword } = await createActivation(email);
    const pagina = await configurazioneEmail(referralId);
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
          temporaryPassword,
          email: pagina?.email,
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
  return {
    email: activation.email,
    temporaryPasswordRequired: Boolean(activation.temporary_password_hash),
  };
}

/**
 * Attiva l'area personale: crea utente e profilo con i dati dell'ultima richiesta,
 * collega le richieste in attesa e le invia a devops.
 * @param {{debug?: boolean}} [options] debug: aspetta devops e aggiunge le sue risposte per id (campo rispostaDevops)
 * @returns {Promise<{email: string, alreadyRegistered: boolean}|null>} null se il link non è valido
 */
export async function attivaArea(token, { password, temporaryPassword }, { debug = false } = {}) {
  const activation = await findActivation(token);
  if (!activation) return null;
  if (activation.temporary_password_hash) {
    const providedHash = createHash("sha256").update(temporaryPassword ?? "").digest();
    const storedHash = Buffer.from(activation.temporary_password_hash, "hex");
    if (storedHash.length !== providedHash.length || !timingSafeEqual(providedHash, storedHash))
      throw new Error("PASSWORD_TEMPORANEA_NON_VALIDA");
  }
  if (!(await claimActivation(token))) return null;

  let result;
  try {
    // Dati e referente dell'ultima richiesta diventano quelli del profilo
    const ultima = await findUltimaRichiestaInAttesa(activation.email);
    result = await createUser({
      email: activation.email,
      password,
      nome: ultima?.nome ?? "",
      cognome: ultima?.cognome ?? "",
      cellulare: ultima?.cellulare ?? "",
      referralId: ultima?.referral_id ?? null,
    });
  } catch (err) {
    await releaseActivation(token);
    throw err;
  }

  const collegate = await linkRichiesteInAttesa(activation.email, result.userId);
  const attivata = { email: activation.email, alreadyRegistered: !result.created };
  if (debug) return { ...attivata, rispostaDevops: await risposteDevops(collegate) };
  for (const r of collegate) inviaInBackground(r.id);
  return attivata;
}

// ───────────── 3. Invio a devops ─────────────

// Attese tra un tentativo fallito e il successivo. Esauriti i tentativi la richiesta
// resta in errore: si ritenta chiamando /interno/tentativi con {"tutte": true}.
const ATTESE_TENTATIVI_MS = [1, 5, 15, 60, 180, 360, 720, 1440].map((min) => min * 60 * 1000);

// Senza URL di devops ogni tentativo fallirebbe: inutile consumarli.
const devopsRaggiungibile = () => Boolean(config.externalApi.url) || config.simulateDevops;

/** Invia dopo aver risposto al browser. Se la funzione si interrompe, riprende pg_cron. */
function inviaInBackground(id) {
  inBackground(
    inviaADevops(id).catch((err) =>
      console.error(`[richieste] invio ${id} a devops non riuscito:`, err.message)
    )
  );
}

/**
 * Invia e restituisce la risposta di devops così com'è, anche se è un errore.
 * null se devops non ha risposto (timeout, rete) o se l'invio è stato saltato: il motivo è nei log
 * e nella colonna richieste.errore.
 */
async function rispostaDevops(id) {
  try {
    return (await inviaADevops(id)) ?? null;
  } catch (err) {
    console.error(`[richieste] invio ${id} a devops non riuscito:`, err.message);
    return err.risposta ?? null;
  }
}

/** Risposte di devops per più richieste, indicizzate per id. */
async function risposteDevops(richieste) {
  const risposte = await Promise.all(richieste.map((r) => rispostaDevops(r.id)));
  return Object.fromEntries(richieste.map((r, i) => [r.id, risposte[i]]));
}

/**
 * Invia la richiesta a devops con i dati del form e il codice referente.
 * Il risultato arriva dopo, quando devops chiama POST /devops/risultati.
 * @returns {Promise<object|null|undefined>} la risposta di devops (null se simulata), undefined se saltata
 */
async function inviaADevops(id) {
  const richiesta = await prenotaInvio(id);
  if (!richiesta) return undefined;
  const profilo = richiesta.user_id ? await getProfilo(richiesta.user_id) : null;

  let risposta;
  try {
    // JSON inviato all'API devops: i dati del form della richiesta
    risposta = await inviaAPiattaforma({
      richiesta_id: richiesta.id,
      data_richiesta: richiesta.created_at,
      // Il profilo ha la precedenza: nome e cognome si possono completare dopo la richiesta
      nome: profilo?.nome || richiesta.nome,
      cognome: profilo?.cognome || richiesta.cognome,
      email: richiesta.email,
      cellulare: profilo?.cellulare || richiesta.cellulare || null,
      targa: richiesta.targa,
      tipo_strada: richiesta.tipo_strada,
      strada: richiesta.strada,
      civico: richiesta.civico,
      comune: richiesta.comune,
      cap: richiesta.cap,
      indirizzo: indirizzo(richiesta),
      referral_id: richiesta.referral_id ?? "",
      providerCode: "POLIZZAEXPRESS",
    });
  } catch (err) {
    const tentativi = (richiesta.tentativi_devops ?? 0) + 1;
    const attesa = ATTESE_TENTATIVI_MS[tentativi - 1];
    await updateRichiesta(richiesta.id, {
      stato: "errore",
      errore: err.message,
      invio_avviato_at: null,
      tentativi_devops: tentativi,
      prossimo_tentativo_at: attesa ? new Date(Date.now() + attesa).toISOString() : null,
    });
    throw err;
  }
  // Fuori dal try: se questo aggiornamento fallisce la richiesta non va reinviata
  await updateRichiesta(richiesta.id, {
    inviata_devops_at: new Date().toISOString(),
    errore: null,
    prossimo_tentativo_at: null,
  });

  // Arriviamo qui solo se devops ha risposto con status 1: in caso di errore nessuna email
  const pagina = await configurazioneEmail(richiesta.referral_id);
  await sendAndLog({
    tipo: "richiesta_ricevuta",
    userId: richiesta.user_id,
    richiestaId: richiesta.id,
    message: {
      to: richiesta.email,
      ...richiestaRicevutaEmail({
        nome: richiesta.nome,
        id: richiesta.id,
        targa: richiesta.targa,
        accessoUrl: accessoUrl(),
        email: pagina?.email,
      }),
    },
  });

  // Il ricontatto parte solo per richieste confermate (cliente registrato o attivato)
  if (richiesta.consensi.callback.granted) await notifyReferente(richiesta);

  if (config.simulateDevops) {
    console.warn(`[richieste] devops simulato: risultato dimostrativo per ${richiesta.id} tra 2 secondi.`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await registraRisultato(
      { richiestaId: richiesta.id, referral_id: richiesta.referral_id },
      DEMO_ESTIMATE
    ).catch((err) => console.error("[richieste] risultato simulato non salvato:", err.message));
  }
  return risposta;
}

/**
 * Chiamata ogni minuto da pg_cron: ritenta le richieste in errore il cui tentativo è dovuto
 * e invia quelle mai partite o rimaste a metà (funzione interrotta durante l'invio).
 * @param {boolean} tutte true per ritentare subito tutte le richieste in errore
 * @returns {Promise<Record<string, unknown>>} la risposta di devops per ogni richiesta inviata
 */
export async function elaboraTentativi(tutte = false) {
  if (devopsRaggiungibile()) {
    const inErrore = await listRichiesteDaRitentare(tutte ? null : new Date().toISOString());
    for (const r of inErrore) await riprendiRichiestaInErrore(r.id);
  } else {
    console.warn("[richieste] EXTERNAL_API_URL non impostato: le richieste in errore non vengono ritentate.");
  }

  const daInviare = await listRichiesteDaInviare();
  if (daInviare.length) console.log(`[richieste] invio a devops di ${daInviare.length} richieste`);
  return risposteDevops(daInviare);
}

/**
 * Rilancia subito una sola richiesta in errore (o mai partita), senza toccare le altre.
 * @returns {Promise<Record<string, unknown>|null>} la risposta di devops per id,
 *   null se la richiesta non esiste, non è collegata a un account o è già arrivata a devops
 */
export async function rilanciaRichiesta(id) {
  const richiesta = await getRichiesta(id);
  if (!richiesta?.user_id || richiesta.inviata_devops_at) return null;
  if (!["errore", "in_elaborazione"].includes(richiesta.stato)) return null;
  if (richiesta.stato === "errore") await riprendiRichiestaInErrore(id);
  return { [id]: await rispostaDevops(id) };
}

// ───────────── 4. Risultato da devops ─────────────

/** Contatti del referente nell'email della stima: quelli della sua pagina, altrimenti quelli noti al server. */
function referenteEmail(referralId, pagina) {
  const noto = findReferente(referralId);
  const r = pagina?.referente;
  if (!r?.nome || (!r.telefono && !r.email)) return noto;
  return { name: r.nome, phone: r.telefono ?? noto?.phone ?? "", email: r.email ?? noto?.email ?? "" };
}

/**
 * Risultato inviato da devops: salva il prezzo e avvisa il cliente via email.
 * Idempotente: se la richiesta ha già un risultato non invia una seconda email.
 * @param {object} body JSON ricevuto da devops (formato da confermare)
 * @param {object} [estimateOverride] stima già normalizzata (solo simulazione in sviluppo)
 * @returns {Promise<"salvato"|"gia_registrato"|"non_trovata">}
 */
export async function registraRisultato(body, estimateOverride) {
  const richiesta = await getRichiesta(String(body?.richiestaId ?? ""));
  if (!richiesta || !richiesta.user_id) return "non_trovata";
  if (["completata", "non_disponibile"].includes(richiesta.stato)) return "gia_registrato";

  const estimate = estimateOverride ?? parseStima(body);
  if (estimate)
    await saveRisultato({
      richiesta_id: richiesta.id,
      compagnia: estimate.company,
      prezzo: estimate.min,
    });
  await updateRichiesta(richiesta.id, {
    stato: estimate ? "completata" : "non_disponibile",
    errore: null,
  });

  const pagina = await configurazioneEmail(richiesta.referral_id);
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
        referente: referenteEmail(richiesta.referral_id, pagina),
        callbackRequested: richiesta.consensi.callback.granted,
        areaUrl: accessoUrl(),
        email: pagina?.email,
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
