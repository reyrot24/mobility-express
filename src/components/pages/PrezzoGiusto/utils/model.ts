import type { Consents, Estimate, RequestStatus } from "./estimate";

export const PG_BASE = "/prezzo-giusto";

// Codice referente nel link di devops: /prezzo-giusto/<codice>. Stessa regola in server/lib/validation.js
export const REFERRAL_CODE = /^[A-Za-z0-9_-]{1,64}$/;

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

export type Referente = {
  id: string;
  creator: string;
  name: string;
  role: string;
  channel: string;
  phone: string;
  email: string;
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

// Scelte del modulo: privacy obbligatoria, ricontatto e marketing facoltativi e indipendenti
export type QuoteChoices = {
  privacy: true;
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

export const fullAddress = (q: QuoteInput) =>
  `${streetAddress(q)}, ${q.zip} ${q.city}`;

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
  value.length >= 1 && value.length <= 80 && /^[\p{L}][\p{L}\s'’.-]*$/u.test(value);

// Cellulare con prefisso internazionale facoltativo. Stessa regola di server/lib/validation.js
export const normalizePhone = (value: string) => value.replace(/[\s.()-]/g, "");
export const isPhone = (value: string) => /^\+?\d{8,15}$/.test(normalizePhone(value));

const flag = (value: unknown) => value === true || value === "on";

/** Normalizza e valida i dati del modulo. Lancia un Error con il messaggio da mostrare. */
export function validateQuote(input: Record<string, unknown>): QuoteRequest {
  const data = Object.fromEntries(
    QUOTE_FIELDS.map((key) => [key, String(input[key] ?? "").trim()]),
  ) as QuoteInput;
  data.plate = data.plate.replace(/\s/g, "").toUpperCase();
  data.email = data.email.toLowerCase();
  data.houseNumber = data.houseNumber.toUpperCase();

  if (!isName(data.firstName)) throw new Error("Inserisci il tuo nome.");
  if (!isName(data.lastName)) throw new Error("Inserisci il tuo cognome.");
  data.phone = normalizePhone(data.phone);
  if (!isPhone(data.phone))
    throw new Error("Controlla il numero di cellulare, per esempio +39 333 123 4567.");
  if (!/^[A-Z]{2}\d{3}[A-Z]{2}$/.test(data.plate))
    throw new Error(
      "Inserisci la targa nel formato AB123CD. Per targhe speciali rivolgiti al referente.",
    );
  if (!(ROAD_TYPES as readonly string[]).includes(data.streetType))
    throw new Error("Seleziona il tipo di strada.");
  if (data.street.length < 2 || data.street.length > 120)
    throw new Error(
      "Inserisci il nome della strada, senza tipo e numero civico.",
    );
  if (!/^(?:SNC|\d{1,5}(?:\s*[/-]?\s*[A-Z0-9]{1,5})?)$/.test(data.houseNumber))
    throw new Error(
      "Controlla il numero civico: per esempio 12, 12/A oppure SNC.",
    );
  if (
    data.city.length < 2 ||
    data.city.length > 80 ||
    !/^\d{5}$/.test(data.zip)
  )
    throw new Error("Controlla comune e CAP. Il CAP deve contenere 5 cifre.");
  if (data.email.length > 254 || !/^\S+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw new Error("Controlla l’indirizzo email.");
  if (!flag(input.privacy))
    throw new Error(
      "Conferma di aver letto l’informativa privacy. Ricontatto e marketing restano facoltativi.",
    );
  return {
    ...data,
    privacy: true,
    callback: flag(input.callback),
    marketing: flag(input.marketing),
  };
}

