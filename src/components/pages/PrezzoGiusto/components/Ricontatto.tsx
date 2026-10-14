import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { FormError } from "./Field";
import { InfoDialog, PrivacyDialog } from "./Dialogs";
import { TextButton } from "./Surface";
import { useAuth } from "../context/AuthContext";
import { richiediRicontatto } from "../utils/api";
import type { Referente } from "../utils/model";

type Props = {
  requestId: string;
  granted: boolean;
  referente: Referente;
  email: string;
  onDone: () => void;
};

/** Stato del ricontatto oppure il pulsante per richiederlo, con conferma esplicita. */
export const ContactAction = ({ requestId, granted, referente, email, onDone }: Props) => {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (granted)
    return (
      <div
        className="mt-6 rounded-lg border border-[#b9dfc4] bg-[#eef8f1] p-4 text-xs text-[#1d5a33]"
        role="status"
      >
        <strong className="block">Ricontatto richiesto via email</strong>
        Il referente {referente.name} ti scriverà a {email}.
      </div>
    );

  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!session) throw new Error("Accedi di nuovo alla tua area personale.");
      await richiediRicontatto(requestId, session.access_token);
      setOpen(false);
      onDone();
      toast.success("Richiesta di ricontatto inviata.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button className="mt-6 w-full" size="lg" onClick={() => setOpen(true)}>
        Chiedi il preventivo effettivo
      </Button>
      <InfoDialog
        title="Richiedi un preventivo effettivo."
        open={open}
        onOpenChange={setOpen}
      >
        <p>
          Chiedi a <strong>{referente.name}</strong> di ricontattarti a{" "}
          <strong className="break-all">{email}</strong> per raccogliere
          le informazioni necessarie al preventivo effettivo.
        </p>
        <form onSubmit={confirm}>
          <label className="mb-3 flex items-start gap-2.5 text-xs">
            <input
              name="confirmCallback"
              type="checkbox"
              required
              className="mt-1 size-4 flex-none accent-orange"
            />
            <span>
              Chiedo questo ricontatto via email per la mia richiesta. Ho letto
              l’
              <PrivacyDialog
                trigger={<TextButton>informativa privacy</TextButton>}
              />
              .
            </span>
          </label>
          <p className="mb-4 text-[11px] opacity-70">
            Questa scelta non autorizza comunicazioni commerciali ulteriori.
          </p>
          <FormError message={error} />
          <Button className="w-full" type="submit" disabled={busy}>
            Conferma la richiesta di ricontatto
          </Button>
        </form>
      </InfoDialog>
    </>
  );
};
