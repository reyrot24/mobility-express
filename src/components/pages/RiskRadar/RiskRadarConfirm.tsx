// Risk Radar Aziende — /risk-radar/conferma#t=<token>
// Il cliente apre il link ricevuto via email: confermato l'indirizzo, parte il riepilogo dell'analisi.
// Il token sta nel frammento (#), che il browser non manda a nessun server né nei referrer.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/dark-mode/theme-provider";
import { rrApi } from "./api";
import { Icon, IconSprite } from "./icons";
import { RrFooter } from "./Legali";
import "./RiskRadar.css";

type State =
  | { kind: "loading" }
  | { kind: "ok"; company: string; email: string; already: boolean }
  | { kind: "error"; message: string };

export default function RiskRadarConfirm() {
  const { setForcedTheme } = useTheme();
  const [state, setState] = useState<State>({ kind: "loading" });
  const started = useRef(false);

  useEffect(() => {
    document.title = "Conferma email | Risk Radar Aziende";
    setForcedTheme("light");
    return () => setForcedTheme(null);
  }, [setForcedTheme]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get("t") ?? "";
    if (!token) {
      setState({ kind: "error", message: "Link incompleto: apri il link direttamente dall'email che ti abbiamo inviato." });
      return;
    }
    rrApi.confirm(token)
      .then((r) => setState({ kind: "ok", company: r.company, email: r.email, already: !!r.already }))
      .catch((e) => setState({ kind: "error", message: (e as Error).message }));
  }, []);

  return (
    <>
      <div className="rr">
        <IconSprite />
        <header className="rr-header">
          <div className="hwrap">
            <a className="brand" href="/risk-radar">
              <div className="mark"><Icon name="check" /></div>
              <div><strong>il prezzo giusto</strong><small>per te<span className="dot">.</span></small></div>
            </a>
            <div className="hmid"><Icon name="shield" />Analisi gratuita e senza impegno</div>
            <span className="pill">ALCA Broker</span>
          </div>
        </header>
        <div className="rr-main">
          <div className="glow" />
          <section className="card rr-confirm" aria-live="polite">
            {state.kind === "loading" && (
              <>
                <h1>Confermiamo la tua email…</h1>
                <p>Un attimo: stiamo preparando il riepilogo della tua analisi.</p>
              </>
            )}
            {state.kind === "ok" && (
              <>
                <div className="ico ok"><Icon name="check" /></div>
                <h1>{state.already ? "Email già confermata" : "Email confermata"}</h1>
                <p>
                  {state.already ? "Abbiamo già inviato" : "Abbiamo inviato"} il riepilogo del Risk Radar di <b>{state.company}</b> a{" "}
                  <b>{state.email}</b>. Non lo trovi? Guarda nella posta indesiderata.
                </p>
                <p>Per approfondire, rispondi all'email: un consulente ALCA Broker ti aiuterà senza impegno.</p>
                <a className="btn" href="/risk-radar">Fai una nuova analisi <Icon name="arrow" /></a>
              </>
            )}
            {state.kind === "error" && (
              <>
                <div className="ico err">!</div>
                <h1>Non siamo riusciti a confermare</h1>
                <p>{state.message}</p>
                <a className="btn" href="/risk-radar">Torna al Risk Radar <Icon name="arrow" /></a>
              </>
            )}
          </section>
        </div>
      </div>
      <RrFooter />
    </>
  );
}
