import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "../components/Field";
import { Eyebrow, Panel } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { Caricamento, CenterMessage } from "./Messaggi";
import { attivaArea, datiAttivazione, type DatiAttivazione } from "../utils/api";
import { PG_BASE, formDataToObject, isName } from "../utils/model";

// Stessa regola di server/lib/validation.js
const isPhone = (value: string) => /^\+?\d{8,15}$/.test(value.replace(/[\s.()-]/g, ""));

// Pagina del link "Attiva la tua area personale" ricevuto nell'email di conferma
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
      nome: form.nome.trim(),
      cognome: form.cognome.trim(),
      cellulare: form.cellulare.trim(),
      password: form.password,
    };
    if (!isName(payload.nome)) return setError("Inserisci il tuo nome.");
    if (!isName(payload.cognome)) return setError("Inserisci il tuo cognome.");
    if (!isPhone(payload.cellulare))
      return setError("Controlla il numero di cellulare, per esempio +39 333 123 4567.");
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
        Completa i tuoi dati e scegli una password. Appena attivi l’area
        personale prepariamo la stima e ti avvisiamo via email.
      </p>
      <form onSubmit={submit} noValidate>
        <Field label="Email" value={dati.email} readOnly disabled />
        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Nome"
            name="nome"
            defaultValue={dati.nome}
            maxLength={80}
            required
            autoComplete="given-name"
          />
          <Field
            label="Cognome"
            name="cognome"
            defaultValue={dati.cognome}
            maxLength={80}
            required
            autoComplete="family-name"
          />
        </div>
        <Field
          label="Cellulare"
          name="cellulare"
          type="tel"
          placeholder="+39 333 123 4567"
          maxLength={20}
          required
          autoComplete="tel"
        />
        <Field
          label="Password"
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
