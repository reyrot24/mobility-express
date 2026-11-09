import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Panel } from "../components/Surface";
import { useAuth } from "../context/AuthContext";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { DEFAULT_REF, PG_BASE } from "../utils/model";
import {
  CONFIGURAZIONE_ANTEPRIMA,
  EMAIL_ANTEPRIMA,
  anteprimaAttiva,
  impostaAnteprima,
  impostaSessioneAnteprima,
} from "../utils/anteprima";
import { TOKEN_ANTEPRIMA } from "./dati";

// Indice delle pagine di "Il prezzo giusto" per lo sviluppo locale. Le rotte esistono solo con
// `npm run dev` (vedi PrezzoGiusto.tsx).

type Voce = { to: string; label: string; nota?: string };

const A = `${PG_BASE}/anteprima`;

const GRUPPI: { titolo: string; voci: Voce[]; serveAnteprima?: boolean }[] = [
  {
    titolo: "Pagine pubbliche",
    voci: [
      { to: PG_BASE, label: "Landing standard" },
      {
        to: `${PG_BASE}/${CONFIGURAZIONE_ANTEPRIMA}/${CONFIGURAZIONE_ANTEPRIMA}`,
        label: "Landing con pagina personalizzata finta",
        nota: "anteprima/dati.ts → PAGINA_ANTEPRIMA",
      },
      {
        to: `${PG_BASE}/0B6423C8-D0C3-43AA-A5AC-E37EE0F4DAA6/AC540B8B-E0EA-453F-B8AE-314CDD1ECB82`,
        label: "Landing con pagina personalizzata vera",
        nota: "letta dal server di produzione (solo lettura)",
      },
      { to: `${PG_BASE}/come-funziona`, label: "Come funziona" },
      { to: `${PG_BASE}/condizioni`, label: "Condizioni del servizio" },
      { to: `${PG_BASE}/privacy`, label: "Informativa privacy" },
      { to: `${PG_BASE}/accesso`, label: "Accesso" },
      { to: `${PG_BASE}/reimposta-password`, label: "Reimposta password" },
      { to: `${PG_BASE}/codice.non.valido`, label: "Link non valido" },
      { to: `${PG_BASE}/a/b/c`, label: "Pagina non trovata" },
    ],
  },
  {
    titolo: "Dopo l’invio del form",
    serveAnteprima: true,
    voci: [
      { to: `${A}/inviata/attivazione`, label: "Inviata: controlla la tua email" },
      { to: `${A}/inviata/ricevuta`, label: "Inviata: richiesta ricevuta (dall’area personale)" },
    ],
  },
  {
    titolo: "Link di conferma dell’email",
    voci: [
      {
        to: `${PG_BASE}/attiva?token=${TOKEN_ANTEPRIMA.nuovo}#pt=ANTEPRIMA`,
        label: "Nuovo account: scegli la password",
        nota: "password temporanea nel link",
      },
      { to: `${PG_BASE}/attiva?token=${TOKEN_ANTEPRIMA.esistente}`, label: "Account già esistente" },
      {
        to: `${PG_BASE}/attiva?token=${TOKEN_ANTEPRIMA.vecchio}`,
        label: "Link vecchio",
        nota: "casella Condizioni e password temporanea da inserire",
      },
      { to: `${PG_BASE}/attiva?token=${TOKEN_ANTEPRIMA.scaduto}`, label: "Link scaduto o già usato" },
    ],
  },
  {
    titolo: "Area personale",
    serveAnteprima: true,
    voci: [
      { to: `${PG_BASE}/area`, label: "Le mie richieste" },
      { to: `${PG_BASE}/area?sezione=servizio`, label: "Il servizio (consensi e monitoraggio)" },
      { to: `${PG_BASE}/area/stima/ST-ANTE0001`, label: "Dettaglio: stima pronta" },
      { to: `${PG_BASE}/area/stima/ST-ANTE0002`, label: "Dettaglio: in elaborazione" },
      { to: `${PG_BASE}/area/stima/ST-ANTE0003`, label: "Dettaglio: stima non disponibile" },
      { to: `${PG_BASE}/area/stima/ST-ANTE0004`, label: "Dettaglio: problema tecnico" },
      { to: `${PG_BASE}/area/stima/ST-ANTE0005`, label: "Dettaglio: monitoraggio interrotto" },
    ],
  },
];

