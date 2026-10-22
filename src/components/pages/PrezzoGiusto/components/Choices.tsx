import { PrivacyDialog } from "./Dialogs";
import { TextButton } from "./Surface";
import { CALLBACK_TEXT, MARKETING_TEXT, PRIVACY_EMAIL } from "../utils/estimate";

const checkClassName = "mb-3 flex items-start gap-2.5 text-[11px] leading-relaxed";
const boxClassName = "mt-0.5 size-4 flex-none accent-orange";

// Privacy obbligatoria; ricontatto e marketing facoltativi, distinti e mai preselezionati
export const Choices = ({ referentName }: { referentName?: string }) => (
  <div className="mb-4">
    <label className={checkClassName}>
      <input name="privacy" type="checkbox" required className={boxClassName} />
      <span className="opacity-90">
        Ho letto l’
        <PrivacyDialog
          trigger={<TextButton className="text-[11px]">informativa privacy</TextButton>}
        />{" "}
        relativa alla richiesta di stima.
      </span>
    </label>
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
      Puoi ricevere la stima senza selezionare ricontatto o marketing. Per
      revocare il consenso commerciale:{" "}
      <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>
        {PRIVACY_EMAIL}
      </a>
      .
    </p>
  </div>
);
