// Dati finti dell'anteprima locale (utils/anteprima.ts). In memoria: ricaricando la pagina si riparte
// da qui. Stesse forme di API e database, così le pagine non sanno di essere in anteprima.
import type { Profilo, ProfiloModificabile, Richiesta } from "../utils/account";
import type {
  Adesione,
  DatiAttivazione,
  DocumentoPubblico,
  RichiestaResponse,
  StatoServizio,
} from "../utils/api";
import { CHOICE_VERSION, MARKETING_TEXT, type Consents, type RequestStatus } from "../utils/estimate";
import { CONDIZIONI, PRIVACY, type DocumentoLegale } from "../utils/documenti";
import type { PaginaReferente } from "../utils/pagina";
import type { QuoteRequest } from "../utils/model";
import { EMAIL_ANTEPRIMA, sessioneAnteprima } from "../utils/anteprima";

const attesa = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));
const giorniFa = (giorni: number) => new Date(Date.now() - giorni * 86_400_000).toISOString();

const consensi = (callback = false, marketing = false): Consents => ({
  privacyAcknowledged: true,
  privacyDocumento: PRIVACY.id,
  condizioni: { accepted: true, documento: CONDIZIONI.id },
  callback: callback ? { granted: true, requestedAt: giorniFa(1) } : { granted: false },
  marketing: { granted: marketing, text: MARKETING_TEXT, version: CHOICE_VERSION },
  version: CHOICE_VERSION,
  recordedAt: giorniFa(2),
});

function richiesta(
  n: number,
  targa: string,
  stato: RequestStatus,
  prezzo: number | null,
  giorni: number,
  extra: Partial<Richiesta> = {}
): Richiesta {
  return {
    id: `ST-ANTE000${n}`,
    targa,
    tipo_strada: "Via",
    strada: "Giuseppe Verdi",
    civico: String(10 + n),
    comune: prezzo === null ? null : "Milano",
    cap: prezzo === null ? null : "20121",
    referral_id: "ANTEPRIMA",
    stato,
    consensi: consensi(),
    created_at: giorniFa(giorni),
    risultati: prezzo === null ? null : { prezzo },
    ...extra,
  };
}

// Una richiesta per ogni stato che il cliente può vedere. Creato al primo uso: nessun codice gira
// all'import, così la build di produzione elimina questo file.
const creaStore = () => ({
  profilo: {
    nome: "Andrea",
    cognome: "Prova",
    cellulare: "+393331234567",
    referral_id: "ANTEPRIMA",
    comune: "Milano",
    cap: "20121",
  } as Profilo,
  richieste: [
    richiesta(1, "AB123CD", "completata", 520, 2, { consensi: consensi(true) }),
    richiesta(2, "EF456GH", "in_elaborazione", null, 0),
    richiesta(3, "IL789MN", "non_disponibile", null, 5),
    richiesta(4, "PQ012RS", "errore", null, 7),
    richiesta(5, "TU345VZ", "annullata", 610, 30),
  ],
  adesioniCessate: new Set<string>(["ST-ANTE0005"]),
  marketing: { granted: false, aggiornatoIl: giorniFa(2) as string | null },
});
let memoria: ReturnType<typeof creaStore> | undefined;
const store = () => (memoria ??= creaStore());

const pubblico = (doc: DocumentoLegale): DocumentoPubblico => ({
  id: doc.id,
  versione: doc.versione,
  data: doc.data,
  url: doc === CONDIZIONI ? "/prezzo-giusto/condizioni" : "/prezzo-giusto/privacy",
  pdf: doc.pdf,
});
const documenti = () => ({ condizioni: pubblico(CONDIZIONI), privacy: pubblico(PRIVACY) });

function richiestaDaId(id: string) {
  const r = store().richieste.find((x) => x.id === id);
  if (!r) throw new Error("Richiesta non trovata.");
  return r;
}

// ───────────── Database (utils/account.ts) ─────────────

export async function fetchRichieste() {
  await attesa();
  return store().richieste.map((r) => ({ ...r }));
}

export async function fetchRichiesta(id: string) {
  await attesa();
  const r = store().richieste.find((x) => x.id === id);
  return r ? { ...r } : null;
}

export async function fetchProfilo() {
  await attesa();
  return { ...store().profilo };
}

export async function fetchConfigurazioneProfilo() {
  return { referral_id: "ANTEPRIMA", id_configurazione: "ANTEPRIMA" };
}

export async function updateProfilo(profilo: ProfiloModificabile) {
  await attesa();
  Object.assign(store().profilo, profilo);
}

// ───────────── API (utils/api.ts) ─────────────

let contatore = 6;

