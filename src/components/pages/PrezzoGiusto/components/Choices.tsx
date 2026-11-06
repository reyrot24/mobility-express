import { Link } from "react-router-dom";
import { CALLBACK_TEXT } from "../utils/estimate";
import { CONDIZIONI, PRIVACY } from "../utils/documenti";
import { PG_BASE } from "../utils/model";

const checkClassName = "mb-3 flex items-start gap-2.5 text-[11px] leading-relaxed";
const boxClassName = "mt-0.5 size-4 flex-none accent-orange";

const DocLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link className="underline" to={to} target="_blank" rel="noopener">
    {children}
  </Link>
);

/**
 * Scelte del modulo, mai preselezionate.
 * - Informativa privacy del servizio: obbligatoria (presa visione, con la versione).
 * - Condizioni del servizio: solo per il cliente in sessione, la cui identità è già verificata.
 *   Senza sessione si accettano sulla pagina del link personale ricevuto via email.
 * - Ricontatto: facoltativo. Il marketing non si sceglie qui (pagina di conferma o area personale).
 */
export const Choices = ({
  referentName,
  conCondizioni = false,
}: {
  referentName?: string;
  conCondizioni?: boolean;
}) => (
  <div className="mb-4">
    <label className={checkClassName}>
      <input name="privacy" type="checkbox" required className={boxClassName} />
      <span className="opacity-90">
        Ho letto l’
        <DocLink to={`${PG_BASE}/privacy`}>informativa privacy del servizio</DocLink> (versione{" "}
        {PRIVACY.versione}).
      </span>
    </label>
    {conCondizioni && (
      <label className={checkClassName}>
        <input name="condizioni" type="checkbox" required className={boxClassName} />
        <span className="opacity-90">
          Ho letto e accetto le{" "}
          <DocLink to={`${PG_BASE}/condizioni`}>Condizioni del servizio</DocLink> (versione{" "}
          {CONDIZIONI.versione}) per questo veicolo.
        </span>
      </label>
    )}
    <label className={checkClassName}>
      <input name="callback" type="checkbox" className={boxClassName} />
      <span className="opacity-90">
        <strong className="block">Ricontatto per il preventivo effettivo</strong>
        {CALLBACK_TEXT}
        {referentName && (
          <small className="block opacity-80">Il tuo referente: {referentName}.</small>
        )}
      </span>
    </label>
    <p className="text-[11px] opacity-70">
      {conCondizioni
        ? "Il consenso alle comunicazioni commerciali si gestisce a parte, nella sezione “Il servizio”."
        : "Riceverai un’email con i documenti del servizio e il link per confermare l’adesione: il servizio parte solo dopo la tua conferma."}
    </p>
  </div>
);
