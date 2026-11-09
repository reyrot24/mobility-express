import type { Consents, Estimate, RequestStatus } from "./estimate";

export const PG_BASE = "/prezzo-giusto";

// Codice referente nel link di devops: /prezzo-giusto/<codice>. Stessa regola in server/lib/validation.js
export const REFERRAL_CODE = /^[A-Za-z0-9_-]{1,64}$/;
// Percorsi del sito sotto /prezzo-giusto/: non sono codici referente. Stessa lista in lib/validation.js
export const PERCORSI_RISERVATI = [
  "come-funziona", "inviata", "accesso", "reimposta-password", "area", "attiva", "condizioni", "privacy",
];
export const isReferralCode = (value: string) =>
  REFERRAL_CODE.test(value) && !PERCORSI_RISERVATI.includes(value.toLowerCase());
// Configurazione di devops nel link: /prezzo-giusto/<codice>/<id>. Stessa regola in server/lib/validation.js
export const CONFIGURATION_ID = /^[A-Za-z0-9_-]{1,64}$/;

export const ROAD_TYPES = [
  "Via",
  "Piazza",
  "Corso",
  "Viale",
  "Vicolo",
  "Largo",
  "Piazzale",
  "Strada",
  "Lungomare",
  "Località",
  "Contrada",
  "Frazione",
  "Borgo",
  "Salita",
  "Discesa",
  "Traversa",
] as const;

// Abbreviazioni comuni del tipo di strada, scritte dal cliente prima del nome
const ROAD_ALIASES: Record<string, (typeof ROAD_TYPES)[number]> = {
  v: "Via", p: "Piazza", pza: "Piazza", pzza: "Piazza", piaz: "Piazza", cso: "Corso", c: "Corso",
  vle: "Viale", vic: "Vicolo", lgo: "Largo", ple: "Piazzale", pzle: "Piazzale", str: "Strada",
  lungomar: "Lungomare", loc: "Località", localita: "Località", cda: "Contrada", ctr: "Contrada",
  fraz: "Frazione", fr: "Frazione", trav: "Traversa",
};

