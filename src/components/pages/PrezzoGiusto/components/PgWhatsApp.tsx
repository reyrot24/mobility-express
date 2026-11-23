import { useState, type FormEvent } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { WhatsAppButton } from "@/components/ui/FloatingWhatsApp";
import { Button } from "@/components/ui/button";
import { InfoDialog } from "./Dialogs";
import { Field, FormError } from "./Field";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { whatsappLink } from "../utils/pagina";
import { isName } from "../utils/model";

const TARGA = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

// Nome scritto nel popup: resta nel browser, così non lo chiediamo di nuovo.
// "Continua senza nome" vale solo per la visita (sessionStorage).
const NOME_KEY = "pg-whatsapp-nome";
const SALTA_KEY = "pg-whatsapp-salta-nome";

const leggi = (storage: () => Storage, key: string) => {
  try {
    return storage().getItem(key) ?? "";
  } catch {
    return "";
  }
};
const scrivi = (storage: () => Storage, key: string, value: string) => {
  try {
    storage().setItem(key, value);
  } catch {
    // Browser senza storage (es. navigazione privata): il nome vale solo per questo messaggio
  }
};

/**
 * Chat con il referente del link. Senza il suo numero di WhatsApp l'icona non compare.
 * Il messaggio cita la targa (form, ultima richiesta inviata o area personale) solo se è completa
 * e il nome del cliente quando lo conosciamo. Senza targa né nome, prima di aprire WhatsApp un
 * popup chiede il nome, così il referente sa chi gli scrive. Il nome non viene salvato sul server.
 */
export const PgWhatsApp = () => {
  const { activeRef, targaForm, current, cliente } = usePrezzoGiusto();
  const [nomeSalvato, setNomeSalvato] = useState(() => leggi(() => localStorage, NOME_KEY));
  const [saltato, setSaltato] = useState(() => leggi(() => sessionStorage, SALTA_KEY) === "1");
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [errore, setErrore] = useState("");

  if (!activeRef.whatsapp) return null;
  const numero = activeRef.whatsapp;
  const targa = [targaForm, current?.plate, cliente?.targa].find((t) => t && TARGA.test(t)) ?? null;
  const nomeNoto = cliente?.nome || nomeSalvato || null;
  const chiediNome = !targa && !nomeNoto && !saltato;

  const apri = (n: string | null) => {
    window.open(whatsappLink(numero, targa, n), "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  function conferma(e: FormEvent) {
    e.preventDefault();
    const n = nome.trim().replace(/\s+/g, " ");
    if (n && !isName(n)) {
      setErrore("Controlla il nome: usa solo lettere.");
      return;
    }
    if (!n) return salta();
    scrivi(() => localStorage, NOME_KEY, n);
    setNomeSalvato(n);
    apri(n);
  }

  function salta() {
    scrivi(() => sessionStorage, SALTA_KEY, "1");
    setSaltato(true);
    apri(null);
  }

  return (
    <>
      <WhatsAppButton
        href={whatsappLink(numero, targa, nomeNoto)}
        large
        onClick={
          chiediNome
            ? (e) => {
                e.preventDefault();
                setErrore("");
                setOpen(true);
              }
            : undefined
        }
      />
      <InfoDialog open={open} onOpenChange={setOpen} title="Come ti chiami?" className="max-w-sm">
        <p>Lo aggiungiamo al messaggio, così {activeRef.name || "il tuo referente"} sa chi sta scrivendo.</p>
        <form onSubmit={conferma} noValidate className="pt-1">
          <Field
            label="Nome e cognome"
            autoComplete="name"
            autoFocus
            maxLength={80}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          {errore && <FormError message={errore} />}
          <Button type="submit" className="w-full gap-2">
            <FaWhatsapp size={18} />
            Apri WhatsApp
          </Button>
          <button
            type="button"
            onClick={salta}
            className="mt-3 w-full text-center text-xs underline underline-offset-4 opacity-80 hover:opacity-100"
          >
            Continua senza nome
          </button>
        </form>
      </InfoDialog>
    </>
  );
};
