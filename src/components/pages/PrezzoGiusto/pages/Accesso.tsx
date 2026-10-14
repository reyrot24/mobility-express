import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "../components/Field";
import { InfoDialog } from "../components/Dialogs";
import { Eyebrow, Panel, TextButton } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { Caricamento } from "./Messaggi";
import { PG_BASE, formDataToObject } from "../utils/model";

const Accesso = () => {
  const { session, loading, signIn, sendResetLink } = useAuth();
  const { current } = usePrezzoGiusto();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");

  if (loading) return <Caricamento />;
  if (session) return <Navigate to={`${PG_BASE}/area`} replace />;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { email, password } = formDataToObject(event.currentTarget);
    if (!email.trim() || !password) return setError("Inserisci email e password.");
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
      navigate(`${PG_BASE}/area`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function reset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { email } = formDataToObject(event.currentTarget);
    if (!email.trim()) return setResetError("Inserisci la tua email.");
    setResetError("");
    try {
      await sendResetLink(email);
      setResetSent(true);
    } catch (e) {
      setResetError((e as Error).message);
    }
  }

  return (
    <Panel className="mx-auto my-8 max-w-lg">
      <Eyebrow className="mb-3">La tua area personale</Eyebrow>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        Le tue stime.
        <br />
        Sempre a portata.
      </h1>
      <p className="mb-6 opacity-80">
        Entra con l’email e la password che hai scelto quando hai attivato
        l’area personale.
      </p>
      <form onSubmit={submit} noValidate>
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="nome@esempio.it"
          required
          autoComplete="email"
          defaultValue={current?.email ?? ""}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
        />
        <FormError message={error} />
        <Button className="w-full" size="lg" type="submit" disabled={busy}>
          {busy ? "Accesso in corso…" : "Entra"}
        </Button>
      </form>
      <TextButton
        className="mt-6"
        onClick={() => {
          setResetSent(false);
          setResetOpen(true);
        }}
      >
        Hai dimenticato la password?
      </TextButton>

      <InfoDialog
        title="Reimposta la password."
        open={resetOpen}
        onOpenChange={setResetOpen}
      >
        {resetSent ? (
          <p>
            Se l’indirizzo è registrato, riceverai a breve un’email con il link
            per scegliere una nuova password.
          </p>
        ) : (
          <form onSubmit={reset} noValidate>
            <p className="mb-4">
              Ti invieremo un link per scegliere una nuova password.
            </p>
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="nome@esempio.it"
              required
              autoComplete="email"
            />
            <FormError message={resetError} />
            <Button className="w-full" type="submit">
              Invia il link
            </Button>
          </form>
        )}
      </InfoDialog>
    </Panel>
  );
};

export default Accesso;
