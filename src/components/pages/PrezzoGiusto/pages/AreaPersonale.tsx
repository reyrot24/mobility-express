import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageTitle } from "../components/PageTitle";
import { RefPerson } from "../components/Referente";
import { PasswordForm } from "../components/PasswordForm";
import { QuoteForm } from "../components/QuoteForm";
import { Field, FormError } from "../components/Field";
import { Badge, DarkCard, EmptyState, Notice, Panel, TextButton } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { Caricamento } from "./Messaggi";
import {
  estimateOf,
  fetchProfilo,
  fetchRichieste,
  indirizzoOf,
  referenteOf,
  updateProfilo,
  type Profilo,
  type Richiesta,
} from "../utils/account";
import { STATUS_LABELS, estimateLabel } from "../utils/estimate";
import { PG_BASE, formDataToObject, isName, type QuoteRequest } from "../utils/model";

type Tab = "richieste" | "nuova" | "dati" | "polizze";

// Finché ci sono richieste in elaborazione ricarichiamo l'elenco periodicamente
const POLL_MS = 8000;

const AreaPersonale = () => {
  const { session, loading, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>("richieste");
  const [profilo, setProfilo] = useState<Profilo | null>(null);
  const [richieste, setRichieste] = useState<Richiesta[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, r] = await Promise.all([fetchProfilo(userId), fetchRichieste()]);
      setProfilo(p);
      setRichieste(r);
      setLoadError("");
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = richieste?.some((r) => r.stato === "in_elaborazione") ?? false;
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [pending, load]);

  if (loading) return <Caricamento />;
  if (!session) return <Navigate to={`${PG_BASE}/accesso`} replace />;

  const tabClass = (active: boolean) =>
    cn(
      "-mb-px whitespace-nowrap border-b-2 py-3.5 text-sm font-medium",
      active ? "border-text" : "border-transparent opacity-70"
    );
  const tabs: [Tab, string][] = [
    ["richieste", `Le mie richieste${richieste ? ` (${richieste.length})` : ""}`],
    ["nuova", "Nuova richiesta"],
    ["dati", "I miei dati"],
    ["polizze", "Le mie polizze"],
  ];

  return (
    <>
      <PageTitle
        eyebrow="La tua area personale"
        title={profilo?.nome ? `Ciao ${profilo.nome}.` : "Qui comincia la tua tranquillità."}
        description={session.user.email}
      >
        <Button size="lg" className="w-full md:w-auto" onClick={() => setTab("nuova")}>
          Nuova richiesta
        </Button>
      </PageTitle>

      <div
        className="my-6 flex gap-6 overflow-x-auto border-b border-[#e0e2ed] dark:border-white/10"
        aria-label="Sezioni dell’area personale"
      >
        {tabs.map(([key, label]) => (
          <button
            key={key}
            aria-pressed={tab === key}
            className={tabClass(tab === key)}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {loadError && <FormError message={loadError} />}

      {tab === "richieste" &&
        (richieste === null ? (
          !loadError && <Caricamento />
        ) : (
          <ElencoRichieste richieste={richieste} onNew={() => setTab("nuova")} />
        ))}

      {tab === "nuova" && (
        <NuovaRichiesta
          profilo={profilo}
          email={session.user.email ?? ""}
          onSent={async () => {
            await load();
            setTab("richieste");
          }}
        />
      )}

      {tab === "dati" && profilo && (
        <IMieiDati
          userId={session.user.id}
          email={session.user.email ?? ""}
          profilo={profilo}
          onSaved={setProfilo}
        />
      )}

      {tab === "polizze" && (
        <EmptyState title="Il posto per le tue prossime polizze.">
          Quando una proposta diventerà una polizza, potrai ritrovarla qui.
        </EmptyState>
      )}

      <TextButton className="mt-8" onClick={signOut}>
        Esci dall’area personale
      </TextButton>
    </>
  );
};

const statusBadgeClass: Record<Richiesta["stato"], string> = {
  in_attesa_attivazione: "",
  in_elaborazione: "",
  completata: "bg-[#eef8f1] text-[#1d5a33] dark:bg-[#1d5a33] dark:text-white",
  non_disponibile: "bg-[#f0f1f6] text-[#40455f] dark:bg-white/10 dark:text-white",
  errore: "bg-[#fff1ec] text-[#a72e28] dark:bg-[#a72e28] dark:text-white",
};

const statusNote: Partial<Record<Richiesta["stato"], string>> = {
  in_elaborazione: "Stiamo preparando la stima: ti scriveremo appena è pronta.",
  non_disponibile: "Per questa richiesta non è disponibile una stima automatica.",
  errore: "Si è verificato un problema tecnico. Ti ricontatteremo noi.",
};

const ElencoRichieste = ({
  richieste,
  onNew,
}: {
  richieste: Richiesta[];
  onNew: () => void;
}) =>
  richieste.length ? (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <div className="flex flex-col gap-5">
        {richieste.map((r) => {
          const estimate = estimateOf(r);
          return (
            <Panel key={r.id}>
              <div className="mb-4 flex items-start justify-between gap-5">
                <div>
                  <Badge className={statusBadgeClass[r.stato]}>
                    {STATUS_LABELS[r.stato]}
                  </Badge>
                  <h3 className="mt-3 text-lg font-bold">RC auto · {r.targa}</h3>
                </div>
                {estimate && (
                  <strong className="text-right text-xl font-semibold">
                    {estimateLabel(estimate)}
                    <small className="block text-[11px] font-normal opacity-70">
                      all’anno · indicativo
                    </small>
                  </strong>
                )}
              </div>
              <p className="text-xs opacity-80">
                Richiesta del {new Date(r.created_at).toLocaleDateString("it-IT")} ·{" "}
                {r.id}
                <br />
                {indirizzoOf(r)}
              </p>
              {statusNote[r.stato] && (
                <p className="mt-3 text-xs opacity-80">{statusNote[r.stato]}</p>
              )}
              <hr className="my-6 border-[#e0e2ed] dark:border-white/10" />
              <RefPerson referral={referenteOf(r)} />
              <Button asChild variant="outline" className="mt-6 w-full">
                <Link to={`${PG_BASE}/area/stima/${r.id}`}>Visualizza i dettagli</Link>
              </Button>
            </Panel>
          );
        })}
      </div>
      <aside className="flex flex-col gap-5">
        <DarkCard>
          <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffb780]">
            Una persona, oltre al prezzo
          </div>
          <h2 className="text-2xl font-bold">
            La scelta giusta
            <br />
            si fa insieme.
          </h2>
          <p className="mt-6">
            Il range è un orientamento. Puoi richiedere un ricontatto per
            valutare garanzie, condizioni e un preventivo effettivo.
          </p>
        </DarkCard>
      </aside>
    </div>
  ) : (
    <EmptyState title="La tua prima stima ti aspetta.">
      <p>Non ci sono ancora richieste nella tua area.</p>
      <Button size="lg" className="mt-6" onClick={onNew}>
        Richiedi una stima
      </Button>
    </EmptyState>
  );

const NuovaRichiesta = ({
  profilo,
  email,
  onSent,
}: {
  profilo: Profilo | null;
  email: string;
  onSent: () => Promise<void>;
}) => {
  const { activeRef, submitQuote } = usePrezzoGiusto();
  if (!profilo) return <Caricamento />;

  async function submit(data: QuoteRequest, idempotencyKey: string) {
    // Il codice del referente di provenienza viene inviato anche dalle richieste dell'area
    await submitQuote(data, idempotencyKey, profilo?.referral_id);
    toast.success("Richiesta inviata. Ti scriveremo appena la stima è pronta.");
    await onSent();
  }

  return (
    <div className="mx-auto max-w-xl">
      {!(isName(profilo.nome) && isName(profilo.cognome)) ? (
        <Notice>
          Completa nome e cognome nella sezione “I miei dati” prima di fare una
          nuova richiesta.
        </Notice>
      ) : (
        <QuoteForm
          onSubmit={submit}
          referentName={activeRef.name}
          customer={{ firstName: profilo.nome, lastName: profilo.cognome, email }}
        />
      )}
    </div>
  );
};

const IMieiDati = ({
  userId,
  email,
  profilo,
  onSaved,
}: {
  userId: string;
  email: string;
  profilo: Profilo;
  onSaved: (profilo: Profilo) => void;
}) => {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = formDataToObject(event.currentTarget);
    const next = {
      nome: data.nome.trim(),
      cognome: data.cognome.trim(),
      cellulare: data.cellulare.replace(/[\s.()-]/g, ""),
    };
    if (!isName(next.nome)) return setError("Inserisci il tuo nome.");
    if (!isName(next.cognome)) return setError("Inserisci il tuo cognome.");
    if (!/^\+?\d{8,15}$/.test(next.cellulare))
      return setError("Controlla il numero di cellulare, per esempio +39 333 123 4567.");
    setBusy(true);
    setError("");
    try {
      await updateProfilo(userId, next);
      onSaved({ ...profilo, ...next });
      toast.success("Dati aggiornati.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Panel>
        <h3 className="mb-4 text-lg font-bold">I tuoi dati</h3>
        <form onSubmit={save} noValidate>
          <Field
            label="Nome"
            name="nome"
            defaultValue={profilo.nome}
            maxLength={80}
            autoComplete="given-name"
          />
          <Field
            label="Cognome"
            name="cognome"
            defaultValue={profilo.cognome}
            maxLength={80}
            autoComplete="family-name"
          />
          <Field
            label="Cellulare"
            name="cellulare"
            type="tel"
            defaultValue={profilo.cellulare}
            placeholder="+39 333 123 4567"
            maxLength={20}
            autoComplete="tel"
          />
          <Field
            label="Email"
            value={email}
            readOnly
            disabled
            hint="Per cambiare email scrivici: ti aiuteremo a spostare le tue richieste."
          />
          <FormError message={error} />
          <Button type="submit" disabled={busy}>
            {busy ? "Salvataggio…" : "Salva"}
          </Button>
        </form>
      </Panel>
      <Panel className="h-fit">
        <h3 className="mb-4 text-lg font-bold">Cambia password</h3>
        <PasswordForm onSave={() => toast.success("Password aggiornata.")} />
      </Panel>
    </div>
  );
};

export default AreaPersonale;
