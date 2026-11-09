import { Buffer } from "node:buffer";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { config } from "../config.js";
import {
  claimActivation,
  confermaAdesione,
  createActivation,
  createUser,
  findRichiestaByIdempotencyKey,
  findUserIdByEmail,
  getAdesioneByRichiesta,
  getDocumentiAttivi,
  getProfilo,
  getRichiesta,
  insertAdesione,
  insertRichiesta,
  listRichiesteDaInviare,
  listRichiesteDaRitentare,
  logEmail,
  prenotaInvio,
  readActivation,
  registraEvento,
  releaseActivation,
  riprendiRichiestaInErrore,
  saveRisultato,
  updateConfigurazioneProfilo,
  updateResidenzaProfilo,
  updateRichiesta,
} from "../data/db.js";
import { recordChoices } from "../lib/consensi.js";
import { indirizzoCompleto, isComuneCap } from "../lib/validation.js";
import { inBackground } from "../lib/http.js";
import { EmailBloccataError, sendMail } from "./mailer.js";
import { configurazioneEmail } from "./pagine.js";
import { inviaAPiattaforma } from "./piattaforma.js";
import { DEMO_ESTIMATE, parseStima } from "./stima.js";
import { attivazioneEmail, richiestaRicevutaEmail } from "../templates/richiestaEmail.js";
import { ricontattoEmail } from "../templates/ricontattoEmail.js";
import { stimaEmail } from "../templates/stimaEmail.js";

export const accessoUrl = () => `${config.siteUrl}/prezzo-giusto/accesso`;
export const servizioUrl = () => `${config.siteUrl}/prezzo-giusto/area?sezione=servizio`;
// La password temporanea va nel frammento (#pt=): il browser non lo invia mai ai server (né ai log),
// la pagina la legge e la compila da sola. Così il cliente sceglie solo la sua password.
const attivazioneUrl = (token, temporaryPassword) =>
  `${config.siteUrl}/prezzo-giusto/attiva?token=${encodeURIComponent(token)}` +
  (temporaryPassword ? `#pt=${encodeURIComponent(temporaryPassword)}` : "");
const indirizzo = (r) => indirizzoCompleto(r.tipo_strada, r.strada, r.civico, r.cap, r.comune);

/** Documenti attivi con l'URL pubblico completo, per email e pagina di conferma. */
export async function documentiPubblici() {
  const docs = await getDocumentiAttivi();
  const pubblico = (d) => ({
    id: d.id,
    versione: d.versione,
    data: d.data_versione,
    url: `${config.siteUrl}${d.url_pagina}`,
    pdf: `${config.siteUrl}${d.url_pdf}`,
  });
  return { condizioni: pubblico(docs.condizioni), privacy: pubblico(docs.privacy) };
}

// Comunicazioni di servizio al cliente: partono solo se l'adesione della richiesta è attiva
const EMAIL_DI_SERVIZIO = ["richiesta_ricevuta", "stima"];

/**
 * Invia un'email e ne registra l'esito. Non lancia mai: un invio fallito resta nel registro.
 * Le comunicazioni di servizio si bloccano se l'adesione non è attiva (es. monitoraggio interrotto).
 * @returns {Promise<"inviata"|"fallita"|"bloccata">}
 */
export async function sendAndLog({ tipo, userId, richiestaId, message }) {
  const log = (esito, errore = null) =>
    logEmail({ tipo, user_id: userId, richiesta_id: richiestaId, destinatario: message.to, esito, errore });

  if (EMAIL_DI_SERVIZIO.includes(tipo)) {
    const adesione = richiestaId ? await getAdesioneByRichiesta(richiestaId) : null;
    if (adesione?.stato !== "attiva") {
      const motivo = adesione ? `ADESIONE_${adesione.stato.toUpperCase()}` : "ADESIONE_MANCANTE";
      console.warn(`[richieste] email "${tipo}" bloccata per ${richiestaId}: ${motivo}`);
      await registraEvento({ adesioneId: adesione?.id, richiestaId, tipo: "comunicazione_bloccata", dettagli: { email: tipo, motivo } });
      await log("bloccata", motivo);
      return "bloccata";
    }
  }
  try {
    await sendMail(message);
    await log("inviata");
    return "inviata";
  } catch (err) {
    const bloccata = err instanceof EmailBloccataError;
    console.error(`[richieste] email "${tipo}" ${bloccata ? "bloccata" : "non inviata"} per ${richiestaId}:`, err.message);
    await log(bloccata ? "bloccata" : "fallita", err.message);
    return bloccata ? "bloccata" : "fallita";
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
    version: r.consensi.version,
    recordedAt: r.consensi.recordedAt,
  },
});

