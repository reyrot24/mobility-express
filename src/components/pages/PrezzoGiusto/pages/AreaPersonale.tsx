import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Check, LoaderCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PageTitle } from "../components/PageTitle";
import { PasswordForm } from "../components/PasswordForm";
import { QuoteForm } from "../components/QuoteForm";
import { Field, FormError } from "../components/Field";
import { Badge, DarkCard, EmptyState, Notice, Panel } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { Caricamento } from "./Messaggi";
import {
  estimateOf,
  fetchProfilo,
  fetchRichieste,
  indirizzoOf,
  updateProfilo,
  type Profilo,
  type Richiesta,
} from "../utils/account";
import { STATUS_LABELS, estimateLabel } from "../utils/estimate";
import {
  PG_BASE,
  formDataToObject,
  isName,
  isPhone,
  normalizePhone,
  type QuoteRequest,
} from "../utils/model";

type Tab = "richieste" | "nuova" | "dati" | "polizze";

// Finché ci sono richieste in elaborazione ricarichiamo l'elenco periodicamente
const POLL_MS = 8000;

const AreaPersonale = () => {
  const { session, loading } = useAuth();
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

// Icona accanto all'etichetta dello stato: caricamento finché la stima è in elaborazione, check quando è pronta
const StatoBadge = ({ stato, className }: { stato: Richiesta["stato"]; className?: string }) => (
  <Badge className={cn("items-center gap-1", statusBadgeClass[stato], className)}>
    {stato === "in_elaborazione" && (
      <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
    )}
    {stato === "completata" && <Check className="size-3" strokeWidth={3} aria-hidden="true" />}
    {STATUS_LABELS[stato]}
  </Badge>
);

// Ordine dei filtri: prima gli stati su cui il cliente può fare qualcosa
const FILTRI: Richiesta["stato"][] = [
  "completata",
  "in_elaborazione",
  "non_disponibile",
  "errore",
  "in_attesa_attivazione",
];

type Filtro = Richiesta["stato"] | "tutte";

// Raggruppa per targa, con i gruppi ordinati dalla richiesta più recente
function perTarga(richieste: Richiesta[]) {
  const gruppi = new Map<string, Richiesta[]>();
  const recenti = [...richieste].sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const r of recenti) gruppi.set(r.targa, [...(gruppi.get(r.targa) ?? []), r]);
  return [...gruppi.entries()];
}

const chipClass = (active: boolean) =>
  cn(
    "whitespace-nowrap rounded-full border px-3.5 py-1.5 text-xs font-medium",
    active
      ? "border-text bg-text text-background1"
      : "border-[#d5d8e6] hover:border-text dark:border-white/20"
  );

const ElencoRichieste = ({ richieste, onNew }: { richieste: Richiesta[]; onNew: () => void }) => {
  const [filtro, setFiltro] = useState<Filtro>("tutte");

  if (!richieste.length)
    return (
      <EmptyState title="La tua prima stima ti aspetta.">
        <p>Non ci sono ancora richieste nella tua area.</p>
        <Button size="lg" className="mt-6" onClick={onNew}>
          Richiedi una stima
        </Button>
      </EmptyState>
    );

  const conteggi = new Map<Filtro, number>([["tutte", richieste.length]]);
  for (const r of richieste) conteggi.set(r.stato, (conteggi.get(r.stato) ?? 0) + 1);
  const filtri: Filtro[] = ["tutte", ...FILTRI.filter((stato) => conteggi.has(stato))];
  const gruppi = perTarga(
    filtro === "tutte" ? richieste : richieste.filter((r) => r.stato === filtro)
  );

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <div className="flex min-w-0 flex-col gap-5">
        {filtri.length > 2 && (
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            role="group"
            aria-label="Filtra per stato"
          >
            {filtri.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filtro === f}
                className={chipClass(filtro === f)}
                onClick={() => setFiltro(f)}
              >
                {f === "tutte" ? "Tutte" : STATUS_LABELS[f]} ({conteggi.get(f)})
              </button>
            ))}
          </div>
        )}

        {/* Con il filtro cambia la key: i gruppi tornano all'apertura predefinita */}
        <div key={filtro} className="flex flex-col gap-4">
          {gruppi.map(([targa, items], i) => (
            <GruppoTarga
              key={targa}
              targa={targa}
              richieste={items}
              open={i === 0 || filtro !== "tutte"}
            />
          ))}
        </div>
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
            Il range è un orientamento. Puoi richiedere un ricontatto per valutare garanzie,
            condizioni e un preventivo effettivo.
          </p>
        </DarkCard>
      </aside>
    </div>
  );
};

