import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PageTitle } from "../components/PageTitle";
import { Contact } from "../components/Referente";
import { NotaStimaDialog } from "../components/Dialogs";
import { EstimateNotice, EstimatePrice } from "../components/Estimate";
import { FormError } from "../components/Field";
import { ContactAction } from "../components/Ricontatto";
import { DarkCard, DetailLine, Panel, TextButton } from "../components/Surface";
import { Caricamento, CenterMessage } from "./Messaggi";
import { useAuth } from "../context/AuthContext";
import {
  estimateOf,
  fetchRichiesta,
  indirizzoOf,
  referenteOf,
  type Richiesta,
} from "../utils/account";
import { PG_BASE } from "../utils/model";
import { PRIVACY_EMAIL, STATUS_LABELS } from "../utils/estimate";

const DettaglioStima = () => {
  const { id } = useParams();
  const { session, loading } = useAuth();
  // undefined = in caricamento, null = non trovata (o non del cliente)
  const [r, setR] = useState<Richiesta | null | undefined>(undefined);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id || !session) return;
    try {
      setR(await fetchRichiesta(id));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id, session]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Caricamento />;
  if (!session) return <Navigate to={`${PG_BASE}/accesso`} replace />;
  if (error) return <FormError message={error} />;
  if (r === undefined) return <Caricamento />;
  if (r === null)
    return (
      <CenterMessage
        title="Richiesta non trovata."
        action={{ to: `${PG_BASE}/area`, label: "Torna alle mie richieste" }}
      />
    );

  const referente = referenteOf(r);
  const email = session.user.email ?? "";

  return (
    <>
      <PageTitle
        eyebrow={`${r.id} · ${new Date(r.created_at).toLocaleDateString("it-IT")}`}
        title="La tua stima orientativa."
      >
        <Button asChild variant="outline" size="lg" className="w-full md:w-auto">
          <Link to={`${PG_BASE}/area`}>Torna alle mie richieste</Link>
        </Button>
      </PageTitle>
      <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <DarkCard>
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.15em] text-[#ffb780]">
              RC auto · richiesta {r.targa}
            </div>
            <h2 className="text-2xl font-bold">Un intervallo di riferimento.</h2>
            <EstimatePrice
              estimate={estimateOf(r)}
              pending={r.stato === "in_elaborazione"}
              className="my-4 text-[#ffab6d]"
            />
            <EstimateNotice className="bg-white/10 text-white [&_p]:!text-white" />
          </DarkCard>
          <Panel>
            <h3 className="mb-3 text-lg font-bold">La tua richiesta</h3>
            <DetailLine label="Stato">{STATUS_LABELS[r.stato]}</DetailLine>
            <DetailLine label="Targa">{r.targa}</DetailLine>
            <DetailLine label="Residenza">{indirizzoOf(r)}</DetailLine>
            <DetailLine label="Email">{email}</DetailLine>
            <DetailLine label="Ricontatto via email">
              {r.consensi.callback.granted ? "Richiesto" : "Non richiesto"}
            </DetailLine>
            <DetailLine label="Marketing via email">
              {r.consensi.marketing.granted ? "Consenso prestato" : "Consenso non prestato"}
            </DetailLine>
            <p className="mt-4 text-[11px] opacity-70">
              Per revocare il consenso commerciale:{" "}
              <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>
                {PRIVACY_EMAIL}
              </a>
              .
            </p>
          </Panel>
        </div>
        <Panel className="h-fit">
          <h3 className="mb-3 text-lg font-bold">Vuoi un preventivo effettivo?</h3>
          <p className="text-xs opacity-80">
            Scegli se farti ricontattare dal tuo referente. Il prezzo definitivo
            dipende dalle verifiche e dalle coperture richieste.
          </p>
          <div className="mt-6">
            <Contact referral={referente} />
          </div>
          <ContactAction
            requestId={r.id}
            granted={r.consensi.callback.granted}
            referente={referente}
            email={email}
            onDone={load}
          />
          <NotaStimaDialog
            trigger={<TextButton className="mt-6">Come leggere questa stima</TextButton>}
          />
        </Panel>
      </div>
    </>
  );
};

export default DettaglioStima;