// ───────────── 1. Nuova richiesta ─────────────

/** Errore da mostrare al cliente con uno status HTTP (es. documenti cambiati nel frattempo). */
export class ErroreAdesione extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const DOCUMENTI_AGGIORNATI = () =>
  new ErroreAdesione(409, "I documenti del servizio sono stati aggiornati. Ricarica la pagina e rileggili prima di confermare.");

/**
 * Salva la richiesta e l'adesione al servizio. Nel form il cliente prende visione dell'informativa,
 * accetta le Condizioni e sceglie ricontatto e comunicazioni commerciali (registrati con le versioni).
 * - Senza sessione (form pubblico, anche se l'email ha già un account): l'adesione resta "in_attesa"
 *   ed email 1 con i documenti e il link personale. La richiesta parte (devops) solo quando il
 *   cliente preme "Conferma" sulla pagina del link: è la verifica che l'email sia sua.
 * - Cliente in sessione (area personale): identità già verificata, adesione confermata subito e
 *   invio a devops.
 * @param {object} data dati validati del form
 * @param {string|undefined} idempotencyKey
 * @param {{id: string, email: string}|null} sessionUser cliente in sessione (area personale)
 * @param {{debug?: boolean, userAgent?: string}} [options] debug: aspetta devops e aggiunge la sua risposta
 */
export async function creaRichiesta(data, idempotencyKey, sessionUser = null, { debug = false, userAgent } = {}) {
  if (idempotencyKey) {
    const existing = await findRichiestaByIdempotencyKey(idempotencyKey);
    if (existing) return toResponse(existing);
  }

  const documenti = await documentiPubblici();
  if (!data.condizioni)
    throw new ErroreAdesione(400, "Per inviare la richiesta devi accettare le Condizioni del servizio.");
  if (data.documenti.condizioni !== documenti.condizioni.id || data.documenti.privacy !== documenti.privacy.id)
    throw DOCUMENTI_AGGIORNATI();

  const email = sessionUser?.email ?? data.email;
  // Solo per riprendere nome, cognome e referente: senza sessione l'identità va comunque verificata
  const accountId = sessionUser?.id ?? (await findUserIdByEmail(email));
  const profilo = accountId ? await getProfilo(accountId) : null;
  // Cliente registrato: il referral è quello del link con cui ha attivato l'area (anche vuoto)
  const referralId = (profilo ? profilo.referral_id : data.referralId) || null;
  // La configurazione del link vale solo se la richiesta resta al referente di quel link.
  // Dall'area personale (nessun link) vale quella salvata sul profilo, se è dello stesso referente.
  const idConfigurazione =
    (data.referralId === referralId ? data.idConfigurazione || null : null) ??
    (profilo?.id_configurazione && (profilo.referral_id || null) === referralId
      ? profilo.id_configurazione
      : null);
  const now = new Date().toISOString();

  const { richiesta, duplicate } = await insertRichiesta({
    id: "ST-" + randomUUID().slice(0, 8).toUpperCase(),
    user_id: null, // si collega all'account solo con l'adesione confermata
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
    id_configurazione: idConfigurazione,
    stato: "in_attesa_attivazione",
    consensi: recordChoices({ ...data, referralId }, now, {
      privacyDocId: documenti.privacy.id,
      condizioniDocId: documenti.condizioni.id,
    }),
    idempotency_key: idempotencyKey ?? null,
  });
  if (duplicate) return toResponse(richiesta);

  const adesione = await insertAdesione({
    richiesta_id: richiesta.id,
    email,
    targa: richiesta.targa,
    referral_id: referralId,
    id_configurazione: idConfigurazione,
    privacy_doc_id: documenti.privacy.id,
    informativa_resa_at: now,
  });
  await registraEvento({
    adesioneId: adesione.id,
    richiestaId: richiesta.id,
    tipo: "richiesta_ricevuta",
    attore: "cliente",
    dettagli: {
      canale: sessionUser ? "area_personale" : "form_pubblico",
      privacy: documenti.privacy.id,
      condizioni_accettate_nel_form: documenti.condizioni.id,
      ricontatto: data.ricontatto === true,
      marketing: data.marketing === true,
      user_agent: userAgent?.slice(0, 300) ?? null,
    },
  });

  if (sessionUser) {
    await confermaAdesione({
      adesioneId: adesione.id,
      userId: sessionUser.id,
      condizioniDocId: documenti.condizioni.id,
      verifica: "sessione",
      // Spuntato nel form = consenso; non spuntato non revoca quello già dato (si gestisce in "Il servizio")
      marketing: data.marketing === true ? true : null,
      dettagli: { user_agent: userAgent?.slice(0, 300) ?? null },
    });
    const confermata = await getRichiesta(richiesta.id);
    // L'email di conferma parte da inviaADevops, solo se devops accetta la richiesta
    if (debug) return { ...toResponse(confermata), rispostaDevops: await rispostaDevops(richiesta.id) };
    inviaInBackground(richiesta.id);
    return toResponse(confermata);
  }

  const { token, temporaryPassword } = await createActivation(email, richiesta.id);
  const pagina = await configurazioneEmail(richiesta.id_configurazione);
  const referente = referenteEmail(pagina);
  const esito = await sendAndLog({
    tipo: "attivazione",
    userId: null,
    richiestaId: richiesta.id,
    message: {
      to: email,
      ...attivazioneEmail({
        nome: richiesta.nome,
        id: richiesta.id,
        targa: richiesta.targa,
        attivazioneUrl: attivazioneUrl(token, temporaryPassword),
        temporaryPassword,
        documenti,
        referente,
        email: personalizzazione(pagina),
      }),
    },
  });
  await registraEvento({
    adesioneId: adesione.id,
    richiestaId: richiesta.id,
    tipo: esito === "inviata" ? "email_adesione_inviata" : "email_adesione_fallita",
    dettagli: {
      esito,
      condizioni: documenti.condizioni.id,
      privacy: documenti.privacy.id,
      scadenza_link_giorni: 7,
    },
  });

  return toResponse(richiesta);
}