const roadKey = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[.'’]/g, "").toLowerCase();

/**
 * "Via Garibaldi" → { streetType: "Via", street: "Garibaldi" }; "p.zza Duomo" → Piazza.
 * Senza un tipo riconoscibile all'inizio streetType è null e street è tutto il testo.
 */
export function splitStreet(value: string): { streetType: (typeof ROAD_TYPES)[number] | null; street: string } {
  const text = value.trim().replace(/\s+/g, " ");
  // Solo il tipo ("Via"), senza nome: strada ancora da scrivere
  const soloTipo = ROAD_TYPES.find((t) => roadKey(t) === roadKey(text)) ?? ROAD_ALIASES[roadKey(text)];
  if (soloTipo) return { streetType: soloTipo, street: "" };
  const match = /^([\p{L}.'’]+)\.?\s+(.+)$/u.exec(text);
  if (match) {
    const key = roadKey(match[1]);
    const type = ROAD_TYPES.find((t) => roadKey(t) === key) ?? ROAD_ALIASES[key];
    if (type) return { streetType: type, street: match[2].trim() };
  }
  return { streetType: null, street: text };
}

export type Referente = {
  id: string;
  creator: string;
  name: string;
  role: string;
  channel: string;
  phone: string;
  email: string;
  // Dalla pagina personalizzata del referente (utils/pagina.ts)
  whatsapp?: string;
  photo?: string;
  intro?: string;
};

export type QuoteInput = {
  firstName: string;
  lastName: string;
  phone: string;
  plate: string;
  streetType: string;
  street: string;
  houseNumber: string;
  city: string;
  zip: string;
  email: string;
};

// Scelte del modulo: informativa e Condizioni obbligatorie, ricontatto e comunicazioni commerciali
// facoltativi (mai preselezionati). La richiesta parte solo dopo la conferma dal link nell'email.
export type QuoteChoices = {
  privacy: true;
  condizioni: true;
  callback: boolean;
  marketing: boolean;
};

export type QuoteRequest = QuoteInput & QuoteChoices;

export type Quote = QuoteInput & {
  id: string;
  status: RequestStatus;
  // null finché la richiesta è in elaborazione o quando il servizio di stima non restituisce un range per la richiesta
  estimate: Estimate | null;
  date: string;
  ref: Referente;
  consents: Consents;
};

// TODO: sostituire con il referente risolto dall'API devops
export const DEFAULT_REF: Referente = {
  id: "DEMO-STUDIO",
  creator: "Marco Rossi",
  name: "Giulia Bianchi",
  role: "Il tuo referente",
  channel: "Studio Bianchi",
  phone: "+39 000 000 0000",
  email: "stima@polizzexpress.it",
};

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((x) => x[0])
    .slice(0, 2)
    .join("");

export const streetAddress = (q: QuoteInput) =>
  `${q.streetType} ${q.street} ${q.houseNumber}`;

/** "Via Roma 12, 20121 Milano"; senza comune e CAP (non ancora arrivati da devops) solo la via. */
export const fullAddress = (q: QuoteInput) => {
  const luogo = [q.zip, q.city].filter(Boolean).join(" ");
  return luogo ? `${streetAddress(q)}, ${luogo}` : streetAddress(q);
};

export const formDataToObject = (form: HTMLFormElement) =>
  Object.fromEntries(new FormData(form)) as Record<string, string>;

const QUOTE_FIELDS: (keyof QuoteInput)[] = [
  "firstName",
  "lastName",
  "phone",
  "plate",
  "streetType",
  "street",
  "houseNumber",
  "city",
  "zip",
  "email",
];

// Stessa regola di server/lib/validation.js
export const isName = (value: string) =>
  value.length >= 1 &&
  value.length <= 80 &&
  /^[\p{L}][\p{L}\s'’.-]*$/u.test(value);

// Cellulare con prefisso internazionale facoltativo. Stessa regola di server/lib/validation.js
export const normalizePhone = (value: string) => value.replace(/[\s.()-]/g, "");
export const isPhone = (value: string) =>
  /^\+?\d{8,15}$/.test(normalizePhone(value));

const flag = (value: unknown) => value === true || value === "on";

/** Controlli del passaggio 1 (auto e indirizzo). Lancia un Error con il messaggio da mostrare. */
// Comune e CAP non si chiedono al cliente: arrivano da devops insieme al risultato.
export function validateVehicle(data: Pick<QuoteInput, "plate" | "streetType" | "street" | "houseNumber">) {
  if (!/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(data.plate))
    throw new Error(
      "Inserisci la targa nel formato AB123CD. Per targhe speciali rivolgiti al referente.",
    );
  if (!(ROAD_TYPES as readonly string[]).includes(data.streetType))
    throw new Error("Seleziona il tipo di strada.");
  if (data.street.length < 2 || data.street.length > 120)
    throw new Error("Inserisci via o piazza, per esempio Via Garibaldi.");
  if (!/^(?:SNC|\d{1,5}(?:\s*[/-]?\s*[A-Z0-9]{1,5})?)$/.test(data.houseNumber))
    throw new Error(
      "Controlla il numero civico: per esempio 12 o 12/A. Se non c’è, scegli “Senza numero civico”.",
    );
}

/** Normalizza i campi del form (targa senza spazi e maiuscola, email minuscola, civico maiuscolo). */
export function normalizeQuoteInput(input: Record<string, unknown>): QuoteInput {
  const data = Object.fromEntries(
    QUOTE_FIELDS.map((key) => [key, String(input[key] ?? "").trim()]),
  ) as QuoteInput;
  data.plate = data.plate.replace(/\s/g, "").toUpperCase();
  data.email = data.email.toLowerCase();
  data.houseNumber = data.houseNumber.toUpperCase();
  data.phone = normalizePhone(data.phone);
  return data;
}

/** Informativa e Condizioni: obbligatorie, nel passaggio 1 del modulo. */
export function validateDocumenti(input: Record<string, unknown>) {
  if (!flag(input.privacy))
    throw new Error("Conferma di aver letto l’informativa privacy del servizio.");
  if (!flag(input.condizioni))
    throw new Error(
      "Per continuare accetta le Condizioni del servizio. Ricontatto e comunicazioni commerciali sono facoltativi.",
    );
}

/** Normalizza e valida i dati del modulo. Lancia un Error con il messaggio da mostrare. */
export function validateQuote(input: Record<string, unknown>): QuoteRequest {
  const data = normalizeQuoteInput(input);
  validateVehicle(data);
  // Nome e cognome sono facoltativi: il cliente li completa in "I miei dati"
  if (data.firstName && !isName(data.firstName))
    throw new Error("Controlla il nome.");
  if (data.lastName && !isName(data.lastName))
    throw new Error("Controlla il cognome.");
  if (data.email.length > 254 || !/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw new Error("Controlla l’indirizzo email.");
  // Cellulare facoltativo: se c'è dev'essere valido
  if (data.phone && !isPhone(data.phone))
    throw new Error("Controlla il numero di cellulare: 9 o 10 cifre, per esempio 3331234567. Oppure lascialo vuoto.");
  validateDocumenti(input);
  return {
    ...data,
    privacy: true,
    condizioni: true,
    callback: flag(input.callback),
    marketing: flag(input.marketing),
  };
}
