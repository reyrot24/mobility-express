import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormError, PhoneField } from "./Field";
import { Choices } from "./Choices";
import {
  ROAD_TYPES,
  formDataToObject,
  normalizeQuoteInput,
  splitStreet,
  validateQuote,
  validateVehicle,
  type QuoteRequest,
} from "../utils/model";
import { tracciaStima, type ParametriStima } from "../utils/tracciamento";

type Customer = {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
};

type Props = {
  onSubmit: (data: QuoteRequest, idempotencyKey: string) => Promise<void>;
  referentName?: string;
  /** Cliente in sessione: cellulare ed email non vengono richiesti di nuovo. Nome e cognome si gestiscono in "I miei dati" */
  customer?: Customer;
  /** Arrivato dal link personalizzato di un collaboratore (solo per il tracciamento) */
  conReferente?: boolean;
  /** Sfondo scelto dal referente nella sua pagina personalizzata */
  style?: React.CSSProperties;
};

// Campi grandi e testo a 16px: su iPhone sotto i 16px il browser ingrandisce la pagina al tocco
const inputClassName =
  "flex h-11 w-full rounded-lg border border-[#d5d8e6] bg-white px-3.5 text-base text-blueText placeholder:text-[#9a9db3] focus-visible:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orangeHover disabled:cursor-not-allowed disabled:bg-[#f4f5f9] disabled:text-[#9a9db3]";
const labelClassName = "mb-1 block text-[11px] font-medium opacity-80";
// Stesso aspetto per il campo condiviso del cellulare
const sharedFieldsClassName =
  "[&_input:not([type=checkbox])]:h-11 [&_input:not([type=checkbox])]:rounded-lg [&_input:not([type=checkbox])]:border-[#d5d8e6] [&_select]:border-[#d5d8e6] [&_input:not([type=checkbox])]:text-base [&_select]:h-11 [&_select]:rounded-lg [&_select]:text-base [&_label]:text-[11px] [&_b]:rounded-l-lg";

/**
 * Richiesta di stima in due passaggi, pensata per lo smartphone:
 * 1. La tua auto: targa, via e civico (o SNC). Comune e CAP arrivano da devops con il risultato.
 * 2. Ricevi la stima: email, cellulare facoltativo, informativa e ricontatto facoltativo.
 * I campi del passaggio 1 restano nel form (nascosti) e arrivano al server come prima.
 */
export const QuoteForm = (props: Props) => {
  // Cambia dopo un invio dall'area personale: il modulo riparte vuoto dal passaggio 1
  const [formKey, setFormKey] = useState(0);
  return <ModuloStima key={formKey} {...props} onReset={() => setFormKey((k) => k + 1)} />;
};

