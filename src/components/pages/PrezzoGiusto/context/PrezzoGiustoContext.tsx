import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { leggiPagina, richiediStima } from "../utils/api";
import { withReferente, type PaginaReferente } from "../utils/pagina";
import {
  CONFIGURATION_ID,
  DEFAULT_REF,
  PG_BASE,
  isReferralCode,
  type Quote,
  type QuoteRequest,
  type Referente,
} from "../utils/model";
import { fetchConfigurazioneProfilo } from "../utils/account";
import { useAuth } from "./AuthContext";
import { useTheme } from "@/components/dark-mode/theme-provider";

// Stato del flusso di richiesta: referente del link, la sua pagina personalizzata e ultima richiesta inviata.
// I dati dell'area personale arrivano dal database (utils/account.ts).
type PrezzoGiustoState = {
  /** Referente attivo, con i dati della sua pagina personalizzata */
  activeRef: Referente;
  /** Pagina personalizzata del link attivo: resta su tutte le pagine del sito */
  activePage: PaginaReferente | null;
  /** Pagine caricate per id configurazione: assente = in caricamento, null = pagina standard */
  pages: Map<string, PaginaReferente | null>;
  /** Link di devops aperto: referente per le richieste e, se c'è, configurazione da caricare */
  openLink: (ref: Referente, configurationId: string | null) => void;
  /** Percorso del link attivo (/prezzo-giusto/<codice>/<id configurazione>), per rifare una richiesta */
  linkPath: string;
  current: Quote | null;
  /** Ultima richiesta inviata (usato anche dall'anteprima locale per mostrare /inviata) */
  setCurrent: (quote: Quote | null) => void;
  /** Targa scritta nel form (senza spazi, maiuscola), per il messaggio di WhatsApp. "" se vuota */
  targaForm: string;
  setTargaForm: (targa: string) => void;
  findRef: (id: string) => Referente | undefined;
  /** referralId: codice referente del profilo (area personale), al posto di quello del link. Può essere vuoto */
  submitQuote: (
    data: QuoteRequest,
    idempotencyKey: string,
    referralId?: string | null
  ) => Promise<Quote>;
};

const PrezzoGiustoContext = createContext<PrezzoGiustoState | null>(null);

export const PrezzoGiustoProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const [linkRef, setLinkRef] = useState<Referente>(DEFAULT_REF);
  const [configurationId, setConfigurationId] = useState<string | null>(null);
  const [pages, setPages] = useState<Map<string, PaginaReferente | null>>(new Map());
  const requested = useRef(new Set<string>());
  const [current, setCurrent] = useState<Quote | null>(null);
  const [targaForm, setTargaForm] = useState("");

  const linkPath =
    linkRef.id && linkRef.id !== DEFAULT_REF.id
      ? `${PG_BASE}/${encodeURIComponent(linkRef.id)}${configurationId ? `/${configurationId}` : ""}`
      : PG_BASE;
  const activePage = (configurationId && pages.get(configurationId)) || null;
  const activeRef = useMemo(() => withReferente(linkRef, activePage), [linkRef, activePage]);

  // Con la pagina del referente si usa sempre la modalità chiara: i suoi colori sono pensati per quella
  const { setForcedTheme } = useTheme();
  const hasPage = activePage !== null;
  useEffect(() => {
    if (!hasPage) return;
    setForcedTheme("light");
    return () => setForcedTheme(null);
  }, [hasPage, setForcedTheme]);

  // Colore principale del referente: sostituisce l'arancione (pulsanti, bordi, titolo evidenziato).
  // Sulla radice del documento, così vale anche nei dialog e nei toast.
  const accent = activePage?.colori?.accento;
  useEffect(() => {
    if (!accent) return;
    const root = document.documentElement.style;
    root.setProperty("--orange", accent);
    root.setProperty("--orange-hover", `${accent}ce`);
    root.setProperty("--pg-accento-testo", accent);
    return () => ["--orange", "--orange-hover", "--pg-accento-testo"].forEach((p) => root.removeProperty(p));
  }, [accent]);

  // Una sola richiesta per configurazione. Se il server non risponde si mostra la pagina standard:
  // il codice del link resta valido e la richiesta di stima va comunque al referente.
  const openLink = useCallback((ref: Referente, id: string | null) => {
    setLinkRef(ref);
    setConfigurationId(id);
    if (!id || requested.current.has(id)) return;
    requested.current.add(id);
    leggiPagina(id)
      .catch((err) => {
        console.error("[prezzo-giusto]", err);
        return null;
      })
      .then((page) => setPages((prev) => new Map(prev).set(id, page)));
  }, []);

  // Ogni codice valido del link è accettato e inviato a devops.
  // TODO: mostrare i contatti del referente reale quando devops li renderà disponibili.
  const findRef = useCallback(
    (id: string) => (isReferralCode(id) ? { ...DEFAULT_REF, id } : undefined),
    []
  );

  // Area personale senza un link aperto in questa visita: logo, colori e referente della pagina
  // da cui il cliente ha confermato la prima richiesta (salvata sul profilo)
  const userId = session?.user.id;
  const linkAperto = configurationId !== null || linkRef.id !== DEFAULT_REF.id;
  useEffect(() => {
    if (!userId || linkAperto) return;
    let attivo = true;
    fetchConfigurazioneProfilo(userId).then((conf) => {
      if (!attivo || !conf?.referral_id) return;
      const ref = findRef(conf.referral_id);
      if (!ref) return;
      const id = conf.id_configurazione;
      openLink(ref, id && CONFIGURATION_ID.test(id) ? id : null);
    });
    return () => {
      attivo = false;
    };
  }, [userId, linkAperto, findRef, openLink]);

  async function submitQuote(
    data: QuoteRequest,
    idempotencyKey: string,
    referralId?: string | null
  ) {
    const ref = referralId === undefined ? { ...activeRef } : { ...activeRef, id: referralId ?? "" };
    // Se il cliente è in sessione la richiesta va al suo account
    const result = await richiediStima(
      data,
      ref.id,
      idempotencyKey,
      session?.access_token,
      // Dall'area personale la richiesta non arriva da un link
      referralId === undefined ? configurationId : null
    );
    const quote: Quote = {
      ...data,
      id: result.id,
      status: result.stato,
      estimate: null,
      date: result.data,
      ref,
      consents: result.consensi,
    };
    setCurrent(quote);
    return quote;
  }

  return (
    <PrezzoGiustoContext.Provider
      value={{
        activeRef,
        activePage,
        pages,
        openLink,
        linkPath,
        current,
        setCurrent,
        targaForm,
        setTargaForm,
        findRef,
        submitQuote,
      }}
    >
      {children}
    </PrezzoGiustoContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const usePrezzoGiusto = () => {
  const context = useContext(PrezzoGiustoContext);
  if (!context)
    throw new Error("usePrezzoGiusto deve essere usato dentro PrezzoGiustoProvider");
  return context;
};
