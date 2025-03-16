import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "../FormContext";

const Section6 = ({ errors }: { errors: { [key: string]: string | null } }) => {
  const { formState, dispatch } = useForm();

  return (
    <section className="flex flex-col gap-4">
      <div className="w-full items-center bg-background2 px-[5%] rounded-xl py-4">
        <div className="flex flex-col gap-4">
          <h1 className="font-bold py-4 text-xl">
            Sezione 6: Dichiarazioni del Contraente
          </h1>
          <div>
            <p>
              Il Contraente ai sensi e per gli effetti degli artt. 1892, 1893,
              1894 e 1910 del Codice Civile dichiara che:
            </p>
            <p>
              {" "}
              − il Fabbricato o la porzione del fabbricato e/o il terreno
              assicurato non è situato in aree golenali;{" "}
            </p>
            <p>
              − il Fabbricato o la porzione di fabbricato assicurato si trova in
              normali condizioni di statica e manutenzione e non risulta altresì
              essere in fase di ricostruzione;{" "}
            </p>
            <p>
              − il Fabbricato o la porzione di fabbricato assicurato non è in
              stato di abbandono, non è stato dichiarato inagibile e non è stato
              costruito in assenza di autorizzazioni a edificare;{" "}
            </p>
            <p>
              − il Fabbricato o la porzione di fabbricato assicurato non è
              gravato da abuso sorto successivamente alla data di costruzione;{" "}
            </p>
            <p>
              − non sono in corso altre assicurazioni per i rischi da
              assicurare;{" "}
            </p>
            <p>− l'attività descritta corrisponde a quella esercitata; </p>
            <p>
              − le caratteristiche del Fabbricato o porzione di fabbricato in
              cui si esercita l’attività dell’Impresa, corrisponde a quanto
              prescritto nelle Condizioni di Assicurazione e nella legenda sotto
              riportata.
            </p>
          </div>
        </div>
      </div>
      <div className="w-full items-center bg-background2 px-[5%] rounded-xl py-4">
        <p className="my-2 text-sm">
          1. <span className="font-bold">Fabbricato</span> : L’intera
          costruzione edile e tutte le opere murarie e di finitura, compresi
          fissi e infissi ed opere di fondazione o interrate, impianti idrici ed
          igienici, impianti elettrici fissi, impianti di riscaldamento,
          impianti di condizionamento d’aria, impianti di segnalazione e
          comunicazione, ascensori, montacarichi, scale mobili, altri impianti o
          installazioni di pertinenza del fabbricato compresi cancelli,
          recinzioni, fognature nonché eventuali quote spettanti delle parti
          comuni.{" "}
          <span className="font-bold">
            Non è considerato fabbricato quanto rientrante nella definizione
            “Impianti e macchinari, Attrezzature industriali e commerciali,
            Apparecchiature elettroniche”
          </span>{" "}
        </p>
        <p className="my-2 text-sm">
          2. <span className="font-bold">Macchinari</span>, impianti**:Tutte le
          macchine anche elettroniche e a controllo numerico e qualsiasi tipo di
          impianto atto allo svolgimento dell’attività esercitata
          dall’assicurato, con l’esclusione di quanto rientra nella definizione
          “Fabbricati”.{" "}
        </p>
        <p className="my-2 text-sm">
          3.{" "}
          <span className="font-bold">
            Attrezzature Industriali e Commerciali
          </span>
          : Macchine, attrezzi, utensili e relativi ricambi e basamenti, altri
          impianti non rientranti nella definizione di “Fabbricato”, impianti e
          mezzi di sollevamento, pesa, nonché di imballaggio e trasporto non
          iscritti al P.R.A.
        </p>
      </div>
      <div className="w-full items-center bg-background2 px-[5%] rounded-xl py-4">
        <div className="my-2 text-sm">
          INFORMATIVA PRIVACY (Regolamento UE 2016/679 - GDPR) <br />
          <p className="text-xs ml-2">
            Ai sensi dell’art. 13 del Regolamento (UE) 2016/679 (GDPR), ALCA
            BROKER SRL informa che i dati forniti saranno trattati
            esclusivamente per le finalità di elaborazione del preventivo
            richiesto, nel rispetto della normativa vigente in materia di
            protezione dei dati personali.
            <br />
            I dati raccolti potranno essere comunicati a compagnie assicurative
            al solo scopo di ottenere il preventivo richiesto. Non saranno
            diffusi a terzi senza esplicito consenso dell’interessato. Il
            periodo di conservazione dei dati è limitato al tempo necessario per
            la formulazione del preventivo e per l’eventuale sottoscrizione
            della polizza.
            <br />
            L’interessato ha il diritto di accesso, rettifica, cancellazione,
            limitazione e opposizione al trattamento dei dati personali, nonché
            il diritto alla portabilità dei dati, inviando una richiesta a
            privacy@alcabroker.it. Per maggiori informazioni, si invita a
            consultare l’informativa completa disponibile sul sito
            www.alcabroker.it.
          </p>
          {/* Obbligatorio */}
          <div className="flex items-center gap-4">
            <Checkbox
              className={`col-span-3 mt-2 mb-2 ml-2 ${
                errors.checkboxTrattamentoDatiPersonali
                  ? "border-red-500 border-2"
                  : ""
              }`}
              checked={formState.section6.checkboxTrattamentoDatiPersonali}
              onCheckedChange={() =>
                dispatch({
                  type: "section6",
                  payload: {
                    checkboxTrattamentoDatiPersonali:
                      !formState.section6.checkboxTrattamentoDatiPersonali,
                  },
                })
              }
            />
            <p>
              Acconsento al trattamento dei miei dati personali per la richiesta
              del preventivo.
            </p>
          </div>
          {/* Opzionale */}
          <div className="flex items-center gap-4">
            <Checkbox
              className="mt-2 mb-2 ml-2"
              checked={formState.section6.checkboxComunicazioniCommerciali}
              onCheckedChange={() =>
                dispatch({
                  type: "section6",
                  payload: {
                    checkboxComunicazioniCommerciali:
                      !formState.section6.checkboxComunicazioniCommerciali,
                  },
                })
              }
            />
            <p>
              Acconsento alla ricezione di comunicazioni commerciali e
              promozionali da parte di ALCA BROKER SRL.
            </p>
          </div>
          <br />
          {/*    Data //__ <br /> Firma __________________ */}
        </div>
      </div>
    </section>
  );
};

export default Section6;