// ───────────── 2. Conferma dell'adesione ─────────────

/** Registra un link non utilizzabile (inesistente, scaduto o già usato). */
async function registraLinkNonValido(motivo, row, contesto) {
  const adesione = row?.richiesta_id ? await getAdesioneByRichiesta(row.richiesta_id) : null;
  await registraEvento({
    adesioneId: adesione?.id,
    richiestaId: row?.richiesta_id ?? null,
    tipo: motivo,
    attore: "cliente",
    dettagli: { contesto },
  });
}

/**
 * Dati per la pagina di conferma, oppure null se il link non è valido.
 * Aprire la pagina non accetta nulla: registra solo l'evento "link_aperto".
 */
export async function datiAttivazione(token) {
  const { activation, motivo, row } = await readActivation(token);
  if (!activation) {
    await registraLinkNonValido(motivo, row, "apertura");
    return null;
  }
  const adesione = activation.richiesta_id ? await getAdesioneByRichiesta(activation.richiesta_id) : null;
  // Link creati prima delle adesioni (senza richiesta) non sono più utilizzabili
  if (adesione?.stato !== "in_attesa") return null;
  await registraEvento({ adesioneId: adesione.id, richiestaId: adesione.richiesta_id, tipo: "link_aperto", attore: "cliente" });

  return {
    email: activation.email,
    temporaryPasswordRequired: Boolean(activation.temporary_password_hash),
    accountEsistente: Boolean(await findUserIdByEmail(activation.email)),
    richiesta: { id: adesione.richiesta_id, targa: adesione.targa },
    documenti: await documentiPubblici(),
    referente: referenteEmail(await configurazioneEmail(adesione.id_configurazione)),
    // Link inviati prima che le Condizioni si accettassero nel form: vanno accettate sulla pagina
    condizioniDaAccettare: !(await getRichiesta(adesione.richiesta_id))?.consensi?.condizioni?.accepted,
  };
}

/**
 * Conferma dalla pagina del link personale ("Conferma"): verifica link e password temporanea
 * (precompilata dal link), crea l'account se manca e registra l'adesione in una transazione
 * (conferma_adesione) con le Condizioni e il marketing scelti nel form. Solo dopo la richiesta
 * parte verso devops. Aprire la pagina non conferma nulla: serve il pulsante.
 * @param {{debug?: boolean, userAgent?: string}} [options]
 * @returns {Promise<{email: string, alreadyRegistered: boolean}|null>} null se il link non è valido
 */
