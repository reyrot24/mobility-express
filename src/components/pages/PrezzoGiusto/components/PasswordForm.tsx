import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, FormError } from "./Field";
import { formDataToObject } from "../utils/model";
import { useAuth } from "../context/AuthContext";

/** Imposta una nuova password per il cliente in sessione. */
export const PasswordForm = ({
  onSave,
  submitLabel = "Salva la nuova password",
}: {
  onSave?: () => void;
  submitLabel?: string;
}) => {
  const { changePassword } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = formDataToObject(form);
    if (data.password.length < 12) return setError("La password deve avere almeno 12 caratteri.");
    if (data.password !== data.confirm) return setError("Le password non coincidono.");
    setBusy(true);
    setError("");
    try {
      await changePassword(data.password);
      form.reset();
      onSave?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
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
      <Button className="w-full" type="submit" disabled={busy}>
        {busy ? "Salvataggio…" : submitLabel}
      </Button>
    </form>
  );
};
