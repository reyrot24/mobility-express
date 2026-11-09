// Stesse regole di src/components/pages/PrezzoGiusto/utils/model.ts
export const ROAD_TYPES = [
  "Via", "Piazza", "Corso", "Viale", "Vicolo", "Largo", "Piazzale", "Strada",
  "Lungomare", "Località", "Contrada", "Frazione", "Borgo", "Salita", "Discesa", "Traversa",
];

const str = (value) => (typeof value === "string" ? value.trim() : "");
// Lettere (anche accentate), spazi, apostrofi e trattini
const isName = (value) => value.length >= 1 && value.length <= 80 && /^[\p{L}][\p{L}\s'’.-]*$/u.test(value);
// Codice referente nel link di devops: /prezzo-giusto/<codice>. Stessa regola in utils/model.ts
export const REFERRAL_CODE = /^[A-Za-z0-9_-]{1,64}$/;
// Percorsi del sito sotto /prezzo-giusto/: non possono essere codici referente. Stessa lista in utils/model.ts
export const PERCORSI_RISERVATI = [
  "come-funziona", "inviata", "accesso", "reimposta-password", "area", "attiva", "condizioni", "privacy",
];
const isReferral = (value) => REFERRAL_CODE.test(value) && !PERCORSI_RISERVATI.includes(value.toLowerCase());
// Id della configurazione di devops nel link: /prezzo-giusto/<codice>/<id>. Stessa regola in utils/model.ts
export const CONFIGURATION_ID = /^[A-Za-z0-9_-]{1,64}$/;
const isOptionalBoolean = (value) => value === undefined || typeof value === "boolean";

/**
 * Valida il corpo della richiesta. Restituisce i dati normalizzati oppure { error }.
 */
export function validateRichiesta(body) {
  const data = {
    nome: str(body?.nome),
    cognome: str(body?.cognome),
    // Facoltativo: "" se non indicato, null se indicato ma non valido
    cellulare: str(body?.cellulare) ? normalizeCellulare(body?.cellulare) : "",
    referralId: str(body?.referral_id),
    idConfigurazione: str(body?.id_configurazione),
    targa: str(body?.targa).replace(/\s/g, "").toUpperCase(),
    tipoStrada: str(body?.tipoStrada),
    strada: str(body?.strada),
    civico: str(body?.civico).toUpperCase(),
    comune: str(body?.comune),
    cap: str(body?.cap),
    email: str(body?.email).toLowerCase(),
  };

  if (body?.privacy !== true)
    return { error: "Conferma di aver letto l’informativa privacy." };
  // Ricontatto: facoltativo, mai dedotto da altri campi. Il marketing non si sceglie qui ma alla
  // conferma dell'adesione o nell'area personale: un eventuale campo "marketing" viene ignorato.
  if (!isOptionalBoolean(body?.ricontatto) || !isOptionalBoolean(body?.condizioni))
    return { error: "Scelte non valide." };
  // Nome e cognome sono facoltativi: il form pubblico non li chiede, il cliente li completa nell'area personale
  if (data.nome && !isName(data.nome)) return { error: "Nome non valido." };
  if (data.cognome && !isName(data.cognome)) return { error: "Cognome non valido." };
  if (data.cellulare === null) return { error: "Controlla il numero di cellulare." };
  // Referral facoltativo: vuoto se il cliente non è arrivato da un link di devops
  if (data.referralId && !isReferral(data.referralId))
    return { error: "Link referral non valido." };
  // Facoltativo: vuoto se il link non ha una pagina personalizzata
  if (data.idConfigurazione && !CONFIGURATION_ID.test(data.idConfigurazione))
    return { error: "Link non valido." };
  if (!/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(data.targa)) return { error: "Targa non valida." };
  if (!ROAD_TYPES.includes(data.tipoStrada)) return { error: "Tipo di strada non valido." };
  if (data.strada.length < 2 || data.strada.length > 120) return { error: "Indirizzo non valido." };
  if (!/^(?:SNC|\d{1,5}(?:\s*[/-]?\s*[A-Z0-9]{1,5})?)$/.test(data.civico))
    return { error: "Numero civico non valido." };
  // Comune e CAP facoltativi: il form non li chiede, arrivano da devops con il risultato
  if ((data.comune || data.cap) && !isComuneCap(data.comune, data.cap))
    return { error: "Comune o CAP non validi." };
  if (data.email.length > 254 || !/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email))
    return { error: "Email non valida." };

  return {
    data: {
      ...data,
      ricontatto: body.ricontatto === true,
      // Solo dall'area personale: accettazione delle Condizioni nel form (la verifica la fa il servizio)
      condizioni: body.condizioni === true,
      documenti: documentiMostrati(body?.documenti),
      comune: data.comune || null,
      cap: data.cap || null,
      indirizzo: indirizzoCompleto(data.tipoStrada, data.strada, data.civico, data.cap, data.comune),
    },
  };
}

/** Comune (2-80 caratteri) e CAP (5 cifre), entrambi presenti. */
export const isComuneCap = (comune, cap) =>
  typeof comune === "string" &&
  typeof cap === "string" &&
  comune.trim().length >= 2 &&
  comune.trim().length <= 80 &&
  /^\d{5}$/.test(cap.trim());

/** "Via Roma 12, 20121 Milano"; senza comune e CAP solo la via. */
export function indirizzoCompleto(tipoStrada, strada, civico, cap, comune) {
  const via = `${tipoStrada} ${strada} ${civico}`;
  const luogo = [cap, comune].filter(Boolean).join(" ");
  return luogo ? `${via}, ${luogo}` : via;
}

// Stessa regola di src/components/pages/PrezzoGiusto/utils/model.ts
/** Cellulare: cifre con prefisso internazionale facoltativo. Restituisce il numero normalizzato o null. */
export function normalizeCellulare(value) {
  const phone = str(value).replace(/[\s.()-]/g, "");
  return /^\+?\d{8,15}$/.test(phone) ? phone : null;
}

/** Id dei documenti mostrati al cliente, es. { condizioni: "condizioni-1.0", privacy: "privacy-1.0" }. */
function documentiMostrati(value) {
  const id = (v) => (typeof v === "string" && /^[a-z]+-[0-9.]{1,10}$/.test(v) ? v : null);
  return { condizioni: id(value?.condizioni), privacy: id(value?.privacy) };
}

/**
 * Valida la conferma dell'adesione dalla pagina del link personale.
 * La password nuova è obbligatoria solo per chi non ha ancora un account (la verifica il servizio).
 */
export function validateAttivazione(body) {
  const data = {
    token: str(body?.token),
    password: typeof body?.password === "string" ? body.password : "",
    temporaryPassword:
      typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "",
    condizioniAccettate: body?.condizioniAccettate === true,
    // null = scelta non mostrata (cliente con account già esistente)
    marketing: typeof body?.marketing === "boolean" ? body.marketing : null,
    documenti: documentiMostrati(body?.documenti),
  };
  if (!data.token || data.token.length > 100) return { error: "Link di attivazione non valido." };
  if (!data.condizioniAccettate)
    return { error: "Per attivare il servizio devi accettare le Condizioni del servizio." };
  if (!data.documenti.condizioni || !data.documenti.privacy)
    return { error: "Versione dei documenti mancante. Ricarica la pagina." };
  if (data.temporaryPassword.length > 128)
    return { error: "La password temporanea non è valida." };
  if (data.password && (data.password.length < 12 || data.password.length > 72))
    return { error: "La password deve avere tra 12 e 72 caratteri." };
  return { data };
}
