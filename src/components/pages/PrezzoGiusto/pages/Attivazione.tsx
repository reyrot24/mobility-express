import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "../components/Field";
import { Eyebrow, Panel } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { Caricamento, CenterMessage } from "./Messaggi";
import { attivaArea, datiAttivazione, type DatiAttivazione } from "../utils/api";
import { PG_BASE, formDataToObject } from "../utils/model";

// Pagina del link "Attiva la tua area personale" ricevuto nell'email di conferma.
// Nome, cognome e cellulare arrivano dalla richiesta: qui servono solo le password.
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
    if (!token) return setLinkError("Il link di attivazione non è completo.");
    datiAttivazione(token)
      .then(setDati)
      .catch((e) => setLinkError((e as Error).message));
  }, [token]);

  if (session && !busy) return <Navigate to={`${PG_BASE}/area`} replace />;
  if (linkError)
    return (
      <CenterMessage
        title="Questo link non è più valido."
        action={{ to: `${PG_BASE}/accesso`, label: "Vai all’accesso" }}
      >
        {linkError} Se hai già attivato l’area personale, entra con la tua
        email e password.
      </CenterMessage>
    );
  if (!dati) return <Caricamento label="Verifica del link…" />;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dati) return;
    const form = formDataToObject(event.currentTarget);
    const payload = {
      token,
      temporaryPassword: form.temporaryPassword ?? "",
      password: form.password,
    };
    if (dati.temporaryPasswordRequired && !payload.temporaryPassword)
      return setError("Inserisci la password temporanea che trovi nell’email.");
    if (payload.password.length < 12)
      return setError("La password deve avere almeno 12 caratteri.");
    if (payload.password !== form.confirm) return setError("Le password non coincidono.");

    setBusy(true);
    setError("");
    try {
      const result = await attivaArea(payload);
      if (result.alreadyRegistered) {
        toast.success("Hai già un’area personale: entra con la tua password.");
        navigate(`${PG_BASE}/accesso`, { replace: true });
        return;
      }
      await signIn(dati.email, payload.password);
      toast.success("Area personale attivata. Stiamo preparando la tua stima.");
      navigate(`${PG_BASE}/area`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <Panel className="mx-auto my-8 max-w-lg">
      <Eyebrow className="mb-3">Attiva la tua area personale</Eyebrow>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        Ultimo passaggio.
      </h1>
      <p className="mb-6 opacity-80">
        {dati.temporaryPasswordRequired
          ? "Inserisci la password temporanea ricevuta via email e scegli una nuova password."
          : "Scegli una password."}{" "}
        Appena attivi l’area personale prepariamo la stima e ti avvisiamo via email.
      </p>
      <form onSubmit={submit} noValidate>
        <Field label="Email" value={dati.email} readOnly disabled />
        {dati.temporaryPasswordRequired && (
          <Field
            label="Password temporanea"
            name="temporaryPassword"
            type="password"
            required
            maxLength={128}
            autoComplete="current-password"
            hint="La trovi nell’email di attivazione."
          />
        )}
        <Field
          label="Nuova password"
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
        <FormError message={error} />
        <Button className="w-full" size="lg" type="submit" disabled={busy}>
          {busy ? "Attivazione in corso…" : "Attiva l’area personale"}
        </Button>
      </form>
    </Panel>
  );
};

export default Attivazione;
