// Risk Radar Aziende – "Il prezzo giusto per te" (ALCA Broker).
// Porting React di ALCA-Risk-Radar/1-sito-online/index.html: P.IVA → dettagli → Risk Radar.
// Il link dei collaboratori è /risk-radar?ref=<codice>.
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTheme } from "@/components/dark-mode/theme-provider";
import { DIVMAP, DIVS, EMP, REV, type Div } from "./data";
import { rrApi, type Company, type Params, type Result, type WebData } from "./api";
import { Icon, IconSprite } from "./icons";
import { RrFooter, RrPrivacyDialog } from "./Legali";
import "./RiskRadar.css";

const eur = (n: number) => "€ " + Math.round(n || 0).toLocaleString("it-IT", { useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
const host = (u?: string) => { try { return u ? new URL(u).hostname.replace(/^www\./, "") : null; } catch { return null; } };
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function checkPiva(p: string) {
  if (!/^\d{11}$/.test(p)) return "La partita IVA deve contenere 11 cifre.";
  if (/^0{11}$/.test(p)) return "Partita IVA non valida.";
  let s = 0;
  for (let i = 0; i < 10; i++) { let d = +p[i]; if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; } s += d; }
  if ((10 - (s % 10)) % 10 !== +p[10]) return "Controlla le cifre: questa partita IVA non risulta corretta.";
  return null;
}

function atecoMatches(q: string): Div[] {
  q = norm(q.trim());
  if (!q) return DIVS;
  const words = q.split(/\s+/);
  return DIVS.map((d) => {
    const hay = norm(d[0] + " " + d[1] + " " + d[2]);
    let s = 0;
    for (const w of words) { if (!hay.includes(w)) return null; s += norm(d[1]).includes(w) ? 2 : 1; }
    if (d[0] === q) s += 10;
    return [s, d] as const;
  }).filter((x): x is readonly [number, Div] => !!x).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
}

// "auto": ATECO trovato (registro o online) e mostrato in un riquadro; "pending": ricerca online in corso; "search": elenco.
type AtecoMode = { kind: "search" } | { kind: "pending" } | { kind: "auto"; source: "registro" | "web"; code: string; description: string; src?: string | null };
type Outcome = { id: string; company: Company; result: Result; params: Params; wants: boolean };

export default function RiskRadar() {
  const [search] = useSearchParams();
  const ref = (search.get("ref") || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || null;
  const { setForcedTheme } = useTheme();

  useEffect(() => {
    document.title = "Il Prezzo Giusto per Te | Risk Radar Aziende";
    setForcedTheme("light"); // la pagina ha i suoi colori: niente tema scuro
    return () => setForcedTheme(null);
  }, [setForcedTheme]);

  /* ---------- stato del modulo ---------- */
  const [step, setStep] = useState<1 | 2 | "load">(1);
  const [loadText, setLoadText] = useState("");
  const [piva, setPiva] = useState("");
  const [e1, setE1] = useState("");
  const [e2, setE2] = useState("");
  const [company, setCompany] = useState<Company | null>(null);
  const [web, setWeb] = useState<WebData | null>(null);
  const [revSrc, setRevSrc] = useState<{ year?: number | null; turnover: number; src: string | null } | null>(null);

  const [atecoSel, setAtecoSel] = useState<string | null>(null);
  const atecoSelRef = useRef<string | null>(null);
  const [atecoQ, setAtecoQ] = useState("");
  const [atecoMode, setAtecoMode] = useState<AtecoMode>({ kind: "search" });
  const [comboOpen, setComboOpen] = useState(false);
  const [comboIdx, setComboIdx] = useState(-1);
  const atecoInput = useRef<HTMLInputElement>(null);
  const comboRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [rev, setRev] = useState(1);
  const [emp, setEmp] = useState(1);
  const [veh, setVeh] = useState(0);
  const [vehCount, setVehCount] = useState("");
  const vehInput = useRef<HTMLInputElement>(null);
  const [prop, setProp] = useState<"own" | "rent">("rent");
  const [digital, setDigital] = useState(0);
  const [exp, setExp] = useState(0);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [wants, setWants] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  /* ---------- risultato ---------- */
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [contactDone, setContactDone] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const showToast = (m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), 3200); };

  // Ogni nuova ricerca P.IVA invalida le risposte "enrich" ancora in arrivo per la precedente.
  const lookupSeq = useRef(0);

  const matches = useMemo(() => atecoMatches(atecoQ).slice(0, 40), [atecoQ]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!comboRef.current?.contains(e.target as Node)) closeCombo(); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  function closeCombo() { setComboOpen(false); setComboIdx(-1); }
  function selectAteco(code: string | null) { atecoSelRef.current = code; setAtecoSel(code); }
  function pickAteco(code: string) {
    const d = DIVMAP.get(code);
    if (!d) return;
    selectAteco(code);
    setAtecoQ(d[0] + " · " + d[1]);
    closeCombo();
    setE2("");
  }
  function showAtecoSearch(open = false) {
    setAtecoMode({ kind: "search" });
    if (open) setComboOpen(true);
    setTimeout(() => atecoInput.current?.focus());
  }
  function resetAteco() { selectAteco(null); setAtecoQ(""); showAtecoSearch(); }

  async function enrichOnline(p: string, seq: number) {
    let w: WebData | null = null;
    try { w = await rrApi.enrich(p); } catch { /* la ricerca online è facoltativa */ }
    if (seq !== lookupSeq.current) return; // l'utente è passato ad altro
    const ok = w && w.status === "ok" ? w : null;
    setWeb(ok);
    if (!ok) { setAtecoMode({ kind: "search" }); return; }
    const src = host(ok.source);
    if (ok.ateco?.division && !atecoSelRef.current) {
      pickAteco(ok.ateco.division);
      setAtecoMode({ kind: "auto", source: "web", code: ok.ateco.code, description: ok.ateco.description || DIVMAP.get(ok.ateco.division)![1], src });
    } else setAtecoMode({ kind: "search" });
    if (ok.revIdx != null && ok.turnover != null) { setRev(ok.revIdx); setRevSrc({ year: ok.year, turnover: ok.turnover, src }); }
    if (ok.empIdx != null) setEmp(ok.empIdx);
  }

  async function submitPiva(e: FormEvent) {
    e.preventDefault();
    const er = checkPiva(piva);
    if (er) { setE1(er); return; }
    const seq = ++lookupSeq.current;
    setLoadText("Cerchiamo i dati della tua azienda…");
    setStep("load");
    let c: Company;
    try { c = await rrApi.lookup(piva); } catch (x) { setStep(1); setE1((x as Error).message); return; }
    if (seq !== lookupSeq.current) return;
    setCompany(c);
    setWeb(null);
    setRevSrc(null);
    selectAteco(null);
    setAtecoQ("");
    const reg = c.registry || null;
    const regDiv = reg?.ateco?.division;
    if (regDiv) {
      pickAteco(regDiv);
      setAtecoMode({ kind: "auto", source: "registro", code: reg!.ateco!.code, description: reg!.ateco!.description || DIVMAP.get(regDiv)![1] });
    } else {
      // Nessun dato camerale: ATECO e fatturato si cercano online, in background.
      setAtecoMode({ kind: "pending" });
      enrichOnline(piva, seq);
    }
    if (reg?.revIdx != null) setRev(reg.revIdx);
    if (reg?.empIdx != null) setEmp(reg.empIdx);
    setStep(2);
  }

  async function submitDetails(e: FormEvent) {
    e.preventDefault();
    setE2("");
    let vc: number | null = null;
    if (veh === 3) {
      vc = Number(vehCount);
      if (!Number.isInteger(vc) || vc < 1 || vc > 9999) { setE2("Indica il numero di veicoli aziendali."); vehInput.current?.focus(); return; }
    }
    if (!atecoSel) { setE2("Scegli l'attività dell'azienda dall'elenco."); showAtecoSearch(true); return; }
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) { setE2("Inserisci un indirizzo email valido."); emailInput.current?.focus(); return; }
    if (!privacy) { setE2("Per continuare conferma di aver letto l'informativa privacy."); return; }
    const params: Params = { ateco: atecoSel, rev, emp, veh, vehCount: vc, prop, digital, export: exp };
    setBusy(true);
    setLoadText("Analizziamo i rischi della tua attività…");
    setStep("load");
    try {
      const r = await rrApi.analyze({ piva, params, ref, email: mail, phone: phone.trim(), wants_contact: wants });
      setOutcome({ ...r, params, wants });
      setContactDone(wants);
      window.scrollTo(0, 0);
    } catch (x) { setStep(2); setE2((x as Error).message); }
    finally { setBusy(false); }
  }

  async function askContact() {
    if (!outcome) return;
    setContactBusy(true);
    try { await rrApi.contact(outcome.id); setContactDone(true); showToast("Grazie! Ti ricontatteremo a breve."); }
    catch (x) { showToast((x as Error).message); }
    finally { setContactBusy(false); }
  }

  function newAnalysis() {
    lookupSeq.current++;
    setOutcome(null); setPiva(""); setStep(1); setCompany(null); setWeb(null); setRevSrc(null);
    selectAteco(null); setAtecoQ(""); setAtecoMode({ kind: "search" });
    setRev(1); setEmp(1); setVeh(0); setVehCount(""); setProp("rent"); setDigital(0); setExp(0);
    setEmail(""); setPhone(""); setWants(false); setE1(""); setE2("");
    window.scrollTo(0, 0);
  }

  function onAtecoKey(e: KeyboardEvent<HTMLInputElement>) {
    const codes = matches.map((d) => d[0]);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setComboOpen(true);
      const i = Math.max(0, Math.min(codes.length - 1, comboIdx + (e.key === "ArrowDown" ? 1 : -1)));
      setComboIdx(i);
      listRef.current?.querySelectorAll("li[data-code]")[i]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && comboOpen) {
      e.preventDefault();
      const c = codes[Math.max(0, comboIdx)];
      if (c) pickAteco(c);
    } else if (e.key === "Escape") closeCombo();
  }

  const reg = company?.registry || null;
  const companyName = (company?.checked && company.name) || reg?.name;
  const companyAddr = (company?.checked && company.address) || reg?.town;
  const verified = (company?.checked && company.valid) || reg?.status === "ATTIVA";

  return (
    <>
    <div className="rr">
      <IconSprite />
      <header className="rr-header">
        <div className="hwrap">
          <a className="brand" href="/risk-radar" onClick={(e) => { e.preventDefault(); newAnalysis(); }}>
            <div className="mark"><Icon name="check" /></div>
            <div><strong>il prezzo giusto</strong><small>per te<span className="dot">.</span></small></div>
          </a>
          <div className="hmid"><Icon name="shield" />Analisi gratuita e senza impegno</div>
          <span className="pill">ALCA Broker</span>
        </div>
      </header>

      <div className="rr-main">
        <div className="glow" />

        {!outcome ? (
          <div className="hero">
            <section>
              <div className="kicker"><Icon name="spark" />Un check-up gratuito, senza impegno</div>
              <h1>Il prezzo giusto <span>parte dalla tua azienda.</span></h1>
              <p className="lead">Inserisci la partita IVA. Al resto penserà il sistema: una panoramica dei rischi della tua attività, le coperture consigliate e una fascia orientativa di spesa annua.</p>
              <div className="feats">
                <div className="feat"><div className="ic"><Icon name="clock" /></div><div><strong>Solo due passaggi</strong><span>Niente questionari lunghi.</span></div></div>
                <div className="feat"><div className="ic"><Icon name="lock" /></div><div><strong>Senza impegno</strong><span>Nessun obbligo di acquisto o di cambio polizza.</span></div></div>
                <div className="feat"><div className="ic"><Icon name="badge" /></div><div><strong>Un consulente, se lo desideri</strong><span>Il ricontatto è una tua scelta.</span></div></div>
              </div>
              <div className="art"><div className="big"><Icon name="radar" /></div><div><small>Il prezzo giusto per te</small><b>La tua azienda.<br /><span>I tuoi rischi.</span></b></div></div>
            </section>

            <section className="card">
              <div className="prog"><span className="a">Il tuo percorso</span><span className="b">Passaggio {step === 2 ? 2 : 1} di 2</span></div>
              <div className="bars"><i className="on" /><i className={step === 2 ? "on" : ""} /></div>

              {step === 1 && (
                <form onSubmit={submitPiva} noValidate>
                  <div className="stephead"><div className="ic"><Icon name="building" /></div><div><h2>Partiamo dalla tua azienda</h2><p className="sub">Ci serve solo la partita IVA.</p></div></div>
                  <label className="lbl" htmlFor="rr-piva">La partita IVA</label>
                  <div className="plate"><div className="eu"><span>★</span>IT</div>
                    <input id="rr-piva" inputMode="numeric" autoComplete="off" maxLength={13} placeholder="00000000000" aria-describedby="rr-piva-h"
                      value={piva} onChange={(e) => { setPiva(e.target.value.replace(/\D/g, "").slice(0, 11)); setE1(""); }} />
                  </div>
                  <span className="hint" id="rr-piva-h">11 cifre, senza spazi.</span>
                  <div className="err" role="alert">{e1}</div>
                  <div className="info"><Icon name="help" /><div>Ragione sociale e sede vengono ricavate dalle banche dati pubbliche. Ti chiederemo solo di confermare qualche dettaglio sull'attività.</div></div>
                  <button className="btn" type="submit">Continua <Icon name="arrow" /></button>
                  <p className="after">Poi pochi dettagli e la tua email.</p>
                </form>
              )}

              {step === "load" && <div className="loading"><div className="spin" /><div>{loadText}</div></div>}

              {step === 2 && company && (
                <form onSubmit={submitDetails} noValidate>
                  <div className="stephead"><div className="ic"><Icon name="radar" /></div><div><h2>Qualche dettaglio</h2><p className="sub">Così la stima è più vicina alla realtà.</p></div></div>
                  <div className="company">
                    <div className="ic"><Icon name="building" /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{companyName || "P.IVA " + piva}</b>
                      <span>{companyAddr || (company.checked ? (company.valid ? "Partita IVA attiva" : "Partita IVA non attiva nel registro VIES") : "Registro pubblico momentaneamente non raggiungibile")}</span>
                    </div>
                    {verified ? <span className="chip c-ok">verificata</span> : <span className="chip c-na">da verificare</span>}
                  </div>

                  <div className="field">
                    <label className="lbl s" htmlFor="rr-ateco-q">Attività dell'azienda (ATECO)</label>
                    {atecoMode.kind === "pending" && (
                      <div className="ateco-auto pending"><div className="spin sm" /><div><b>Cerco ATECO e fatturato online…</b><div className="sub">Puoi intanto completare gli altri campi.</div></div></div>
                    )}
                    {atecoMode.kind === "auto" && (
                      <div className={"ateco-auto" + (atecoMode.source === "web" ? " web" : "")}>
                        <Icon name="badge" style={{ color: atecoMode.source === "web" ? "var(--blue)" : "var(--green)" }} />
                        <div>
                          <b>ATECO {atecoMode.code}</b>{atecoMode.source === "web" && <> <span className="chip c-web">trovato online</span></>}
                          <div className="sub">{atecoMode.description}{atecoMode.src ? ` · fonte: ${atecoMode.src}` : ""}</div>
                        </div>
                        <button type="button" className="lnk" onClick={resetAteco}>Non è corretto?</button>
                      </div>
                    )}
                    <div className="combo" ref={comboRef} hidden={atecoMode.kind === "auto"}>
                      <input className={"t" + (atecoSel ? " picked" : "")} id="rr-ateco-q" ref={atecoInput} autoComplete="off" role="combobox"
                        aria-expanded={comboOpen} aria-controls="rr-ateco-list" placeholder="Cerca l'attività: es. ristorante, impianti elettrici, software"
                        value={atecoQ}
                        onChange={(e) => { selectAteco(null); setAtecoQ(e.target.value); setComboIdx(-1); setComboOpen(true); }}
                        onFocus={() => { if (!atecoSel) setComboOpen(true); }}
                        onKeyDown={onAtecoKey} />
                      {comboOpen && (
                        <ul className="combo-list" id="rr-ateco-list" role="listbox" ref={listRef}
                          onMouseDown={(e) => { const li = (e.target as HTMLElement).closest<HTMLElement>("li[data-code]"); if (li) { e.preventDefault(); pickAteco(li.dataset.code!); } }}>
                          {matches.length ? matches.map((d, i) => (
                            <li key={d[0]} role="option" data-code={d[0]} aria-selected={i === comboIdx}><b>{d[0]}</b><span>{d[1]}</span></li>
                          )) : <li className="none">Nessuna attività trovata: prova con un'altra parola.</li>}
                        </ul>
                      )}
                    </div>
                    {atecoMode.kind !== "auto" && <span className="hint">Scrivi una parola e scegli l'attività dall'elenco.</span>}
                  </div>

                  <div className="field g2">
                    <div>
                      <label className="lbl s" htmlFor="rr-rev">Fatturato annuo</label>
                      <select className="t" id="rr-rev" value={rev} onChange={(e) => setRev(+e.target.value)}>{REV.map((l, i) => <option key={i} value={i}>{l}</option>)}</select>
                      {revSrc && <span className="hint">Fatturato{revSrc.year ? " " + revSrc.year : ""}: <b>{eur(revSrc.turnover)}</b> <span className="chip c-web">online</span>{revSrc.src ? " · " + revSrc.src : ""}</span>}
                    </div>
                    <div>
                      <label className="lbl s" htmlFor="rr-emp">Dipendenti</label>
                      <select className="t" id="rr-emp" value={emp} onChange={(e) => setEmp(+e.target.value)}>{EMP.map((l, i) => <option key={i} value={i}>{l}</option>)}</select>
                    </div>
                  </div>
                  <div className="field g2">
                    <div>
                      <label className="lbl s" htmlFor="rr-veh">Veicoli aziendali</label>
                      <select className="t" id="rr-veh" value={veh} onChange={(e) => { const v = +e.target.value; setVeh(v); if (v === 3) setTimeout(() => vehInput.current?.focus()); else setVehCount(""); }}>
                        <option value={0}>Nessuno</option><option value={1}>1–3</option><option value={2}>4–15</option><option value={3}>Altro (indica il numero)</option>
                      </select>
                      {veh === 3 && <input className="t" ref={vehInput} type="number" inputMode="numeric" min={1} max={9999} step={1} placeholder="Numero di veicoli"
                        aria-label="Numero di veicoli aziendali" style={{ marginTop: 8 }} value={vehCount} onChange={(e) => setVehCount(e.target.value)} />}
                    </div>
                    <div>
                      <label className="lbl s" htmlFor="rr-prop">Sede</label>
                      <select className="t" id="rr-prop" value={prop} onChange={(e) => setProp(e.target.value as "own" | "rent")}><option value="rent">In affitto</option><option value="own">Di proprietà</option></select>
                    </div>
                  </div>
                  <div className="field g2">
                    <div>
                      <label className="lbl s" htmlFor="rr-digital">Dati e vendite online</label>
                      <select className="t" id="rr-digital" value={digital} onChange={(e) => setDigital(+e.target.value)}><option value={0}>Marginali</option><option value={1}>Gestiamo dati dei clienti</option><option value={2}>E-commerce o servizi digitali</option></select>
                    </div>
                    <div>
                      <label className="lbl s" htmlFor="rr-export">Spedizioni di merci</label>
                      <select className="t" id="rr-export" value={exp} onChange={(e) => setExp(+e.target.value)}><option value={0}>No</option><option value={1}>In Italia</option><option value={2}>Anche all'estero</option></select>
                    </div>
                  </div>
                  <div className="field g2">
                    <div>
                      <label className="lbl s" htmlFor="rr-email">Email</label>
                      <input className="t" id="rr-email" ref={emailInput} type="email" autoComplete="email" placeholder="nome@azienda.it" required value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                    <div>
                      <label className="lbl s" htmlFor="rr-phone">Telefono <span style={{ fontWeight: 500, color: "var(--muted-2)" }}>(facoltativo)</span></label>
                      <input className="t" id="rr-phone" type="tel" autoComplete="tel" placeholder="+39 …" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    </div>
                  </div>
                  <label className="check"><input type="checkbox" required checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> <span>Ho letto l'<RrPrivacyDialog trigger={<button type="button" className="link">informativa privacy</button>} /> di Alca Broker S.r.l.</span></label>
                  <label className="check"><input type="checkbox" checked={wants} onChange={(e) => setWants(e.target.checked)} /> Desidero essere ricontattato da un consulente ALCA Broker per approfondire la mia analisi.</label>
                  <div className="err" role="alert">{e2}</div>
                  <button className="btn" type="submit" disabled={busy}>Mostra il mio Risk Radar <Icon name="arrow" /></button>
                  <p className="after">Usiamo i tuoi dati solo per prepararti l'analisi e, se lo chiedi, per ricontattarti.</p>
                  <div style={{ textAlign: "center" }}><button type="button" className="back" onClick={() => { lookupSeq.current++; setStep(1); }}>← Modifica partita IVA</button></div>
                </form>
              )}
            </section>
          </div>
        ) : (
          <ResultView o={outcome} piva={piva} web={web} contactDone={contactDone} contactBusy={contactBusy} onContact={askContact} onNew={newAnalysis} />
        )}
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
    <RrFooter />
    </>
  );
}

