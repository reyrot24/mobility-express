// Dashboard commerciale del Risk Radar (porting di ALCA-Risk-Radar/1-sito-online/admin.html).
// Accesso con la chiave di amministrazione: nel DB c'è solo il suo SHA-256 (rr_settings.admin_key_sha256).
// La chiave resta in sessionStorage solo per la scheda corrente.
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/dark-mode/theme-provider";
import { RrApiError, rrAdminApi, STATUSES, type Analysis, type Referrer, type Status } from "./api";
import "./RiskRadar.css";

const SESSION_KEY = "rr_admin";
const eur = (n: number) => "€ " + Math.round(n || 0).toLocaleString("it-IT", { useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
const SECT: Record<string, string> = { A: "Agricoltura", C: "Manifattura", F: "Costruzioni", G: "Commercio", H: "Trasporti", I: "Ristorazione/alloggio", J: "ICT", K: "Finanza", M: "Professioni", Q: "Sanità", S: "Altri servizi" };
const refLink = (code: string) => `${window.location.origin}/risk-radar?ref=${encodeURIComponent(code)}`;

const readKey = () => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } };

export default function RiskRadarAdmin() {
  const { setForcedTheme } = useTheme();
  const [key, setKey] = useState<string | null>(readKey);
  const [keyInput, setKeyInput] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [data, setData] = useState<{ referrers: Referrer[]; analyses: Analysis[] } | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [filter, setFilter] = useState("");
  const [q, setQ] = useState("");
  const [refName, setRefName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const showToast = (m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), 2600); };

  useEffect(() => {
    document.title = "Dashboard Risk Radar | ALCA Broker";
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex,nofollow";
    document.head.appendChild(meta);
    setForcedTheme("light");
    return () => { meta.remove(); setForcedTheme(null); };
  }, [setForcedTheme]);

  const logout = useCallback(() => {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* niente */ }
    setKey(null); setData(null);
  }, []);

  const load = useCallback(async (k: string) => {
    const d = await rrAdminApi(k).data();
    setData(d);
    setUpdatedAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  // Chiave già in sessione: carica subito, e se non è più valida torna al login.
  useEffect(() => { if (key && !data) load(key).catch(logout); }, [key, data, load, logout]);

  // Ogni 401 riporta al login (la chiave è stata cambiata).
  const guard = (e: unknown) => { if (e instanceof RrApiError && e.status === 401) logout(); showToast((e as Error).message); };

  async function login(e: FormEvent) {
    e.preventDefault();
    const k = keyInput.trim();
    setLoginErr("");
    try {
      await load(k);
      setKey(k);
      try { sessionStorage.setItem(SESSION_KEY, k); } catch { /* niente */ }
      setKeyInput("");
    } catch (x) { setLoginErr(x instanceof RrApiError && x.status === 401 ? "Chiave non valida" : (x as Error).message); }
  }

  async function createReferrer(e: FormEvent) {
    e.preventDefault();
    const name = refName.trim();
    if (!name || !key || !data) return;
    try {
      const r = await rrAdminApi(key).referrer(name);
      setData({ ...data, referrers: [...data.referrers, r] });
      setRefName("");
      showToast("Link creato");
    } catch (x) { guard(x); }
  }

  async function changeStatus(id: string, status: Status) {
    if (!key || !data) return;
    try {
      await rrAdminApi(key).status(id, status);
      setData({ ...data, analyses: data.analyses.map((a) => (a.id === id ? { ...a, status } : a)) });
      showToast("Stato aggiornato");
    } catch (x) { guard(x); }
  }

  function copyLink(code: string) {
    const l = refLink(code);
    (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject())
      .then(() => showToast("Link copiato"), () => window.prompt("Copia il link:", l));
  }

  function exportCsv() {
    if (!data) return;
    const h = ["data", "ragione_sociale", "piva", "email", "telefono", "vuole_consulente", "settore", "rischio", "budget_min", "budget_max", "collaboratore", "stato"];
    const rows = data.analyses.map((a) => [a.created_at, a.company_name || "", a.piva, a.email, a.phone || "", a.wants_contact ? "si" : "no", a.params?.sector, a.overall_risk, a.budget_low, a.budget_high, data.referrers.find((r) => r.code === a.ref_code)?.name || "", a.status]);
    const csv = [h, ...rows].map((r) => r.map((x) => '"' + String(x ?? "").replace(/"/g, '""') + '"').join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    const l = document.createElement("a");
    l.href = url; l.download = "risk-radar-opportunita.csv"; l.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const an = useMemo(() => data?.analyses ?? [], [data]);
  const refs = data?.referrers ?? [];
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return an.filter((a) => (!filter || (filter === "lead" ? a.wants_contact : a.status === filter)) && (!s || [a.company_name, a.piva, a.email].join(" ").toLowerCase().includes(s)));
  }, [an, filter, q]);
  const weekAgo = Date.now() - 7 * 864e5;

  return (
    <div className="rra">
      <header className="rra-header">
        <div className="hw">
          <div className="mark">✓</div>
          <div><b>Risk Radar Aziende</b><small>Dashboard commerciale · ALCA Broker</small></div>
          <div className="sp" />
          {data && <button className="btn g" onClick={logout}>Esci</button>}
        </div>
      </header>
      <div className="rra-main">
        {!data ? (
          <form className="card login" onSubmit={login}>
            <h2>Accesso dashboard</h2>
            <p className="muted small">Inserisci la chiave di amministrazione.</p>
            <input type="password" autoComplete="current-password" placeholder="Chiave" style={{ width: "100%" }} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
            <div className="err">{loginErr}</div>
            <button className="btn" style={{ width: "100%" }}>Entra</button>
          </form>
        ) : (
          <div>
            <div className="row">
              <div><h2>Panoramica</h2><div className="muted small">Aggiornato alle {updatedAt}</div></div>
              <div className="sp" />
              <button className="btn g" onClick={() => key && load(key).catch(guard)}>Aggiorna</button>
              <button className="btn g" onClick={exportCsv}>Esporta CSV</button>
            </div>
            <div className="stats">
              <div className="card"><div className="muted small">Analisi eseguite</div><div className="stat">{an.length}</div></div>
              <div className="card"><div className="muted small">Chiedono un consulente</div><div className="stat">{an.filter((a) => a.wants_contact).length}</div></div>
              <div className="card"><div className="muted small">Ultimi 7 giorni</div><div className="stat">{an.filter((a) => new Date(a.created_at).getTime() > weekAgo).length}</div></div>
              <div className="card"><div className="muted small">Potenziale premi (equilibrata, valore medio)</div><div className="stat">{eur(an.reduce((s, a) => s + ((a.budget_low || 0) + (a.budget_high || 0)) / 2, 0))}</div></div>
            </div>

            <div className="card">
              <h3>Link dei collaboratori</h3>
              <form className="row" onSubmit={createReferrer}>
                <input placeholder="Nome collaboratore" style={{ flex: 1, minWidth: 220 }} value={refName} onChange={(e) => setRefName(e.target.value)} />
                <button className="btn">Crea link</button>
              </form>
              <div className="tw"><table>
                <thead><tr><th>Collaboratore</th><th>Link da inviare alle aziende</th><th>Analisi</th><th>Consulente richiesto</th><th /></tr></thead>
                <tbody>
                  {refs.length ? refs.map((r) => (
                    <tr key={r.code}>
                      <td><b>{r.name}</b></td>
                      <td className="link">{refLink(r.code)}</td>
                      <td className="n">{an.filter((a) => a.ref_code === r.code).length}</td>
                      <td className="n">{an.filter((a) => a.ref_code === r.code && a.wants_contact).length}</td>
                      <td><button className="btn g" onClick={() => copyLink(r.code)}>Copia</button></td>
                    </tr>
                  )) : <tr><td colSpan={5} className="muted">Nessun collaboratore: crea il primo link qui sopra.</td></tr>}
                </tbody>
              </table></div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="row">
                <h3 style={{ margin: 0 }}>Analisi e opportunità</h3>
                <div className="sp" />
                <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="">Tutte</option><option value="lead">Solo chi chiede un consulente</option>
                  {STATUSES.map((s) => <option key={s} value={s}>Stato: {s}</option>)}
                </select>
                <input placeholder="Cerca azienda, P.IVA, email" style={{ minWidth: 220 }} value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="tw"><table>
                <thead><tr><th>Data</th><th>Azienda</th><th>Contatto</th><th>ATECO</th><th>Rischio</th><th>Budget equilibrata</th><th>Collaboratore</th><th>Stato</th></tr></thead>
                <tbody>
                  {rows.length ? rows.map((a) => {
                    const rn = refs.find((r) => r.code === a.ref_code);
                    const lv = a.overall_risk >= 70 ? "c-hi" : a.overall_risk >= 50 ? "c-ip" : "c-ok";
                    return (
                      <tr key={a.id}>
                        <td className="n">{new Date(a.created_at).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                        <td><b>{a.company_name || "—"}</b><div className="small muted">P.IVA {a.piva}{a.vies_valid === false && <> · <span className="chip c-hi">non attiva VIES</span></>}</div></td>
                        <td>{a.email}<div className="small muted">{a.phone || ""}</div>{a.wants_contact && <span className="chip c-ok">vuole un consulente</span>}</td>
                        <td>{a.ateco_code
                          ? <>{a.ateco_code} <span className={"chip " + (a.ateco_source === "registro" ? "c-ok" : a.ateco_source === "web" ? "c-na" : "c-ip")}>{{ registro: "registro", web: "online", cliente: "cliente" }[a.ateco_source ?? "cliente"]}</span></>
                          : SECT[a.params?.sector ?? ""] || a.params?.sector || "—"}</td>
                        <td><span className={"chip " + lv}>{a.overall_risk}</span></td>
                        <td className="n">{eur(a.budget_low)} – {eur(a.budget_high)}</td>
                        <td>{rn ? rn.name : "diretto"}</td>
                        <td><select value={a.status} onChange={(e) => changeStatus(a.id, e.target.value as Status)}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
                      </tr>
                    );
                  }) : <tr><td colSpan={8} className="muted">Nessuna analisi.</td></tr>}
                </tbody>
              </table></div>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
