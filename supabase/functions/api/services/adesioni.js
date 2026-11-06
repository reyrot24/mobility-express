import {
  annullaRichiestaNonInviata,
  cessaAdesioneAttiva,
  getAdesioneByRichiesta,
  getMarketingAttuale,
  insertConsensoMarketing,
  listAdesioniUtente,
  registraEvento,
} from "../data/db.js";
import { MARKETING_TEXT } from "../lib/consensi.js";
import { cessazioneEmail } from "../templates/cessazioneEmail.js";
import { accessoUrl, documentiPubblici, sendAndLog } from "./richieste.js";

// "Gestisci servizio / Interrompi monitoraggio" dell'area personale e cessazione da devops.

/** Adesioni del cliente, consenso marketing attuale e documenti in vigore. */
export async function statoServizio(user) {
  const [adesioni, marketing, documenti] = await Promise.all([
    listAdesioniUtente(user.id),
    getMarketingAttuale(user.email),
    documentiPubblici(),
  ]);
  return {
    adesioni: adesioni.map((a) => ({
      id: a.id,
      richiestaId: a.richiesta_id,
      targa: a.targa,
      stato: a.stato,
      attivataIl: a.condizioni_accettate_at,
      condizioni: a.condizioni_doc_id,
      privacy: a.privacy_doc_id,
      cessataIl: a.cessata_at,
    })),
    marketing: { granted: marketing?.granted ?? false, aggiornatoIl: marketing?.aggiornatoIl ?? null, testo: MARKETING_TEXT },
    documenti,
  };
}

/**
 * Interrompe il monitoraggio di un veicolo: da ora nessuna comunicazione di servizio
 * (il blocco è in sendAndLog e in inviaADevops). La richiesta non ancora partita viene annullata.
 * @param {{userId?: string, canale: "area_personale"|"email_operatore", motivo?: string, attore: string}} params
 * @returns {Promise<object|null>} l'adesione cessata, null se non esiste, non è del cliente o non è attiva
 */
export async function cessaAdesione(id, { userId, canale, motivo, attore }) {
  const adesione = await cessaAdesioneAttiva(id, { userId, canale, motivo });
  if (!adesione) return null;
  if (adesione.richiesta_id) await annullaRichiestaNonInviata(adesione.richiesta_id);
  await registraEvento({
    adesioneId: adesione.id,
    richiestaId: adesione.richiesta_id,
    tipo: "cessata",
    attore,
    dettagli: { canale, motivo: motivo || null },
  });

  // Conferma della cessazione: unica email dopo l'interruzione (non è una comunicazione di monitoraggio)
  const esito = await sendAndLog({
    tipo: "cessazione",
    userId: adesione.user_id,
    richiestaId: adesione.richiesta_id,
    message: { to: adesione.email, ...cessazioneEmail({ targa: adesione.targa, cessataIl: adesione.cessata_at, areaUrl: accessoUrl() }) },
  });
  if (esito === "inviata")
    await registraEvento({ adesioneId: adesione.id, richiestaId: adesione.richiesta_id, tipo: "email_cessazione_inviata" });
  return adesione;
}

/** Cessazione chiesta via email a info@alcabroker.it e registrata dall'operatore su devops. */
export async function cessaDaOperatore(richiestaId, { operatore, motivo }) {
  const adesione = await getAdesioneByRichiesta(richiestaId);
  if (!adesione) return null;
  return cessaAdesione(adesione.id, {
    canale: "email_operatore",
    motivo,
    attore: `operatore:${operatore}`,
  });
}

/** Il cliente concede o revoca il consenso marketing. Indipendente dal servizio. */
export async function impostaMarketing(user, granted) {
  const attuale = await getMarketingAttuale(user.email);
  if ((attuale?.granted ?? false) === granted && attuale) return attuale;
  await insertConsensoMarketing({ email: user.email, user_id: user.id, granted, fonte: "area_personale" });
  await registraEvento({
    tipo: granted ? "marketing_concesso" : "marketing_revocato",
    attore: "cliente",
    dettagli: { fonte: "area_personale", user_id: user.id },
  });
  return getMarketingAttuale(user.email);
}
