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
const isOptionalBoolean = (value) => value === undefined || typeof value === "boolean";

/**
 * Valida il corpo della richiesta. Restituisce i dati normalizzati oppure { error }.
 */
export function validateRichiesta(body) {
  const data = {
    nome: str(body?.nome),
    cognome: str(body?.cognome),
    referralId: str(body?.referral_id),
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
  // Ricontatto e marketing: facoltativi, mai dedotti da altri campi
  if (!isOptionalBoolean(body?.ricontatto) || !isOptionalBoolean(body?.marketing))
    return { error: "Scelte di contatto non valide." };
  if (!isName(data.nome)) return { error: "Inserisci il tuo nome." };
  if (!isName(data.cognome)) return { error: "Inserisci il tuo cognome." };
  if (!REFERRAL_CODE.test(data.referralId)) return { error: "Link referral non valido." };
  if (!/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(data.targa)) return { error: "Targa non valida." };
  if (!ROAD_TYPES.includes(data.tipoStrada)) return { error: "Tipo di strada non valido." };
  if (data.strada.length < 2 || data.strada.length > 120) return { error: "Indirizzo non valido." };
  if (!/^(?:SNC|\d{1,5}(?:\s*[/-]?\s*[A-Z0-9]{1,5})?)$/.test(data.civico))
    return { error: "Numero civico non valido." };
  if (data.comune.length < 2 || data.comune.length > 80 || !/^\d{5}$/.test(data.cap))
    return { error: "Comune o CAP non validi." };
  if (data.email.length > 254 || !/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email))
    return { error: "Email non valida." };

  return {
    data: {
      ...data,
      ricontatto: body.ricontatto === true,
      marketing: body.marketing === true,
      indirizzo: `${data.tipoStrada} ${data.strada} ${data.civico}, ${data.cap} ${data.comune}`,
    },
  };
}

// Stesse regole di mobility-express/src/Suggerisci.jsx
/** Cellulare: cifre con prefisso internazionale facoltativo. Restituisce il numero normalizzato o null. */
export function normalizeCellulare(value) {
  const phone = str(value).replace(/[\s.()-]/g, "");
  return /^\+?\d{8,15}$/.test(phone) ? phone : null;
}

/** Valida il form di attivazione dell'area personale. */
export function validateAttivazione(body) {
  const data = {
    token: str(body?.token),
    nome: str(body?.nome),
    cognome: str(body?.cognome),
    cellulare: normalizeCellulare(body?.cellulare),
    password: typeof body?.password === "string" ? body.password : "",
  };
  if (!data.token || data.token.length > 100) return { error: "Link di attivazione non valido." };
  if (!isName(data.nome)) return { error: "Inserisci il tuo nome." };
  if (!isName(data.cognome)) return { error: "Inserisci il tuo cognome." };
  if (!data.cellulare) return { error: "Controlla il numero di cellulare." };
  if (data.password.length < 12 || data.password.length > 72)
    return { error: "La password deve avere tra 12 e 72 caratteri." };
  return { data };
}

export const AREE_SEGNALAZIONE = [
  "Preventivi e comparazione", "Emissione e gestione polizze", "Clienti e anagrafiche",
  "Documenti e firme", "Scadenze e rinnovi", "Report e provvigioni",
  "Navigazione e accessibilità", "Altro",
];

/**
 * Valida una segnalazione dalla pagina Suggerisci. Restituisce i dati normalizzati oppure { error }.
 */
export function validateSegnalazione(body) {
  const data = {
    tipo: str(body?.type),
    area: str(body?.area),
    titolo: str(body?.title),
    descrizione: str(body?.description),
    beneficio: str(body?.benefit),
    impatto: str(body?.impact),
    contatto: null,
  };

  if (!["idea", "improvement", "bug"].includes(data.tipo)) return { error: "Tipo di segnalazione non valido." };
  if (!AREE_SEGNALAZIONE.includes(data.area)) return { error: "Scegli l’area a cui si riferisce il suggerimento." };
  if (data.titolo.length < 5 || data.titolo.length > 100) return { error: "Il titolo deve avere tra 5 e 100 caratteri." };
  if (data.descrizione.length < 20 || data.descrizione.length > 2000)
    return { error: "La descrizione deve avere tra 20 e 2000 caratteri." };
  if (data.beneficio.length > 1000) return { error: "Il beneficio può avere al massimo 1000 caratteri." };
  if (!["low", "medium", "high"].includes(data.impatto)) return { error: "Impatto non valido." };

  if (body?.contact != null) {
    const nome = str(body.contact.name);
    const email = str(body.contact.email).toLowerCase();
    if (body.contact.permission !== true) return { error: "Conferma che possiamo contattarti." };
    if (nome.length > 80) return { error: "Nome troppo lungo." };
    if (email.length > 254 || !/^\S+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Email non valida." };
    data.contatto = { nome, email };
  }

  return { data };
}
