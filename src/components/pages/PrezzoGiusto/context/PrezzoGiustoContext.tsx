import { createContext, useCallback, useContext, useState } from "react";
import { richiediStima } from "../utils/api";
import {
  DEFAULT_REF,
  REFERRAL_CODE,
  type Quote,
  type QuoteRequest,
  type Referente,
} from "../utils/model";
import { useAuth } from "./AuthContext";

// Stato del flusso di richiesta: referente del link e ultima richiesta inviata.
// I dati dell'area personale arrivano dal database (utils/account.ts).
type PrezzoGiustoState = {
  activeRef: Referente;
  current: Quote | null;
  findRef: (id: string) => Referente | undefined;
  setActiveRef: (ref: Referente) => void;
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
  const [activeRef, setActiveRef] = useState<Referente>(DEFAULT_REF);
  const [current, setCurrent] = useState<Quote | null>(null);

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
    const result = await richiediStima(data, ref.id, idempotencyKey, session?.access_token);
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
      value={{ activeRef, current, findRef, setActiveRef, submitQuote }}
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
