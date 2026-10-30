import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { leggiPagina, richiediStima } from "../utils/api";
import { withReferente, type PaginaReferente } from "../utils/pagina";
import {
  DEFAULT_REF,
  REFERRAL_CODE,
  type Quote,
  type QuoteRequest,
  type Referente,
} from "../utils/model";
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
  current: Quote | null;
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
    (id: string) => (REFERRAL_CODE.test(id) ? { ...DEFAULT_REF, id } : undefined),
    []
  );

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
        current,
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
