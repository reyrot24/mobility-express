import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError, selectClassName } from "./Field";
import { Choices } from "./Choices";
import {
  ROAD_TYPES,
  formDataToObject,
  validateQuote,
  type QuoteRequest,
} from "../utils/model";

type Customer = { firstName: string; lastName: string; email: string };

type Props = {
  onSubmit: (data: QuoteRequest, idempotencyKey: string) => Promise<void>;
  referentName?: string;
  /** Cliente in sessione: nome, cognome ed email non vengono richiesti di nuovo */
  customer?: Customer;
};

const residenceLabel = "mb-1 text-[11px] font-medium opacity-80";

export const QuoteForm = ({ onSubmit, referentName, customer }: Props) => {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  // Stessa chiave per i tentativi ripetuti dello stesso invio: il server non duplica la richiesta
  const idempotencyKey = useRef(crypto.randomUUID());

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    const form = event.currentTarget;
    let data: QuoteRequest;
    try {
      data = validateQuote({ ...formDataToObject(form), ...customer });
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
      if (customer) form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl border border-[#f0d6c0] border-t-4 border-t-orange bg-background1 p-5 shadow-[0_15px_45px_#040c5408] dark:border-white/10 dark:border-t-orange md:p-7"
      aria-label="Richiedi una stima indicativa RC auto"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight">
          Una stima per orientarti.
        </h2>
        <span
          className="grid size-9 place-items-center rounded-full border border-[#ffd4b1] bg-[#fff0e3] text-[#ac4300]"
          aria-hidden="true"
        >
          ✓
        </span>
      </div>
      <p className="mb-5 text-xs opacity-80">
        Ricevi via email un intervallo indicativo per la RC auto.
      </p>
      <form onSubmit={submit} noValidate>
        {customer ? (
          <p className="mb-4 rounded-md bg-background2 p-3 text-xs">
            Richiesta a nome di{" "}
            <strong>
              {customer.firstName} {customer.lastName}
            </strong>{" "}
            · <span className="break-all">{customer.email}</span>
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Nome"
              name="firstName"
              placeholder="Mario"
              maxLength={80}
              required
              autoComplete="given-name"
            />
            <Field
              label="Cognome"
              name="lastName"
              placeholder="Rossi"
              maxLength={80}
              required
              autoComplete="family-name"
            />
          </div>
        )}

        <Field label="Targa del veicolo">
          <div className="relative">
            <b
              className="absolute inset-y-px left-px grid w-9 place-items-center rounded-l-md bg-[#173c7b] text-xs text-white"
              aria-hidden="true"
            >
              I
            </b>
            <input
              name="plate"
              aria-label="Targa del veicolo"
              placeholder="AB 123 CD"
              maxLength={12}
              required
              autoComplete="off"
              className="flex h-10 w-full rounded-md border border-blueText bg-white py-2 pl-12 pr-3 text-sm font-semibold uppercase tracking-widest text-blueText placeholder:font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orangeHover"
            />
          </div>
        </Field>

        <fieldset className="mb-4 min-w-0">
          <legend className="mb-2 text-xs font-semibold">
            Indirizzo di residenza
          </legend>
          <div className="grid grid-cols-[96px_minmax(0,1fr)_76px] gap-2">
            <Field
              label="Tipo"
              labelClassName={residenceLabel}
              className="mb-2"
            >
              <select
                name="streetType"
                defaultValue="Via"
                required
                className={selectClassName}
              >
                {ROAD_TYPES.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </Field>
            <Field
              label="Indirizzo"
              labelClassName={residenceLabel}
              className="mb-2"
              name="street"
              placeholder="Es. Garibaldi"
              maxLength={120}
              required
              autoComplete="address-line1"
            />
            <Field
              label="N° civico"
              labelClassName={residenceLabel}
              className="mb-2"
              name="houseNumber"
              placeholder="12/A"
              maxLength={12}
              required
              autoComplete="address-line2"
            />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
            <Field
              label="Comune"
              labelClassName={residenceLabel}
              className="mb-0"
              name="city"
              placeholder="Es. Milano"
              maxLength={80}
              required
              autoComplete="address-level2"
            />
            <Field
              label="CAP"
              labelClassName={residenceLabel}
              className="mb-0"
              name="zip"
              placeholder="20100"
              maxLength={5}
              inputMode="numeric"
              required
              autoComplete="postal-code"
            />
          </div>
          <p className="mt-2 text-[11px] opacity-70">
            Senza numero civico? Inserisci SNC.
          </p>
        </fieldset>

        {!customer && (
          <Field
            label="La tua email"
            name="email"
            type="email"
            placeholder="nome@esempio.it"
            maxLength={254}
            required
            autoComplete="email"
          />
        )}

        <Choices referentName={referentName} />

        <FormError message={error} />
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
          className="h-12 w-full text-sm font-bold"
          type="submit"
          disabled={busy}
        >
          {busy ? "Invio in corso…" : "Ricevi la stima indicativa"}
        </Button>
        <p className="mt-3 text-center text-[11px] opacity-70">
          Ricevere la stima non comporta alcun obbligo di acquisto.
        </p>
      </form>
    </section>
  );
};
