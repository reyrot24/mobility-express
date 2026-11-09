import { Link } from "react-router-dom";
import { CALLBACK_TEXT, MARKETING_TEXT } from "../utils/estimate";
import { CONDIZIONI, PRIVACY } from "../utils/documenti";
import { PG_BASE } from "../utils/model";

const checkClassName = "mb-3 flex items-start gap-2.5 text-xs leading-relaxed";
const boxClassName = "mt-0.5 size-4 flex-none accent-orange";

const DocLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link className="underline" to={to} target="_blank" rel="noopener">
    {children}
  </Link>
);

/**
 * Documenti obbligatori, nel passaggio 1 del modulo. Caselle mai preselezionate:
 * - Informativa privacy del servizio: presa visione, con la versione.
 * - Condizioni del servizio: accettazione, con la versione.
 * Il server registra le scelte con data/ora e versioni.
 */
export const DocumentiObbligatori = () => (
  <div className="mt-4">
    <label className={checkClassName}>
      <input name="privacy" type="checkbox" required className={boxClassName} />
      <span className="opacity-90">
        Ho letto l’
        <DocLink to={`${PG_BASE}/privacy`}>informativa privacy del servizio</DocLink> (versione{" "}
        {PRIVACY.versione}).
      </span>
    </label>
    <label className={checkClassName}>
      <input name="condizioni" type="checkbox" required className={boxClassName} />
      <span className="opacity-90">
        Ho letto e accetto le{" "}
        <DocLink to={`${PG_BASE}/condizioni`}>Condizioni del servizio</DocLink> (versione{" "}
        {CONDIZIONI.versione}).
      </span>
    </label>
  </div>
);

/**
 * Scelte facoltative, nel passaggio 2: ricontatto e comunicazioni commerciali (separate dal servizio).
 * La richiesta parte solo dopo la conferma dal link ricevuto via email (o subito, dall'area personale).
 */
export const ScelteFacoltative = ({
  referentName,
  inArea = false,
}: {
  referentName?: string;
  /** Richiesta dall'area personale: niente email di conferma */
  inArea?: boolean;
}) => (
  <div className="mb-4">
    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide opacity-60">
      Facoltativo
    </p>
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
    <label className={checkClassName}>
      <input name="marketing" type="checkbox" className={boxClassName} />
      <span className="opacity-90">
        <strong className="block">Comunicazioni commerciali</strong>
        {MARKETING_TEXT}
      </span>
    </label>

    <p className="text-[11px] opacity-70">
      {inArea
        ? "La richiesta parte subito. Consensi e servizio si gestiscono nella sezione “Il servizio”."
        : "Ti scriviamo un’email: la richiesta parte quando premi “Conferma”."}
    </p>
  </div>
);