/* ====================== RISULTATO ====================== */
type Chip = "ok" | "ip" | "web" | "na";
const CHIPS: Record<Chip, JSX.Element> = {
  ok: <span className="chip c-ok">verificato</span>,
  ip: <span className="chip c-ip">indicato da te</span>,
  web: <span className="chip c-web">trovato online</span>,
  na: <span className="chip c-na">non disponibile</span>,
};

function ResultView({ o, piva, web: webState, contactDone, contactBusy, onContact, onNew }: {
  o: Outcome; piva: string; web: WebData | null; contactDone: boolean; contactBusy: boolean; onContact: () => void; onNew: () => void;
}) {
  const { company: c, result: R, params } = o;
  const rg = c.registry || ({} as Partial<NonNullable<Company["registry"]>>);
  // La risposta di analyze include i dati in cache; se l'arricchimento online è arrivato dopo, usiamo quello in pagina.
  const wb: Partial<WebData> = c.web?.status === "ok" ? c.web : webState?.status === "ok" ? webState : {};
  const nm = c.name || rg.name || wb.name;
  const ad = c.address || rg.town;

  const fromReg = rg.ateco?.division === R.sector.code;
  const fromWeb = !fromReg && wb.ateco?.division === R.sector.code;
  const a = fromReg ? rg.ateco : fromWeb ? wb.ateco : null;
  const revReg = rg.revIdx != null && REV[rg.revIdx] === R.revenue;
  const revWeb = !revReg && wb.revIdx != null && REV[wb.revIdx] === R.revenue;
  const empReg = rg.empIdx != null && EMP[rg.empIdx] === R.employees;
  const empWeb = !empReg && wb.empIdx != null && EMP[wb.empIdx] === R.employees;
  const revTxt = revReg && rg.turnover ? `${eur(rg.turnover)}${rg.year ? " (" + rg.year + ")" : ""}`
    : revWeb && wb.turnover ? `${eur(wb.turnover)}${wb.year ? " (" + wb.year + ")" : ""}` : R.revenue;

  const rows: [string, string | null | undefined, Chip][] = [
    ["Partita IVA", piva, (c.checked && c.valid) || rg.status === "ATTIVA" ? "ok" : "na"],
    ["Ragione sociale", nm, nm ? "ok" : "na"],
    ["Sede", ad, ad ? "ok" : "na"],
    ["Attività", a ? `ATECO ${a.code} · ${a.description || R.sector.name}` : `ATECO ${R.sector.code} · ${R.sector.name}`, fromReg ? "ok" : fromWeb ? "web" : "ip"],
    ["Fatturato", revTxt, revReg ? "ok" : revWeb ? "web" : "ip"],
    ["Dipendenti", empReg && rg.employees != null ? String(rg.employees) : empWeb && wb.employees != null ? String(wb.employees) : R.employees, empReg ? "ok" : empWeb ? "web" : "ip"],
    ["Veicoli aziendali", params.veh === 3 ? String(params.vehCount) : ["Nessuno", "1–3", "4–15"][params.veh], "ip"],
  ];
  const lvl = R.overall >= 70 ? ["elevata", "c-hi"] : R.overall >= 50 ? ["media", "c-ip"] : ["contenuta", "c-ok"];
  const today = new Date().toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div>
      <div className="rtop">
        <div>
          <div className="kicker"><Icon name="spark" />Analisi preliminare</div>
          <h1>Il tuo <span>Risk Radar</span></h1>
          <p className="lead" style={{ marginTop: 10 }}>{(nm || "P.IVA " + piva) + " · " + today}</p>
        </div>
        <div className="actions">
          <button className="btn ghost" onClick={() => window.print()}><Icon name="file" />Scarica PDF</button>
          <button className="btn ghost" onClick={onNew}>Nuova analisi</button>
        </div>
      </div>

      <div className="rgrid">
        <section className="card">
          <h3>Profilo aziendale</h3>
          <dl className="kv">{rows.map(([k, v, st]) => <Row key={k} k={k} v={v} chip={st} />)}</dl>
          <div className="score">
            <div className="n">{R.overall}<small>/100</small></div>
            <div><b>Esposizione al rischio</b> <span className={"chip " + lvl[1]}>{lvl[0]}</span><div className="sub">Media delle quattro aree più esposte.</div></div>
          </div>
        </section>
        <section className="card">
          <h3>Rischi principali</h3>
          <Radar risks={R.risks} />
          {[...R.risks].sort((x, y) => y.score - x.score).slice(0, 4).map((r) => (
            <div className="rrow" key={r.key}><span>{r.label}</span><span className="num">{r.score}</span><div className="bar"><i style={{ width: r.score + "%" }} /></div></div>
          ))}
        </section>
      </div>

      <section className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}><h3>Coperture e massimali consigliati</h3><span className="sub">Premio annuo indicativo</span></div>
        <div style={{ marginTop: 8 }}>
          {R.covers.map((cv) => (
            <div className="cov" key={cv.id}>
              <div><b>{cv.name}</b> <span className={"chip " + (cv.prio === "alta" ? "c-hi" : cv.prio === "media" ? "c-ip" : "c-na")}>priorità {cv.prio}</span><div className="why">{cv.why}</div></div>
              <div className="v">{cv.limit}<small>massimale consigliato</small></div>
              <div className="v">{eur(cv.low)} – {eur(cv.high)}<small>all'anno</small></div>
            </div>
          ))}
        </div>
      </section>

      <h3 style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em", margin: "32px 0 14px" }}>Tre soluzioni da confrontare</h3>
      <div className="pkgs">
        {R.packages.map((p, i) => (
          <div className={"pkg" + (i === 1 ? " rec" : "")} key={p.name}>
            {i === 1 && <span className="chip c-ok" style={{ alignSelf: "flex-start" }}>consigliata</span>}
            <h3 style={{ marginTop: i === 1 ? 8 : 0 }}>{p.name}</h3>
            <div className="price">{eur(p.low)} – {eur(p.high)}</div>
            <div className="sub">premio annuo indicativo · {p.items.length} coperture</div>
            <ul>{p.items.map((it) => <li key={it.name}><Icon name="check" /><div>{it.name} <span>· {it.lim}</span></div></li>)}</ul>
          </div>
        ))}
      </div>

      <div className="cta">
        <div>
          <h3>Vuoi trasformare la stima nel prezzo giusto per te?</h3>
          <p>{contactDone
            ? "Richiesta ricevuta: un consulente ALCA Broker ti contatterà a breve per approfondire la tua analisi."
            : "Un consulente ALCA Broker verifica con te esigenze e polizze esistenti e ti prepara una proposta, senza impegno."}</p>
        </div>
        {!contactDone && <button className="btn" onClick={onContact} disabled={contactBusy}><Icon name="phone" />Voglio essere ricontattato</button>}
      </div>

      <p className="legal">I dati contrassegnati come <b>verificato</b> provengono da banche dati pubbliche (VIES – Commissione europea); quelli <b>trovato online</b> sono ricavati automaticamente da siti che pubblicano dati camerali e bilanci, e vanno confermati; quelli <b>indicato da te</b> derivano dalle tue risposte. Il Risk Radar è uno strumento informativo preliminare: non costituisce consulenza, preventivo né offerta contrattuale. Massimali e premi sono indicativi e calcolati con parametri dimostrativi; i premi effettivi dipendono dalle condizioni delle compagnie. Prima di qualunque proposta l'intermediario valuta richieste ed esigenze del cliente secondo la normativa IVASS.</p>
    </div>
  );
}

