import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "../components/Field";
import { Eyebrow, Panel } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { Caricamento, CenterMessage } from "./Messaggi";
import { attivaArea, datiAttivazione, type DatiAttivazione } from "../utils/api";
import { CONDIZIONI } from "../utils/documenti";
import { PG_BASE } from "../utils/model";

// La password temporanea arriva nel frammento del link (#pt=...): il browser non lo invia ai server.
// La leggiamo una volta e la togliamo dalla barra degli indirizzi.
function leggiPasswordTemporanea() {
  const params = new URLSearchParams(window.location.hash.slice(1));
  const pt = params.get("pt") ?? "";
  if (pt) {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, "", pathname + search);
  }
  return pt;
}

/**
 * Pagina del link personale ricevuto via email. Condizioni, informativa, ricontatto e marketing
 * sono già stati scelti nel form: qui il cliente sceglie solo la password dell'area personale e
 * preme "Conferma". È quel pulsante a far partire la richiesta: aprire la pagina non conferma nulla.
 */
const Attivazione = () => {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { session, signIn } = useAuth();
  const navigate = useNavigate();
  const [passwordLink] = useState(leggiPasswordTemporanea);
  const [dati, setDati] = useState<DatiAttivazione | null>(null);
  const [linkError, setLinkError] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visibile, setVisibile] = useState(false);

  useEffect(() => {
    if (!token) return setLinkError("Il link di conferma non è completo.");
    datiAttivazione(token)
      .then(setDati)
      .catch((e) => setLinkError((e as Error).message));
  }, [token]);

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

  const chiediTemporanea = dati.temporaryPasswordRequired && !passwordLink;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dati) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const temporanea = passwordLink || String(form.get("temporaryPassword") ?? "");
    if (dati.condizioniDaAccettare && form.get("condizioni") !== "on")
      return setError("Per attivare il servizio accetta le Condizioni del servizio.");
    if (dati.temporaryPasswordRequired && !temporanea)
      return setError("Inserisci la password temporanea che trovi nell’email.");
    if (!dati.accountEsistente && password.length < 12)
      return setError("La password deve avere almeno 12 caratteri.");

    setBusy(true);
    setError("");
    try {
      const result = await attivaArea({
        token,
        temporaryPassword: temporanea,
        password: dati.accountEsistente ? undefined : password,
        ...(dati.condizioniDaAccettare && { condizioniAccettate: true }),
      });
      if (result.alreadyRegistered) {
        toast.success("Richiesta confermata. Entra con la tua password per seguire la stima.");
        navigate(session ? `${PG_BASE}/area` : `${PG_BASE}/accesso`, { replace: true });
        return;
      }
      await signIn(dati.email, password);
      toast.success("Richiesta confermata. Stiamo preparando la tua stima.");
      navigate(`${PG_BASE}/area`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Panel className="mx-auto my-8 max-w-md">
      <Eyebrow className="mb-3">Ultimo passaggio</Eyebrow>
      <h1 className="mb-2 text-2xl font-bold tracking-tight">Conferma la tua richiesta</h1>
      <p className="mb-5 text-sm opacity-80">
        Stima indicativa per il veicolo <strong>{dati.richiesta.targa}</strong>.{" "}
        {dati.accountEsistente
          ? "Premi “Conferma” per far partire la richiesta."
          : "Scegli una password per la tua area personale e premi “Conferma”: la richiesta parte subito."}
      </p>

      <form onSubmit={submit} noValidate>
        {dati.condizioniDaAccettare && (
          <label className="mb-4 flex items-start gap-2.5 text-xs leading-relaxed">
            <input name="condizioni" type="checkbox" required className="mt-0.5 size-4 flex-none accent-orange" />
            <span>
              Ho letto e accetto le{" "}
              <Link className="underline" to={`${PG_BASE}/condizioni`} target="_blank" rel="noopener">
                Condizioni del servizio
              </Link>{" "}
              (versione {CONDIZIONI.versione}).
            </span>
          </label>
        )}

        {chiediTemporanea && (
          <Field
            label="Password temporanea"
            name="temporaryPassword"
            type="password"
            required
            maxLength={128}
            autoComplete="one-time-code"
            hint="La trovi nell’email."
          />
        )}

        {dati.accountEsistente ? (
          <p className="mb-4 rounded-md bg-background2 p-3 text-xs">
            Hai già un’area personale con <strong className="break-all">{dati.email}</strong>: dopo
            la conferma entra con la tua password.
          </p>
        ) : (
          <>
            {/* Email nascosta: aiuta il gestore di password a salvare la credenziale giusta */}
            <input type="email" name="username" value={dati.email} autoComplete="username" readOnly hidden />
            <Field label="Scegli una password" hint={`Almeno 12 caratteri. Accedi con ${dati.email}.`}>
              <div className="relative">
                <input
                  name="password"
                  type={visibile ? "text" : "password"}
                  required
                  minLength={12}
                  maxLength={72}
                  autoComplete="new-password"
                  autoFocus
                  className="flex h-11 w-full rounded-md border border-blueText bg-white py-2 pl-3 pr-11 text-base text-blueText focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orangeHover"
                />
                <button
                  type="button"
                  onClick={() => setVisibile((v) => !v)}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-blueText opacity-70 hover:opacity-100"
                  aria-label={visibile ? "Nascondi password" : "Mostra password"}
                >
                  {visibile ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
          </>
        )}

        <FormError message={error} />
        <Button className="h-11 w-full text-[15px] font-semibold" type="submit" disabled={busy}>
          {busy ? "Conferma in corso…" : "Conferma"}
        </Button>
        <p className="mt-3 text-center text-[11px] opacity-70">
          Richiesta {dati.richiesta.id}
          {dati.referente && <> · referente {dati.referente.name}</>}
        </p>
      </form>
    </Panel>
  );
};

export default Attivazione;