const GruppoTarga = ({
  targa,
  richieste,
  open,
}: {
  targa: string;
  richieste: Richiesta[];
  open: boolean;
}) => {
  const ultima = richieste[0];
  return (
    <details
      open={open}
      className="group rounded-xl border border-[#e0e2ed] bg-background1 dark:border-white/10"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <h3 className="text-lg font-bold">RC auto · {targa}</h3>
          <p className="text-xs opacity-70">
            {richieste.length === 1 ? "1 richiesta" : `${richieste.length} richieste`} · ultima del{" "}
            {new Date(ultima.created_at).toLocaleDateString("it-IT")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StatoBadge stato={ultima.stato} className="hidden sm:inline-flex" />
          <span aria-hidden="true" className="text-lg transition-transform group-open:rotate-180">
            ⌄
          </span>
        </div>
      </summary>
      <ul className="border-t border-[#e0e2ed] dark:border-white/10">
        {richieste.map((r) => (
          <RigaRichiesta key={r.id} richiesta={r} />
        ))}
      </ul>
    </details>
  );
};

const RigaRichiesta = ({ richiesta: r }: { richiesta: Richiesta }) => {
  const estimate = estimateOf(r);
  return (
    <li className="border-b border-[#e0e2ed] last:border-b-0 dark:border-white/10">
      <Link
        to={`${PG_BASE}/area/stima/${r.id}`}
        className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-background2"
      >
        <div className="min-w-0">
          <StatoBadge stato={r.stato} />
          <p className="mt-2 truncate text-xs opacity-80">
            {new Date(r.created_at).toLocaleDateString("it-IT")} · {indirizzoOf(r)}
          </p>
          {statusNote[r.stato] && <p className="mt-1 text-xs opacity-70">{statusNote[r.stato]}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-right">
          {estimate && (
            <strong className="text-base font-semibold">
              {estimateLabel(estimate)}
              <small className="block text-[11px] font-normal opacity-70">
                all’anno · indicativo
              </small>
            </strong>
          )}
          <span aria-hidden="true" className="opacity-60">
            ›
          </span>
        </div>
      </Link>
    </li>
  );
};

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
      {!isPhone(profilo.cellulare) ? (
        <Notice>
          Completa il cellulare nella sezione “I miei dati” prima di fare una nuova richiesta.
        </Notice>
      ) : (
        <QuoteForm
          onSubmit={submit}
          referentName={activeRef.name}
          customer={{
            firstName: profilo.nome,
            lastName: profilo.cognome,
            phone: profilo.cellulare,
            email,
          }}
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
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function logout() {
    await signOut();
    navigate(PG_BASE);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = formDataToObject(event.currentTarget);
    const next = {
      nome: data.nome.trim(),
      cognome: data.cognome.trim(),
      cellulare: normalizePhone(data.cellulare),
    };
    if (next.nome && !isName(next.nome)) return setError("Controlla il nome.");
    if (next.cognome && !isName(next.cognome)) return setError("Controlla il cognome.");
    if (!isPhone(next.cellulare))
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
            placeholder="Mario"
            maxLength={80}
            autoComplete="given-name"
          />
          <Field
            label="Cognome"
            name="cognome"
            defaultValue={profilo.cognome}
            placeholder="Rossi"
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
      <div className="flex flex-col gap-6">
        <Panel>
          <h3 className="mb-4 text-lg font-bold">Cambia password</h3>
          <PasswordForm onSave={() => toast.success("Password aggiornata.")} />
        </Panel>
        <Panel>
          <h3 className="mb-2 text-lg font-bold">Esci</h3>
          <p className="mb-4 opacity-80">
            Chiudi la sessione su questo dispositivo. Potrai rientrare con email e password.
          </p>
          <Button variant="outline" onClick={logout}>
            Esci dall’area personale
          </Button>
        </Panel>
      </div>
    </div>
  );
};

export default AreaPersonale;
