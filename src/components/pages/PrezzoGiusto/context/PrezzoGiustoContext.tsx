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
  /**
   * area: richiesta dall'area personale, va all'account in sessione con il suo codice referente.
   * Senza area (form pubblico) conta l'email inserita, anche se nel browser c'è una sessione aperta.
   */
  submitQuote: (
    data: QuoteRequest,
    idempotencyKey: string,
    area?: { referralId: string | null }
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
    area?: { referralId: string | null }
  ) {
    const ref = area?.referralId ? { ...activeRef, id: area.referralId } : { ...activeRef };
    // Il token di sessione solo dall'area personale: con il token il server usa l'email
    // dell'account e ignora quella del form
    const token = area ? session?.access_token : undefined;
    const result = await richiediStima(data, ref.id, idempotencyKey, token);
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