export async function attivaArea(
  token,
  { password, temporaryPassword, condizioniAccettate, documenti: mostrati },
  { debug = false, userAgent } = {}
) {
  const { activation, motivo, row } = await readActivation(token);
  if (!activation) {
    await registraLinkNonValido(motivo, row, "conferma");
    return null;
  }
  const adesione = activation.richiesta_id ? await getAdesioneByRichiesta(activation.richiesta_id) : null;
  if (adesione?.stato !== "in_attesa") return null;
  const rifiuta = (causa) =>
    registraEvento({ adesioneId: adesione.id, richiestaId: adesione.richiesta_id, tipo: "conferma_rifiutata", attore: "cliente", dettagli: { causa } });

  if (activation.temporary_password_hash) {
    const providedHash = createHash("sha256").update(temporaryPassword ?? "").digest();
    const storedHash = Buffer.from(activation.temporary_password_hash, "hex");
    if (storedHash.length !== providedHash.length || !timingSafeEqual(providedHash, storedHash)) {
      await rifiuta("password_temporanea");
      throw new ErroreAdesione(400, "La password temporanea non è corretta.");
    }
  }
  const documenti = await documentiPubblici();
  const richiestaForm = await getRichiesta(adesione.richiesta_id);
  const sceltaForm = richiestaForm?.consensi?.condizioni;
  if (sceltaForm?.accepted) {
    // Condizioni accettate nel form: devono essere ancora quelle in vigore
    if (sceltaForm.documento !== documenti.condizioni.id) {
      await rifiuta("documenti_non_attuali");
      throw new ErroreAdesione(409, "Le Condizioni del servizio sono state aggiornate dopo la tua richiesta. Invia una nuova richiesta dal sito.");
    }
  } else {
    // Link inviati prima che le Condizioni si accettassero nel form: accettazione da questa pagina
    if (!condizioniAccettate) {
      await rifiuta("condizioni_non_accettate");
      throw new ErroreAdesione(400, "Per attivare il servizio devi accettare le Condizioni del servizio.");
    }
    if (mostrati.condizioni !== documenti.condizioni.id || mostrati.privacy !== documenti.privacy.id) {
      await rifiuta("documenti_non_attuali");
      throw DOCUMENTI_AGGIORNATI();
    }
  }
  // Marketing scelto nel form. Non spuntato: "no" per chi crea l'account, nessun cambiamento per chi
  // ce l'ha già (non si revoca un consenso dato in precedenza)
  const marketingForm = richiestaForm?.consensi?.marketing?.granted === true;
  const existingUserId = await findUserIdByEmail(activation.email);
  if (!existingUserId && !password)
    throw new ErroreAdesione(400, "Scegli una password di almeno 12 caratteri.");

  if (!(await claimActivation(token))) {
    await registraLinkNonValido("token_riusato", row, "conferma");
    return null;
  }

  try {
    const richiesta = richiestaForm;
    const userId =
      existingUserId ??
      (
        await createUser({
          email: activation.email,
          password,
          nome: richiesta?.nome ?? "",
          cognome: richiesta?.cognome ?? "",
          cellulare: richiesta?.cellulare ?? "",
          referralId: richiesta?.referral_id ?? null,
        })
      ).userId;
    await confermaAdesione({
      adesioneId: adesione.id,
      userId,
      condizioniDocId: documenti.condizioni.id,
      verifica: "link_email+password_temporanea",
      marketing: marketingForm ? true : existingUserId ? null : false,
      dettagli: {
        user_agent: userAgent?.slice(0, 300) ?? null,
        account_creato: !existingUserId,
        condizioni_accettate_nel_form_at: sceltaForm?.acceptedAt ?? null,
      },
    });
    // Pagina del referente sul profilo: la useranno le richieste fatte dall'area personale
    if (richiesta?.id_configurazione) {
      const profilo = await getProfilo(userId);
      if (profilo && !profilo.id_configurazione && (profilo.referral_id || null) === (richiesta.referral_id || null))
        await updateConfigurazioneProfilo(userId, richiesta.id_configurazione).catch((err) =>
          console.error(`[richieste] configurazione non salvata sul profilo ${userId}:`, err.message)
        );
    }
  } catch (err) {
    await releaseActivation(token);
    throw err;
  }

  const attivata = { email: activation.email, alreadyRegistered: Boolean(existingUserId) };
  if (debug) return { ...attivata, rispostaDevops: await risposteDevops([{ id: adesione.richiesta_id }]) };
  inviaInBackground(adesione.richiesta_id);
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
  // Solo richieste con un'adesione confermata e attiva arrivano a devops
  const adesione = await getAdesioneByRichiesta(id);
  if (adesione?.stato !== "attiva") {
    const motivo = adesione ? `ADESIONE_${adesione.stato.toUpperCase()}` : "ADESIONE_MANCANTE";
    console.warn(`[richieste] ${id} non inviata a devops: ${motivo}`);
    await updateRichiesta(id, {
      stato: adesione?.stato === "cessata" ? "annullata" : "errore",
      errore: motivo,
      invio_avviato_at: null,
      prossimo_tentativo_at: null,
    });
    return undefined;
  }
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
  const pagina = await configurazioneEmail(richiesta.id_configurazione);
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
        servizioUrl: servizioUrl(),
        referente: referenteEmail(pagina),
        email: personalizzazione(pagina),
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
function referenteEmail(pagina) {
  const r = pagina?.referente;
  if (!r?.nome || (!r.telefono && !r.email)) return null;
  return { name: r.nome, role: r.ruolo ?? null, phone: r.telefono ?? "", email: r.email ?? "" };
}

/** Personalizzazione delle email dalla pagina del referente: blocco "email" e logo. */
function personalizzazione(pagina) {
  if (!pagina) return null;
  return { ...(pagina.email ?? {}), logo: pagina.logo ?? null };
}

/**
 * Risultato inviato da devops: salva il prezzo e avvisa il cliente via email.
 * Idempotente: se la richiesta ha già un risultato non invia una seconda email.
 * @param {object} body JSON ricevuto da devops (formato da confermare)
 * @param {object} [estimateOverride] stima già normalizzata (solo simulazione in sviluppo)
 * @returns {Promise<"salvato"|"gia_registrato"|"annullata"|"non_trovata">}
 */
export async function registraRisultato(body, estimateOverride) {
  const richiesta = await getRichiesta(String(body?.richiestaId ?? ""));
  if (!richiesta || !richiesta.user_id) return "non_trovata";
  if (["completata", "non_disponibile"].includes(richiesta.stato)) return "gia_registrato";
  // Monitoraggio interrotto prima dell'invio: nessuna elaborazione successiva
  if (richiesta.stato === "annullata") return "annullata";

  const estimate = estimateOverride ?? parseStima(body);
  const residenza = residenzaDaRisultato(body, richiesta.id);
  if (estimate)
    await saveRisultato({
      richiesta_id: richiesta.id,
      compagnia: estimate.company,
      prezzo: estimate.prezzo,
    });
  await updateRichiesta(richiesta.id, {
    stato: estimate ? "completata" : "non_disponibile",
    errore: null,
    ...(residenza ?? {}),
  });
  if (residenza) await aggiornaResidenzaProfilo(richiesta.user_id, residenza);

  const pagina = await configurazioneEmail(richiesta.id_configurazione);
  const documenti = await documentiPubblici();
  const esito = await sendAndLog({
    tipo: "stima",
    userId: richiesta.user_id,
    richiestaId: richiesta.id,
    message: {
      to: richiesta.email,
      ...stimaEmail({
        id: richiesta.id,
        targa: richiesta.targa,
        estimate,
        referente: referenteEmail(pagina),
        callbackRequested: richiesta.consensi.callback.granted,
        areaUrl: accessoUrl(),
        servizioUrl: servizioUrl(),
        condizioniUrl: documenti.condizioni.url,
        email: personalizzazione(pagina),
      }),
    },
  });
  if (esito === "inviata") {
    const adesione = await getAdesioneByRichiesta(richiesta.id);
    await registraEvento({
      adesioneId: adesione?.id,
      richiestaId: richiesta.id,
      tipo: estimate ? "stima_inviata" : "stima_non_disponibile",
      dettagli: estimate ? { min: estimate.min, max: estimate.max, demo: estimate.demo } : null,
    });
  }
  return "salvato";
}

/**
 * Comune e CAP del cliente restituiti da devops con il risultato ("comune", "cap").
 * Il form non li chiede più: si salvano sulla richiesta e sul profilo. Valori assenti o non
 * validi vengono ignorati senza bloccare la stima.
 */
function residenzaDaRisultato(body, richiestaId) {
  const comune = typeof body?.comune === "string" ? body.comune.trim() : "";
  const cap = typeof body?.cap === "string" || typeof body?.cap === "number" ? String(body.cap).trim() : "";
  if (!comune && !cap) return null;
  if (!isComuneCap(comune, cap)) {
    console.warn(`[devops] risultato ${richiestaId}: comune/CAP ignorati, non validi:`, JSON.stringify({ comune, cap }));
    return null;
  }
  return { comune, cap };
}

/** Il profilo si aggiorna dopo la richiesta: un errore qui non deve far ripetere il webhook. */
async function aggiornaResidenzaProfilo(userId, residenza) {
  try {
    await updateResidenzaProfilo(userId, residenza);
  } catch (err) {
    console.error(`[devops] residenza non salvata sul profilo ${userId}:`, err.message);
  }
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
  const referente = referenteEmail(await configurazioneEmail(richiesta.id_configurazione));
  const to = referente?.email || config.callbackFallbackEmail;
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