export async function richiediStima(data: QuoteRequest): Promise<RichiestaResponse> {
  await attesa(700);
  const inArea = sessioneAnteprima();
  const nuova: Richiesta = {
    id: `ST-ANTE${String(contatore++).padStart(4, "0")}`,
    targa: data.plate,
    tipo_strada: data.streetType,
    strada: data.street,
    civico: data.houseNumber,
    comune: null,
    cap: null,
    referral_id: "ANTEPRIMA",
    stato: inArea ? "in_elaborazione" : "in_attesa_attivazione",
    consensi: consensi(data.callback, data.marketing),
    created_at: new Date().toISOString(),
    risultati: null,
  };
  store().richieste.unshift(nuova);
  // Dall'area personale la stima "arriva" dopo qualche secondo, come farebbe devops
  if (inArea)
    setTimeout(() => {
      Object.assign(nuova, {
        stato: "completata",
        comune: "Milano",
        cap: "20121",
        risultati: { prezzo: 380 + Math.round(Math.random() * 400) },
      });
    }, 6000);
  return { id: nuova.id, stato: nuova.stato, data: nuova.created_at, consensi: nuova.consensi };
}

export async function richiediRicontatto(id: string) {
  await attesa();
  const r = richiestaDaId(id);
  const requestedAt = new Date().toISOString();
  r.consensi = { ...r.consensi, callback: { granted: true, requestedAt } };
  return { requestedAt };
}

// Link di conferma finti: /prezzo-giusto/attiva?token=<uno di questi>
export const TOKEN_ANTEPRIMA = {
  nuovo: "ANTEPRIMA-nuovo",
  esistente: "ANTEPRIMA-esistente",
  vecchio: "ANTEPRIMA-vecchio",
  scaduto: "ANTEPRIMA-scaduto",
} as const;

export async function datiAttivazione(token: string): Promise<DatiAttivazione> {
  await attesa();
  if (token === TOKEN_ANTEPRIMA.scaduto || !Object.values(TOKEN_ANTEPRIMA).includes(token as never))
    throw new Error("Il link è scaduto o è già stato usato.");
  const vecchio = token === TOKEN_ANTEPRIMA.vecchio;
  return {
    email: EMAIL_ANTEPRIMA,
    temporaryPasswordRequired: vecchio,
    accountEsistente: token === TOKEN_ANTEPRIMA.esistente,
    richiesta: { id: "ST-ANTE0002", targa: "EF456GH" },
    documenti: documenti(),
    referente: {
      name: PAGINA_ANTEPRIMA.referente.nome ?? "",
      role: PAGINA_ANTEPRIMA.referente.ruolo,
      phone: PAGINA_ANTEPRIMA.referente.telefono ?? "",
      email: PAGINA_ANTEPRIMA.referente.email ?? "",
    },
    condizioniDaAccettare: vecchio,
  };
}

export async function attivaArea(payload: { token: string }) {
  await attesa(600);
  return { email: EMAIL_ANTEPRIMA, alreadyRegistered: payload.token === TOKEN_ANTEPRIMA.esistente };
}

export async function leggiServizio(): Promise<StatoServizio> {
  await attesa();
  const adesioni: Adesione[] = store().richieste
    .filter((r) => r.stato !== "in_attesa_attivazione")
    .map((r) => {
      const cessata = store().adesioniCessate.has(r.id);
      return {
        id: `AD-${r.id}`,
        richiestaId: r.id,
        targa: r.targa,
        stato: cessata ? "cessata" : "attiva",
        attivataIl: r.created_at,
        condizioni: CONDIZIONI.id,
        privacy: PRIVACY.id,
        cessataIl: cessata ? giorniFa(1) : null,
      };
    });
  return { adesioni, marketing: { ...store().marketing, testo: MARKETING_TEXT }, documenti: documenti() };
}

export async function interrompiMonitoraggio(id: string) {
  await attesa();
  const richiestaId = id.replace(/^AD-/, "");
  store().adesioniCessate.add(richiestaId);
  const r = store().richieste.find((x) => x.id === richiestaId);
  if (r) r.stato = "annullata";
  return { id, stato: "cessata" as const, cessataIl: new Date().toISOString() };
}

export async function impostaMarketing(granted: boolean) {
  await attesa();
  store().marketing = { granted, aggiornatoIl: new Date().toISOString() };
  return { granted, aggiornatoIl: store().marketing.aggiornatoIl as string };
}

export async function cambiaPassword() {
  await attesa();
  return { ok: true as const };
}

/** Pagina personalizzata finta: /prezzo-giusto/ANTEPRIMA/ANTEPRIMA */
export const PAGINA_ANTEPRIMA: PaginaReferente = {
  versione: 1,
  logo: null,
  navbar: { titolo: "Studio Prova Assicurazioni", sottotitolo: "con il prezzo giusto" },
  hero: {
    etichetta: "Anteprima locale",
    titolo: "La tua RC auto,",
    titoloEvidenziato: "al prezzo giusto.",
    descrizione: "Pagina personalizzata finta per provare colori, testi e referente in locale.",
    vantaggi: ["Gratuito", "Senza impegno", "Risposta via email"],
  },
  referente: {
    nome: "Mario Prova",
    ruolo: "Consulente assicurativo",
    telefono: "+39 333 000 0000",
    whatsapp: "+393330000000",
    email: "mario.prova@locale.test",
    foto: null,
    presentazione: "Referente finto dell'anteprima locale.",
  },
  sezioni: { fiducia: true, passi: true },
  colori: { navbar: null, principale: null, form: null, sezioni: null, accento: "#1f6feb" },
};

export async function leggiPagina() {
  await attesa();
  return PAGINA_ANTEPRIMA;
}
