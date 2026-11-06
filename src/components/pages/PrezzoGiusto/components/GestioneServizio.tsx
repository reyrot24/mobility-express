import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FormError } from "./Field";
import { Badge, EmptyState, Panel } from "./Surface";
import { Caricamento } from "../pages/Messaggi";
import {
  impostaMarketing,
  interrompiMonitoraggio,
  leggiServizio,
  type Adesione,
  type StatoServizio,
} from "../utils/api";
import { PRIVACY_EMAIL } from "../utils/estimate";
import { PG_BASE } from "../utils/model";

const data = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("it-IT", { dateStyle: "long", timeStyle: "short" }) : "—";

const STATO: Record<Adesione["stato"], { label: string; className: string }> = {
  attiva: { label: "Monitoraggio attivo", className: "bg-[#eef8f1] text-[#1d5a33] dark:bg-[#1d5a33] dark:text-white" },
  in_attesa: { label: "In attesa di conferma", className: "" },
  cessata: { label: "Monitoraggio interrotto", className: "bg-[#f0f1f6] text-[#40455f] dark:bg-white/10 dark:text-white" },
};

/** "Gestisci servizio / Interrompi monitoraggio": adesioni per veicolo e consenso marketing separato. */
export const GestioneServizio = ({ token }: { token: string }) => {
  const [stato, setStato] = useState<StatoServizio | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setStato(await leggiServizio(token));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !stato) return <FormError message={error} />;
  if (!stato) return <Caricamento />;

  return (
    <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
      <div className="flex min-w-0 flex-col gap-4">
        <h2 className="text-lg font-bold">OK, il prezzo è giusto? · i tuoi veicoli</h2>
        {stato.adesioni.length === 0 ? (
          <EmptyState title="Nessun servizio attivo.">
            Quando confermi l’adesione per un veicolo, la trovi qui.
          </EmptyState>
        ) : (
          stato.adesioni.map((a) => <RigaAdesione key={a.id} adesione={a} token={token} onDone={load} />)
        )}
        <p className="text-[11px] opacity-70">
          Puoi chiedere l’interruzione anche scrivendo a info@alcabroker.it. Interrompere il
          monitoraggio non modifica la tua polizza né le sue scadenze.
        </p>
      </div>
      <aside className="flex flex-col gap-5">
        <Marketing stato={stato} token={token} onDone={load} />
        <Panel>
          <h3 className="mb-2 text-base font-bold">Documenti e privacy</h3>
          <p className="mb-2 text-xs opacity-80">
            <Link className="underline" to={`${PG_BASE}/condizioni`}>
              Condizioni del servizio
            </Link>{" "}
            (v{stato.documenti.condizioni.versione}) ·{" "}
            <Link className="underline" to={`${PG_BASE}/privacy`}>
              Informativa privacy
            </Link>{" "}
            (v{stato.documenti.privacy.versione})
          </p>
          <p className="text-xs opacity-80">
            Per accesso, rettifica, cancellazione, limitazione, portabilità o opposizione scrivi a{" "}
            <strong>{PRIVACY_EMAIL}</strong> o al DPO <strong>dpo@alcabroker.it</strong>.
          </p>
        </Panel>
      </aside>
    </div>
  );
};

const RigaAdesione = ({
  adesione: a,
  token,
  onDone,
}: {
  adesione: Adesione;
  token: string;
  onDone: () => Promise<void>;
}) => {
  const [conferma, setConferma] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function interrompi() {
    setBusy(true);
    setError("");
    try {
      await interrompiMonitoraggio(a.id, token);
      toast.success(`Monitoraggio interrotto per ${a.targa}.`);
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setConferma(false);
    }
  }

  return (
    <Panel>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-bold">RC auto · {a.targa}</h3>
        <Badge className={cn(STATO[a.stato].className)}>{STATO[a.stato].label}</Badge>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-xs">
        <dt className="opacity-70">Richiesta</dt>
        <dd>{a.richiestaId ?? "—"}</dd>
        <dt className="opacity-70">Adesione confermata</dt>
        <dd>{data(a.attivataIl)}</dd>
        <dt className="opacity-70">Documenti accettati</dt>
        <dd>
          {a.condizioni ?? "—"} · {a.privacy}
        </dd>
        {a.cessataIl && (
          <>
            <dt className="opacity-70">Interrotto il</dt>
            <dd>{data(a.cessataIl)}</dd>
          </>
        )}
      </dl>
      <FormError message={error} />
      {a.stato === "attiva" &&
        (conferma ? (
          <div className="mt-4 rounded-md border border-[#f0d8c3] bg-background2 p-3 text-xs">
            <p className="mb-3">
              Da subito non riceverai più stime né comunicazioni di servizio per {a.targa}. Vuoi
              procedere?
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="destructive" onClick={interrompi} disabled={busy}>
                {busy ? "Interruzione…" : "Sì, interrompi il monitoraggio"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConferma(false)} disabled={busy}>
                Annulla
              </Button>
            </div>
          </div>
        ) : (
          <Button className="mt-4" size="sm" variant="outline" onClick={() => setConferma(true)}>
            Interrompi monitoraggio
          </Button>
        ))}
    </Panel>
  );
};

const Marketing = ({
  stato,
  token,
  onDone,
}: {
  stato: StatoServizio;
  token: string;
  onDone: () => Promise<void>;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const granted = stato.marketing.granted;

  async function cambia() {
    setBusy(true);
    setError("");
    try {
      await impostaMarketing(!granted, token);
      toast.success(granted ? "Consenso commerciale revocato." : "Consenso commerciale registrato.");
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel>
      <h3 className="mb-2 text-base font-bold">Comunicazioni commerciali</h3>
      <p className="mb-2 text-xs opacity-80">{stato.marketing.testo}</p>
      <p className="mb-3 text-xs">
        Stato: <strong>{granted ? "consenso prestato" : "consenso non prestato"}</strong>
        {stato.marketing.aggiornatoIl && (
          <span className="opacity-70"> · aggiornato il {data(stato.marketing.aggiornatoIl)}</span>
        )}
      </p>
      <FormError message={error} />
      <Button size="sm" variant="outline" onClick={cambia} disabled={busy}>
        {busy ? "Salvataggio…" : granted ? "Revoca il consenso" : "Presta il consenso"}
      </Button>
      <p className="mt-3 text-[11px] opacity-70">
        È separato dal servizio: revocarlo non interrompe il monitoraggio, e viceversa.
      </p>
    </Panel>
  );
};
