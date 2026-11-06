import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "../components/Field";
import { Eyebrow, Panel } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { Caricamento, CenterMessage } from "./Messaggi";
import { attivaArea, datiAttivazione, type DatiAttivazione } from "../utils/api";
import { CONDIZIONI, PRIVACY } from "../utils/documenti";
import { MARKETING_TEXT } from "../utils/estimate";
import { PG_BASE, formDataToObject } from "../utils/model";

const checkClassName = "mb-4 flex items-start gap-2.5 text-xs leading-relaxed";
const boxClassName = "mt-0.5 size-4 flex-none accent-orange";

// Pagina del link personale ricevuto via email: conferma esplicita dell'adesione al servizio.
// Aprirla non accetta nulla. Condizioni da spuntare (mai preselezionate), informativa resa,
// marketing separato e facoltativo. Il server registra data/ora, versione e hash dei documenti.
const Attivazione = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [dati, setDati] = useState<DatiAttivazione | null>(null);
  const [linkError, setLinkError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return setLinkError("Il link di conferma non è completo.");
    datiAttivazione(token)
      .then(setDati)
      .catch((e) => setLinkError((e as Error).message));
  }, [token]);

  // Un cliente già in sessione con un link valido conferma comunque da qui (identità verificata dal link)
  if (session && !busy && linkError) return <Navigate to={`${PG_BASE}/area`} replace />;
  if (linkError)
    return (
      <CenterMessage
        title="Questo link non è più valido."
        action={{ to: `${PG_BASE}/accesso`, label: "Vai all’accesso" }}
      >
        {linkError} Il link si può usare una sola volta e vale 7 giorni. Se hai già
        confermato, entra con la tua email e password.
      </CenterMessage>
    );
  if (!dati) return <Caricamento label="Verifica del link…" />;

  // L'app mostra una versione dei documenti diversa da quella in vigore: va ricaricata
  const documentiCambiati =
    dati.documenti.condizioni.id !== CONDIZIONI.id || dati.documenti.privacy.id !== PRIVACY.id;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dati) return;
    const form = formDataToObject(event.currentTarget);
    if (form.condizioni !== "on")
      return setError("Per attivare il servizio devi accettare le Condizioni del servizio.");
    if (dati.temporaryPasswordRequired && !form.temporaryPassword)
      return setError("Inserisci la password temporanea che trovi nell’email.");
    if (!dati.accountEsistente) {
      if ((form.password ?? "").length < 12)
        return setError("La password deve avere almeno 12 caratteri.");
      if (form.password !== form.confirm) return setError("Le password non coincidono.");
    }

    setBusy(true);
    setError("");
    try {
      const result = await attivaArea({
        token,
        temporaryPassword: form.temporaryPassword ?? "",
        password: dati.accountEsistente ? undefined : form.password,
        condizioniAccettate: true,
        marketing: dati.accountEsistente ? null : form.marketing === "on",
      });
      if (result.alreadyRegistered) {
        toast.success("Adesione confermata. Entra con la tua password per seguire la stima.");
        navigate(session ? `${PG_BASE}/area` : `${PG_BASE}/accesso`, { replace: true });
        return;
      }
      await signIn(dati.email, form.password);
      toast.success("Adesione confermata. Stiamo preparando la tua stima.");
      navigate(`${PG_BASE}/area`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Panel className="mx-auto my-8 max-w-xl">
      <Eyebrow className="mb-3">Conferma l’adesione</Eyebrow>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        OK, il prezzo è giusto?
      </h1>
      <p className="mb-4 opacity-80">
        Servizio gratuito di Alca Broker S.r.l.: una <strong>stima indicativa e non vincolante</strong>{" "}
        della RC auto per il veicolo <strong>{dati.richiesta.targa}</strong> e il monitoraggio delle
        scadenze note. Non è un preventivo ufficiale e non rinnova né stipula polizze.
      </p>
      <p className="mb-6 rounded-md bg-background2 p-3 text-[11px] leading-relaxed">
        Richiesta <strong>{dati.richiesta.id}</strong> · email{" "}
        <strong className="break-all">{dati.email}</strong>
        <br />
        Il servizio si attiva solo quando premi “Conferma l’adesione”: aprire questa pagina non
        attiva nulla.
      </p>

      {documentiCambiati ? (
        <FormError message="I documenti del servizio sono stati aggiornati. Ricarica la pagina per leggere la versione in vigore." />
      ) : (
        <form onSubmit={submit} noValidate>
          <label className={checkClassName}>
            <input name="condizioni" type="checkbox" required className={boxClassName} />
            <span>
              Ho letto e accetto le{" "}
              <Link className="underline" to={`${PG_BASE}/condizioni`} target="_blank" rel="noopener">
                Condizioni del servizio
              </Link>{" "}
              (versione {CONDIZIONI.versione}) per il veicolo {dati.richiesta.targa}.{" "}
              <a className="underline" href={CONDIZIONI.pdf} target="_blank" rel="noopener">
                PDF
              </a>
            </span>
          </label>
          <p className="mb-4 text-xs leading-relaxed opacity-90">
            Ti abbiamo fornito l’
            <Link className="underline" to={`${PG_BASE}/privacy`} target="_blank" rel="noopener">
              Informativa privacy del servizio
            </Link>{" "}
            (versione {PRIVACY.versione},{" "}
            <a className="underline" href={PRIVACY.pdf} target="_blank" rel="noopener">
              PDF
            </a>
            ). Leggerla non equivale a un consenso.
          </p>

          {!dati.accountEsistente && (
            <fieldset className="mb-6 rounded-md border border-[#e0e2ed] p-3 dark:border-white/10">
              <legend className="px-1 text-[11px] font-semibold">Facoltativo</legend>
              <label className="flex items-start gap-2.5 text-xs leading-relaxed">
                <input name="marketing" type="checkbox" className={boxClassName} />
                <span>
                  <strong className="block">Comunicazioni commerciali</strong>
                  {MARKETING_TEXT}
                </span>
              </label>
            </fieldset>
          )}

          {dati.temporaryPasswordRequired && (
            <Field
              label="Password temporanea"
              name="temporaryPassword"
              type="password"
              required
              maxLength={128}
              autoComplete="one-time-code"
              hint="La trovi nell’email: serve a verificare che l’indirizzo sia tuo."
            />
          )}
          {dati.accountEsistente ? (
            <p className="mb-4 text-xs opacity-80">
              Hai già un’area personale con questa email: dopo la conferma entra con la tua password.
            </p>
          ) : (
            <>
              <Field
                label="Scegli una password per l’area personale"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
                hint="Almeno 12 caratteri."
              />
              <Field
                label="Ripeti la password"
                name="confirm"
                type="password"
                required
                minLength={12}
                maxLength={72}
                autoComplete="new-password"
              />
            </>
          )}
          <FormError message={error} />
          <Button className="w-full" size="lg" type="submit" disabled={busy}>
            {busy ? "Conferma in corso…" : "Conferma l’adesione"}
          </Button>
          <p className="mt-3 text-center text-[11px] opacity-70">
            Gratuito, senza obbligo di acquisto. Puoi interrompere il monitoraggio in qualsiasi momento.
          </p>
        </form>
      )}
    </Panel>
  );
};

export default Attivazione;