const Anteprima = () => {
  const { session } = useAuth();
  const attiva = anteprimaAttiva();

  // Le modalità si leggono all'avvio (AuthContext): ricarichiamo per applicarle
  function cambia(fn: () => void) {
    fn();
    window.location.reload();
  }

  return (
    <div className="mx-auto max-w-3xl px-[5%] py-8">
      <h1 className="mb-1 text-2xl font-bold tracking-tight">Anteprima locale</h1>
      <p className="mb-6 text-sm opacity-75">
        Visibile solo con <code>npm run dev</code>: non esiste nella build di produzione.
      </p>

      <Panel className="mb-6 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">Dati finti {attiva ? "attivi" : "spenti"}</p>
            <p className="text-xs opacity-75">
              {attiva
                ? "Form, area personale e servizio usano dati in memoria: niente arriva a Supabase o devops. Ricaricando si riparte da zero."
                : "Attenzione: senza dati finti il form invia richieste vere al server di produzione."}
            </p>
          </div>
          <Button
            variant={attiva ? "outline" : "default"}
            onClick={() => cambia(() => impostaAnteprima(!attiva))}
          >
            {attiva ? "Spegni" : "Attiva dati finti"}
          </Button>
        </div>
        {attiva && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e0e2ed] pt-4 dark:border-white/10">
            <div>
              <p className="font-semibold">
                {session ? `Dentro come ${EMAIL_ANTEPRIMA}` : "Area personale: non sei entrato"}
              </p>
              <p className="text-xs opacity-75">
                Anche da “Accesso” con {EMAIL_ANTEPRIMA} e una password qualsiasi.
              </p>
            </div>
            <Button
              variant={session ? "outline" : "default"}
              onClick={() => cambia(() => impostaSessioneAnteprima(!session))}
            >
              {session ? "Esci" : "Entra nell’area"}
            </Button>
          </div>
        )}
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        {GRUPPI.map((g) => (
          <section key={g.titolo}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-70">{g.titolo}</h2>
            {g.serveAnteprima && !attiva && (
              <p className="mb-2 text-xs opacity-70">Serve “Attiva dati finti”.</p>
            )}
            <ul className="flex flex-col gap-1.5">
              {g.voci.map((v) => (
                <li key={v.to}>
                  {/* <a> e non <Link>: alcune pagine leggono il #frammento solo al caricamento */}
                  <a href={v.to} className="underline hover:text-orangeHover">
                    {v.label}
                  </a>
                  {v.nota && <span className="block text-[11px] opacity-60">{v.nota}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs opacity-60">
        Torna qui da <Link to={A} className="underline">{A}</Link>.
      </p>
    </div>
  );
};

/** /anteprima/inviata/:tipo: mostra la pagina dopo l'invio con una richiesta finta. */
export const InviataAnteprima = () => {
  const { tipo } = useParams();
  const { setCurrent } = usePrezzoGiusto();
  const navigate = useNavigate();
  const daAttivare = tipo !== "ricevuta";

  useEffect(() => {
    setCurrent({
      id: "ST-ANTE0099",
      status: daAttivare ? "in_attesa_attivazione" : "in_elaborazione",
      estimate: null,
      date: new Date().toISOString(),
      ref: DEFAULT_REF,
      consents: { privacyAcknowledged: true, callback: { granted: true }, version: "", recordedAt: "" },
      firstName: "",
      lastName: "",
      phone: "",
      plate: "AB123CD",
      streetType: "Via",
      street: "Giuseppe Verdi",
      houseNumber: "12",
      city: "",
      zip: "",
      email: EMAIL_ANTEPRIMA,
    });
    navigate(`${PG_BASE}/inviata`, { replace: true });
  }, [daAttivare, setCurrent, navigate]);

  return null;
};

export default Anteprima;
