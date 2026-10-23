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
    cellulare: normalizeCellulare(body?.cellulare),
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
  // Nome e cognome sono facoltativi: il form pubblico non li chiede, il cliente li completa nell'area personale
  if (data.nome && !isName(data.nome)) return { error: "Nome non valido." };
  if (data.cognome && !isName(data.cognome)) return { error: "Cognome non valido." };
  if (!data.cellulare) return { error: "Controlla il numero di cellulare." };
  // Referral facoltativo: vuoto se il cliente non è arrivato da un link di devops
  if (data.referralId && !REFERRAL_CODE.test(data.referralId))
    return { error: "Link referral non valido." };
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

// Stessa regola di src/components/pages/PrezzoGiusto/utils/model.ts
/** Cellulare: cifre con prefisso internazionale facoltativo. Restituisce il numero normalizzato o null. */
export function normalizeCellulare(value) {
  const phone = str(value).replace(/[\s.()-]/g, "");
  return /^\+?\d{8,15}$/.test(phone) ? phone : null;
}

/** Valida il form di attivazione dell'area personale (nome, cognome e cellulare sono nella richiesta). */
export function validateAttivazione(body) {
  const data = {
    token: str(body?.token),
    password: typeof body?.password === "string" ? body.password : "",
    temporaryPassword:
      typeof body?.temporaryPassword === "string" ? body.temporaryPassword : "",
  };
  if (!data.token || data.token.length > 100) return { error: "Link di attivazione non valido." };
  if (data.temporaryPassword.length > 128)
    return { error: "La password temporanea non è valida." };
  if (data.password.length < 12 || data.password.length > 72)
    return { error: "La password deve avere tra 12 e 72 caratteri." };
  return { data };
}