const ModuloStima = ({
  onSubmit,
  referentName,
  customer,
  conReferente = false,
  style,
  onReset,
}: Props & { onReset: () => void }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [indirizzo, setIndirizzo] = useState("");
  const [tipoScelto, setTipoScelto] = useState<string>("Via");
  const [civico, setCivico] = useState("");
  const [snc, setSnc] = useState(false);
  const [riepilogo, setRiepilogo] = useState("");
  const sectionRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lock = useRef(false);
  const iniziata = useRef(false);
  // Stessa chiave per i tentativi ripetuti dello stesso invio: il server non duplica la richiesta
  const idempotencyKey = useRef(crypto.randomUUID());
  const tracking: ParametriStima = { origine: customer ? "area" : "pubblico", con_referente: conReferente };

  // Il tipo di strada si ricava da quello che scrive il cliente ("Via Roma", "p.zza Duomo");
  // solo se non si riconosce compare la scelta del tipo
  const { streetType: tipoRiconosciuto, street } = splitStreet(indirizzo);
  const streetType = tipoRiconosciuto ?? tipoScelto;
  const chiediTipo = !tipoRiconosciuto && street.length >= 2;

  // Pulsante di invio attivo solo con i campi obbligatori compilati e l'informativa spuntata
  const checkReady = useCallback(
    () => setReady(formRef.current?.checkValidity() ?? false),
    []
  );

  useEffect(() => {
    checkReady();
  }, [step, indirizzo, civico, snc, checkReady]);

  function traccia(evento: Parameters<typeof tracciaStima>[0]) {
    tracciaStima(evento, tracking);
  }

  function iniziato() {
    if (iniziata.current) return;
    iniziata.current = true;
    traccia("pg_stima_iniziata");
  }

  function vaiAl(next: 1 | 2) {
    setError("");
    setStep(next);
    // Su smartphone il passaggio nuovo parte dall'alto del riquadro
    requestAnimationFrame(() => {
      const top = sectionRef.current?.getBoundingClientRect().top ?? 0;
      if (top < 0) sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleRef.current?.focus({ preventScroll: true });
    });
  }

  function continua() {
    const form = formRef.current;
    if (!form) return;
    try {
      const data = normalizeQuoteInput(formDataToObject(form));
      validateVehicle(data);
      setRiepilogo(
        `${data.plate} · ${data.streetType} ${data.street} ${data.houseNumber}`
      );
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    traccia("pg_stima_passo1_completato");
    vaiAl(2);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Invio da tastiera al passaggio 1 = "Continua"
    if (step === 1) return continua();
    if (lock.current) return;
    let data: QuoteRequest;
    try {
      data = validateQuote({ ...formDataToObject(event.currentTarget), ...customer });
    } catch (e) {
      setError((e as Error).message);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await onSubmit(data, idempotencyKey.current);
      idempotencyKey.current = crypto.randomUUID();
      traccia("pg_stima_inviata");
      if (customer) onReset();
    } catch (e) {
      traccia("pg_stima_errore");
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      ref={sectionRef}
      className="scroll-mt-4 rounded-2xl border border-[#e6e8f0] bg-background1 p-4 shadow-[0_16px_48px_#040c540d] dark:border-white/10 sm:p-5 md:p-7"
      aria-label="Richiedi una stima indicativa RC auto"
      style={style}
    >
      <Avanzamento step={step} />

      <form
        ref={formRef}
        onSubmit={submit}
        onChange={checkReady}
        onFocus={iniziato}
        noValidate
      >
        {/* Passaggio 1: la tua auto */}
        <div hidden={step !== 1}>
          <h2
            ref={step === 1 ? titleRef : undefined}
            tabIndex={-1}
            className="mb-1 text-xl font-semibold leading-tight tracking-tight outline-none md:text-2xl"
          >
            La tua auto
          </h2>
          <p className="mb-4 text-sm leading-relaxed opacity-75 md:mb-5">
            Ci bastano targa e indirizzo.
          </p>

          <label className={labelClassName} htmlFor="pg-targa">
            Targa
          </label>
          <div className="relative mb-4">
            <b
              className="absolute inset-y-px left-px grid w-9 place-items-center rounded-l-lg bg-[#173c7b] text-xs text-white"
              aria-hidden="true"
            >
              I
            </b>
            <input
              id="pg-targa"
              name="plate"
              placeholder="AB 123 CD"
              maxLength={12}
              required
              pattern="\s*[A-Za-z]{2}\s*\d{3}\s*[A-Za-z]{2}\s*"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              enterKeyHint="next"
              className={cn(
                inputClassName,
                "h-11 pl-12 text-lg font-semibold md:h-12 uppercase tracking-[0.18em] placeholder:font-normal placeholder:tracking-[0.18em]"
              )}
            />
          </div>

          <fieldset className="min-w-0">
            <legend className="mb-2 text-xs font-semibold">Indirizzo di residenza</legend>
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_88px] gap-2">
              <div>
                <label className={labelClassName} htmlFor="pg-indirizzo">
                  Via, piazza, corso…
                </label>
                <input
                  id="pg-indirizzo"
                  value={indirizzo}
                  onChange={(e) => setIndirizzo(e.target.value)}
                  placeholder="Es. Via Garibaldi"
                  maxLength={140}
                  required
                  minLength={2}
                  autoComplete="address-line1"
                  enterKeyHint="next"
                  className={inputClassName}
                />
              </div>
              <div>
                <label className={labelClassName} htmlFor="pg-civico">
                  Civico
                </label>
                <input
                  id="pg-civico"
                  value={snc ? "" : civico}
                  onChange={(e) => setCivico(e.target.value)}
                  placeholder={snc ? "SNC" : "12/A"}
                  maxLength={12}
                  required={!snc}
                  disabled={snc}
                  inputMode="text"
                  autoComplete="address-line2"
                  enterKeyHint="next"
                  className={inputClassName}
                />
              </div>
            </div>
            <input type="hidden" name="streetType" value={streetType} />
            <input type="hidden" name="street" value={street} />
            <input type="hidden" name="houseNumber" value={snc ? "SNC" : civico} />

            {chiediTipo && (
              <div className="mb-2 flex items-center gap-3 rounded-lg bg-background2 px-3 py-1.5">
                <label htmlFor="pg-tipo" className="text-xs opacity-80">
                  È una
                </label>
                <select
                  id="pg-tipo"
                  value={tipoScelto}
                  onChange={(e) => setTipoScelto(e.target.value)}
                  className="h-9 flex-1 rounded-md border border-[#d5d8e6] bg-white px-2 text-base text-blueText"
                >
                  {ROAD_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            <label className="flex w-fit cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={snc}
                onChange={(e) => setSnc(e.target.checked)}
                className="size-4 accent-orange"
              />
              Senza numero civico (SNC)
            </label>

          </fieldset>

          <FormError message={step === 1 ? error : ""} />
          <Button className="mt-5 h-11 w-full rounded-lg text-[15px] font-semibold" type="submit">
            Continua
          </Button>
          <p className="mt-3 text-center text-[11px] opacity-60">
            Gratuito · Senza impegno · Stima non vincolante
          </p>
        </div>

        {/* Passaggio 2: ricevi la stima */}
        <div hidden={step !== 2}>
          <button
            type="button"
            onClick={() => vaiAl(1)}
            disabled={busy}
            className="-ml-1 mb-2 inline-flex items-center gap-0.5 text-sm font-medium text-[var(--pg-accento-testo,#ac4300)] hover:underline disabled:opacity-50"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Indietro
          </button>
          <h2
            ref={step === 2 ? titleRef : undefined}
            tabIndex={-1}
            className="mb-1 text-xl font-semibold leading-tight tracking-tight outline-none md:text-2xl"
          >
            Ricevi la stima
          </h2>
          <p className="mb-3 text-sm leading-relaxed opacity-75">
            Te la inviamo via email: è una <strong>stima orientativa</strong>, non un preventivo
            definitivo.
          </p>
          {riepilogo && (
            <p className="mb-5 truncate rounded-lg bg-background2 px-3 py-2 text-xs">
              <span className="opacity-70">RC auto · </span>
              <strong>{riepilogo}</strong>
            </p>
          )}

          {customer ? (
            <p className="mb-5 rounded-lg bg-background2 px-3 py-2 text-xs">
              Richiesta a nome di{" "}
              {customer.firstName || customer.lastName ? (
                <>
                  <strong>
                    {customer.firstName} {customer.lastName}
                  </strong>{" "}
                  ·{" "}
                </>
              ) : null}
              <span className="break-all">{customer.email}</span>
            </p>
          ) : (
            <>
              <label className={labelClassName} htmlFor="pg-email">
                Email
              </label>
              <input
                id="pg-email"
                name="email"
                type="email"
                placeholder="nome@esempio.it"
                maxLength={254}
                required
                autoComplete="email"
                inputMode="email"
                enterKeyHint="next"
                className={cn(inputClassName, "mb-4")}
              />
              <div
                className={cn(
                  sharedFieldsClassName,
                  "[&_label>span:first-child]:font-medium [&_label>span:first-child]:opacity-80"
                )}
              >
                <PhoneField
                  name="phone"
                  label="Cellulare (facoltativo)"
                  required={false}
                  onValueChange={checkReady}
                />
              </div>
              <p className="-mt-3 mb-4 text-[11px] opacity-60">
                Puoi lasciarlo vuoto. Lo useremo solo se chiedi di essere ricontattato.
              </p>
            </>
          )}

          <div>
            <Choices referentName={referentName} conCondizioni={Boolean(customer)} />
          </div>

          <FormError message={step === 2 ? error : ""} />
          {busy && (
            <div
              className="mb-4 h-1 overflow-hidden rounded bg-[#fff0e3]"
              role="status"
              aria-label="Elaborazione richiesta"
            >
              <div className="h-full w-2/5 animate-pulse bg-orange" />
            </div>
          )}
          <Button
            className="h-11 w-full rounded-lg text-[15px] font-semibold"
            type="submit"
            disabled={busy || !ready}
          >
            {busy ? "Invio in corso…" : "Ricevi la stima indicativa"}
          </Button>
          <p className="mt-3 text-center text-[11px] opacity-60">
            Ricevere la stima non comporta alcun obbligo di acquisto.
          </p>
        </div>
      </form>
    </section>
  );
};

/** "Passaggio 1 di 2" con barra a due segmenti. */
const Avanzamento = ({ step }: { step: 1 | 2 }) => (
  <div className="mb-4 md:mb-5">
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-60" aria-live="polite">
      Passaggio {step} di 2
    </p>
    <div className="flex gap-1.5" aria-hidden="true">
      {[1, 2].map((n) => (
        <span
          key={n}
          className={cn(
            "h-1 flex-1 rounded-full transition-colors",
            n <= step ? "bg-orange" : "bg-[#e6e8f0] dark:bg-white/15"
          )}
        />
      ))}
    </div>
  </div>
);