const Row = ({ k, v, chip }: { k: string; v: string | null | undefined; chip: Chip }) => (
  <><dt>{k}</dt><dd>{v || "—"}</dd><dd>{CHIPS[chip]}</dd></>
);

function Radar({ risks }: { risks: Result["risks"] }) {
  const n = risks.length, cx = 190, cy = 158, R = 108;
  const pt = (i: number, v: number): [number, number] => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / n; return [cx + Math.cos(a) * R * v, cy + Math.sin(a) * R * v]; };
  const poly = (f: (i: number) => number) => risks.map((_, i) => pt(i, f(i)).join(",")).join(" ");
  return (
    <svg viewBox="0 0 380 310" width="100%" style={{ maxWidth: 400, display: "block", margin: "6px auto 0" }} role="img" aria-label="Radar dei rischi">
      {[0.25, 0.5, 0.75, 1].map((l) => <polygon key={l} points={poly(() => l)} fill="none" stroke="#eee7e1" />)}
      {risks.map((r, i) => {
        const [x, y] = pt(i, 1), [lx, ly] = pt(i, 1.17);
        const anc = Math.abs(lx - cx) < 8 ? "middle" : lx > cx ? "start" : "end";
        return (
          <g key={r.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke="#eee7e1" />
            <text x={lx} y={ly + 4} fontSize="11" fill="#5d6980" textAnchor={anc}>{r.label.split(" ")[0]}</text>
          </g>
        );
      })}
      <polygon points={poly((i) => risks[i].score / 100)} fill="rgba(239,107,28,.18)" stroke="#ef6b1c" strokeWidth="2.5" strokeLinejoin="round" />
      {risks.map((r, i) => { const [x, y] = pt(i, r.score / 100); return <circle key={r.key} cx={x} cy={y} r="3.5" fill="#ef6b1c" />; })}
    </svg>
  );
}
