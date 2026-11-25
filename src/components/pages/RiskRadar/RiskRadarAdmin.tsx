// Dashboard commerciale del Risk Radar, sulla struttura del portale ALCA Energia (alca-energy-web/portale.html):
// barra scura con le schede Cruscotto / Analisi / Link / Impostazioni, card, KPI e tabelle.
// Accesso con la chiave di amministrazione: nel DB c'è solo il suo SHA-256 (rr_settings.admin_key_sha256).
// La chiave resta in sessionStorage solo per la scheda corrente.
// Gli operatori di alca-desk non si leggono ancora: il titolare del link si scrive a mano.
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import qrcode from "qrcode-generator";
import { useTheme } from "@/components/dark-mode/theme-provider";
import {
  RrApiError, rrAdminApi, STATUSES,
  type Analysis, type DashboardData, type NotifySettings, type Referrer, type Status,
} from "./api";
import { DIVMAP, EMP, REV } from "./data";
import "./RiskRadar.css";
import "./RiskRadarAdmin.css";

const SESSION_KEY = "rr_admin";
const TAB_KEY = "rr_admin_tab";
const TABS = [
  { id: "cruscotto", label: "Cruscotto" },
  { id: "analisi", label: "Analisi" },
  { id: "link", label: "Link" },
  { id: "impostazioni", label: "Impostazioni" },
] as const;
type Tab = (typeof TABS)[number]["id"];

const STATUS_LABEL: Record<Status, string> = { nuova: "Nuova", contattata: "Contattata", proposta: "Proposta inviata", chiusa: "Chiusa (cliente)", persa: "Persa" };
const VEH = ["Nessuno", "1–3", "4–15", "Più di 15"];
const DIGITAL = ["Marginali", "Gestiamo dati dei clienti", "E-commerce o servizi digitali"];
const EXPORT = ["No", "In Italia", "Anche all'estero"];

const eur = (n: number) => "€ " + Math.round(n || 0).toLocaleString("it-IT", { useGrouping: "always" } as unknown as Intl.NumberFormatOptions);
const dt = (s: string) => new Date(s).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
const refLink = (code: string) => `${window.location.origin}/risk-radar?ref=${encodeURIComponent(code)}`;
const riskClass = (n: number) => (n >= 70 ? "bad" : n >= 50 ? "warn" : "good");
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + "%" : "—");

const store = {
  get: (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } },
  set: (s: Storage, k: string, v: string | null) => { try { if (v === null) s.removeItem(k); else s.setItem(k, v); } catch { /* niente */ } },
};

function sectorOf(a: Analysis) {
  const d = DIVMAP.get(a.ateco_code?.slice(0, 2) ?? "") ?? DIVMAP.get(a.params?.ateco ?? "");
  return d ? d[1] : a.params?.sector ?? "—";
}

/* ---------- QR code (stessa libreria del portale ALCA Energia) ---------- */
function qrMatrix(text: string) {
  const q = qrcode(0, "M");
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return { n, dark: (r: number, c: number) => q.isDark(r, c) };
}
function QrSvg({ text }: { text: string }) {
  const { n, dark } = useMemo(() => qrMatrix(text), [text]);
  let d = "";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`;
  return (
    <svg className="qr" viewBox={`0 0 ${n + 8} ${n + 8}`} role="img" aria-label="Codice QR del link" shapeRendering="crispEdges">
      <rect width="100%" height="100%" fill="#fff" /><path d={d} fill="#172346" />
    </svg>
  );
}
function downloadQrPng(text: string, name: string) {
  const { n, dark } = qrMatrix(text);
  const cell = Math.floor(1024 / (n + 8));
  const size = cell * (n + 8);
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "#172346";
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (dark(r, c)) ctx.fillRect((c + 4) * cell, (r + 4) * cell, cell, cell);
  const a = document.createElement("a");
  a.href = cv.toDataURL("image/png");
  a.download = `risk-radar-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`;
  a.click();
}

export default function RiskRadarAdmin() {
  const { setForcedTheme } = useTheme();
  const [key, setKey] = useState<string | null>(() => store.get(sessionStorage, SESSION_KEY));
  const [keyInput, setKeyInput] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [data, setData] = useState<DashboardData | null>(null);
  const [updatedAt, setUpdatedAt] = useState("");
  const [tab, setTabState] = useState<Tab>(() => (TABS.some((t) => t.id === store.get(localStorage, TAB_KEY)) ? store.get(localStorage, TAB_KEY) as Tab : "cruscotto"));
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number>();
  const showToast = (m: string) => { setToast(m); window.clearTimeout(toastTimer.current); toastTimer.current = window.setTimeout(() => setToast(null), 2600); };
  const setTab = (t: Tab) => { setTabState(t); store.set(localStorage, TAB_KEY, t); window.scrollTo({ top: 0 }); };

  // Analisi: filtri, riga aperta, bozze delle note
  const [fStatus, setFStatus] = useState("");
  const [fRef, setFRef] = useState("");
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Link: nuovo, modifica, QR
  const [newRef, setNewRef] = useState({ name: "", operatore_nome: "", operatore_email: "" });
  const [editRef, setEditRef] = useState<Referrer | null>(null);
  const [qrRef, setQrRef] = useState<Referrer | null>(null);

  // Impostazioni
  const [cfg, setCfg] = useState<{ emails: string; owner: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

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
    store.set(sessionStorage, SESSION_KEY, null);
    setKey(null); setData(null); setCfg(null);
  }, []);

  const load = useCallback(async (k: string) => {
    const d = await rrAdminApi(k).data();
    setData(d);
    setCfg((c) => c ?? { emails: d.settings.notify_emails.join(", "), owner: d.settings.notify_owner });
    setUpdatedAt(new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }));
  }, []);

  // Chiave già in sessione: carica subito, e se non è più valida torna al login.
  useEffect(() => { if (key && !data) load(key).catch(logout); }, [key, data, load, logout]);

  // Aggiornamento automatico ogni 2 minuti a scheda visibile (come i pallini del portale ALCA).
  useEffect(() => {
    if (!key) return;
    const t = window.setInterval(() => { if (document.visibilityState === "visible") load(key).catch(() => undefined); }, 120_000);
    return () => window.clearInterval(t);
  }, [key, load]);

  // Ogni 401 riporta al login (la chiave è stata cambiata).
  const guard = (e: unknown) => { if (e instanceof RrApiError && e.status === 401) logout(); showToast((e as Error).message); };
  const api = key ? rrAdminApi(key) : null;

  async function login(e: FormEvent) {
    e.preventDefault();
    const k = keyInput.trim();
    setLoginErr("");
    try {
      await load(k);
      setKey(k);
      store.set(sessionStorage, SESSION_KEY, k);
      setKeyInput("");
    } catch (x) { setLoginErr(x instanceof RrApiError && x.status === 401 ? "Chiave non valida" : (x as Error).message); }
  }

  /* ---------- azioni ---------- */
  const patchAnalysis = (id: string, p: Partial<Analysis>) =>
    setData((d) => d && { ...d, analyses: d.analyses.map((a) => (a.id === id ? { ...a, ...p } : a)) });
  const putReferrer = (r: Referrer) =>
    setData((d) => d && { ...d, referrers: d.referrers.some((x) => x.code === r.code) ? d.referrers.map((x) => (x.code === r.code ? r : x)) : [...d.referrers, r] });

  async function changeStatus(id: string, status: Status) {
    if (!api) return;
    try { const r = await api.update(id, { status }); patchAnalysis(id, { status, updated_at: r.updated_at }); showToast("Stato aggiornato"); }
    catch (x) { guard(x); }
  }
  async function saveNote(id: string) {
    if (!api || notes[id] === undefined) return;
    try {
      const r = await api.update(id, { note: notes[id] });
      patchAnalysis(id, { note: notes[id].trim() || null, updated_at: r.updated_at });
      setNotes((n) => { const next = { ...n }; delete next[id]; return next; });
      showToast("Nota salvata");
    } catch (x) { guard(x); }
  }
  async function createReferrer(e: FormEvent) {
    e.preventDefault();
    if (!api || !newRef.name.trim()) return;
    try { putReferrer(await api.referrer(newRef)); setNewRef({ name: "", operatore_nome: "", operatore_email: "" }); showToast("Link creato"); }
    catch (x) { guard(x); }
  }
  async function saveReferrer(e: FormEvent) {
    e.preventDefault();
    if (!api || !editRef) return;
    try {
      putReferrer(await api.updateReferrer(editRef.code, { name: editRef.name, operatore_nome: editRef.operatore_nome ?? "", operatore_email: editRef.operatore_email ?? "" }));
      setEditRef(null); showToast("Link aggiornato");
    } catch (x) { guard(x); }
  }
  async function toggleReferrer(r: Referrer) {
    if (!api) return;
    try { putReferrer(await api.updateReferrer(r.code, { active: !r.active })); showToast(r.active ? "Link disattivato" : "Link riattivato"); }
    catch (x) { guard(x); }
  }
  function copyLink(code: string) {
    const l = refLink(code);
    (navigator.clipboard ? navigator.clipboard.writeText(l) : Promise.reject())
      .then(() => showToast("Link copiato"), () => window.prompt("Copia il link:", l));
  }
  async function saveSettings(e: FormEvent) {
    e.preventDefault();
    if (!api || !cfg) return;
    setBusy(true);
    try {
      const s: NotifySettings = await api.settings({ notify_emails: cfg.emails.split(/[,;\s]+/).filter(Boolean), notify_owner: cfg.owner });
      setData((d) => d && { ...d, settings: { ...d.settings, ...s } });
      setCfg({ emails: s.notify_emails.join(", "), owner: s.notify_owner });
      showToast("Impostazioni salvate");
    } catch (x) { guard(x); } finally { setBusy(false); }
  }
  async function testEmail() {
    if (!api) return;
    setBusy(true);
    try { const r = await api.testEmail(); showToast(`Email di prova inviata a ${r.to.join(", ")}`); }
    catch (x) { guard(x); } finally { setBusy(false); }
  }
  function exportCsv() {
    if (!data) return;
    const h = ["data", "ragione_sociale", "piva", "email", "telefono", "vuole_consulente", "settore", "rischio", "budget_min", "budget_max", "link", "titolare", "stato", "note"];
    const rows = data.analyses.map((a) => {
      const r = refs.find((x) => x.code === a.ref_code);
      return [a.created_at, a.company_name || "", a.piva, a.email, a.phone || "", a.wants_contact ? "si" : "no", sectorOf(a), a.overall_risk, a.budget_low, a.budget_high, r?.name || "diretto", r?.operatore_nome || "", a.status, a.note || ""];
    });
    const csv = [h, ...rows].map((r) => r.map((x) => '"' + String(x ?? "").replace(/"/g, '""') + '"').join(";")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    const l = document.createElement("a");
    l.href = url; l.download = "risk-radar-opportunita.csv"; l.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------- dati derivati ---------- */
  const an = useMemo(() => data?.analyses ?? [], [data]);
  const refs = useMemo(() => data?.referrers ?? [], [data]);
  const refByCode = useMemo(() => new Map(refs.map((r) => [r.code, r])), [refs]);
  const nNew = an.filter((a) => a.status === "nuova").length;
  const weekAgo = Date.now() - 7 * 864e5;
  const perRef = useMemo(() => {
    const m = new Map<string | null, { n: number; lead: number; won: number; budget: number }>();
    for (const a of an) {
      const k = a.ref_code && refByCode.has(a.ref_code) ? a.ref_code : null;
      const s = m.get(k) ?? { n: 0, lead: 0, won: 0, budget: 0 };
      s.n++; if (a.wants_contact) s.lead++; if (a.status === "chiusa") s.won++; s.budget += ((a.budget_low || 0) + (a.budget_high || 0)) / 2;
      m.set(k, s);
    }
    return m;
  }, [an, refByCode]);
  const maxPerRef = Math.max(1, ...[...perRef.values()].map((s) => s.n));
  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return an.filter((a) =>
      (!fStatus || (fStatus === "lead" ? a.wants_contact : a.status === fStatus)) &&
      (!fRef || (fRef === "diretto" ? !a.ref_code : a.ref_code === fRef)) &&
      (!s || [a.company_name, a.piva, a.email, a.phone].join(" ").toLowerCase().includes(s)));
  }, [an, fStatus, fRef, q]);

  const goAnalisi = (status = "", ref = "") => { setFStatus(status); setFRef(ref); setQ(""); setTab("analisi"); };

  /* ---------- viste ---------- */
  const refName = (code: string | null) => {
    const r = code ? refByCode.get(code) : null;
    return r ? <>{r.name}{r.operatore_nome && <div className="small muted">{r.operatore_nome}</div>}</> : <span className="muted">diretto</span>;
  };

  const cruscotto = (
    <>
      <div className="kpis">
        <div className="kpi"><div className="l">Analisi eseguite</div><div className="v">{an.length}</div><div className="s">{an.filter((a) => new Date(a.created_at).getTime() > weekAgo).length} negli ultimi 7 giorni</div></div>
        <div className={"kpi" + (nNew ? " hot" : "")}><div className="l">Da gestire</div><div className="v">{nNew}</div><div className="s">in stato "nuova"</div></div>
        <div className="kpi"><div className="l">Chiedono un consulente</div><div className="v">{an.filter((a) => a.wants_contact).length}</div><div className="s">{pct(an.filter((a) => a.wants_contact).length, an.length)} delle analisi</div></div>
        <div className="kpi"><div className="l">Chiuse</div><div className="v">{an.filter((a) => a.status === "chiusa").length}</div><div className="s">conversione {pct(an.filter((a) => a.status === "chiusa").length, an.length)}</div></div>
        <div className="kpi"><div className="l">Potenziale premi</div><div className="v">{eur(an.reduce((s, a) => s + ((a.budget_low || 0) + (a.budget_high || 0)) / 2, 0))}</div><div className="s">soluzione equilibrata, valore medio</div></div>
      </div>
      <div className="grid2">
        <div className="card">
          <div className="card-head"><h2>Da gestire</h2>{nNew > 0 && <button className="btn g sm" onClick={() => goAnalisi("nuova")}>Vedi tutte</button>}</div>
          {nNew ? (
            <div className="tw"><table>
              <thead><tr><th>Data</th><th>Azienda</th><th>Rischio</th><th>Link</th></tr></thead>
              <tbody>{an.filter((a) => a.status === "nuova").slice(0, 8).map((a) => (
                <tr key={a.id} className="click" onClick={() => { goAnalisi("nuova"); setOpenId(a.id); }}>
                  <td className="num">{dt(a.created_at)}</td>
                  <td><b>{a.company_name || "P.IVA " + a.piva}</b>{a.wants_contact && <div><span className="pill hot">vuole un consulente</span></div>}</td>
                  <td><span className={"pill " + riskClass(a.overall_risk)}>{a.overall_risk}</span></td>
                  <td>{refName(a.ref_code)}</td>
                </tr>))}
              </tbody>
            </table></div>
          ) : <div className="empty">Nessuna analisi da gestire.</div>}
        </div>
        <div className="card">
          <div className="card-head"><h2>Rendimento dei link</h2><button className="btn g sm" onClick={() => setTab("link")}>Gestisci link</button></div>
          <div className="tw"><table>
            <thead><tr><th>Link</th><th>Analisi</th><th className="num">Consulente</th><th className="num">Chiuse</th></tr></thead>
            <tbody>
              {[...refs.map((r) => r.code), null].filter((c) => perRef.has(c) || c !== null).map((c) => {
                const s = perRef.get(c) ?? { n: 0, lead: 0, won: 0, budget: 0 };
                return (
                  <tr key={c ?? "diretto"} className="click" onClick={() => goAnalisi("", c ?? "diretto")}>
                    <td>{refName(c)}</td>
                    <td><div className="btn-row" style={{ flexWrap: "nowrap" }}><span className="num" style={{ minWidth: 22 }}>{s.n}</span><div className="barra" style={{ flex: 1 }}><span style={{ width: `${(s.n / maxPerRef) * 100}%` }} /></div></div></td>
                    <td className="num">{s.lead}</td>
                    <td className="num">{s.won} <span className="small muted">({pct(s.won, s.n)})</span></td>
                  </tr>
                );
              })}
              {!refs.length && !perRef.size && <tr><td colSpan={4} className="empty">Nessun link ancora: crealo nella scheda Link.</td></tr>}
            </tbody>
          </table></div>
        </div>
      </div>
    </>
  );

  const detail = (a: Analysis) => {
    const p = a.params;
    const draft = notes[a.id];
    return (
      <div className="det-grid">
        <div>
          <h3>Dati inseriti dall'azienda</h3>
          <dl>
            <dt>Sede</dt><dd>{a.address || "—"}</dd>
            <dt>Settore</dt><dd>{sectorOf(a)}{a.ateco_code && <> · ATECO {a.ateco_code} <span className="pill">{{ registro: "registro", web: "online", cliente: "cliente" }[a.ateco_source ?? "cliente"]}</span></>}</dd>
            {p && <>
              <dt>Fatturato</dt><dd>{REV[p.rev] ?? "—"}</dd>
              <dt>Dipendenti</dt><dd>{EMP[p.emp] ?? "—"}</dd>
              <dt>Veicoli</dt><dd>{p.vehCount ? `${p.vehCount}` : VEH[p.veh] ?? "—"}</dd>
              <dt>Locali</dt><dd>{p.prop === "own" ? "Di proprietà" : "In affitto"}</dd>
              <dt>Attività digitali</dt><dd>{DIGITAL[p.digital] ?? "—"}</dd>
              <dt>Spedizioni</dt><dd>{EXPORT[p.export] ?? "—"}</dd>
            </>}
            <dt>Partita IVA</dt><dd>{a.piva}{a.vies_valid === false && <> <span className="pill bad">non attiva VIES</span></>}</dd>
            <dt>Email di avviso</dt><dd>{a.notified_at
              ? <span className="pill good">inviata {dt(a.notified_at)}</span>
              : a.notify_error ? <span className="pill bad" title={a.notify_error}>non inviata</span>
              : <span className="muted">nessun destinatario</span>}
              {a.notified_to && <div className="small muted">{a.notified_to}</div>}</dd>
          </dl>
        </div>
        <div>
          <h3>Note interne</h3>
          <p className="small muted" style={{ margin: "4px 0 8px" }}>Visibili solo nella dashboard: esito delle chiamate, proposta inviata, prossimi passi.</p>
          <textarea value={draft ?? a.note ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))} maxLength={2000} />
          <div className="btn-row" style={{ marginTop: 8 }}>
            <button className="btn sm" disabled={draft === undefined} onClick={() => saveNote(a.id)}>Salva nota</button>
            {a.phone && <a className="btn g sm" href={`tel:${a.phone.replace(/\s/g, "")}`}>Chiama {a.phone}</a>}
            <a className="btn g sm" href={`mailto:${a.email}`}>Scrivi email</a>
            {a.updated_at && <span className="small muted">Ultima modifica {dt(a.updated_at)}</span>}
          </div>
        </div>
      </div>
    );
  };

  const analisi = (
    <div className="card">
      <div className="card-head">
        <h2>Analisi e opportunità</h2>
        <div className="btn-row">
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} aria-label="Filtra per stato">
            <option value="">Tutti gli stati</option><option value="lead">Solo chi chiede un consulente</option>
            {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
          <select value={fRef} onChange={(e) => setFRef(e.target.value)} aria-label="Filtra per link">
            <option value="">Tutti i link</option><option value="diretto">Accesso diretto</option>
            {refs.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
          </select>
          <input placeholder="Cerca azienda, P.IVA, email" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn g" onClick={exportCsv}>Esporta CSV</button>
        </div>
      </div>
      <div className="tw"><table>
        <thead><tr><th>Data</th><th>Azienda</th><th>Contatto</th><th>Rischio</th><th>Budget equilibrata</th><th>Link</th><th>Stato</th></tr></thead>
        <tbody>
          {rows.length ? rows.flatMap((a) => {
            const open = openId === a.id;
            const tr = (
              <tr key={a.id} className={"click" + (open ? " open" : "")} onClick={() => setOpenId(open ? null : a.id)} aria-expanded={open}>
                <td className="num">{dt(a.created_at)}</td>
                <td><b>{a.company_name || "—"}</b><div className="small muted">P.IVA {a.piva}</div>{a.note && <div className="small muted">Nota: {a.note.slice(0, 60)}{a.note.length > 60 ? "…" : ""}</div>}</td>
                <td>{a.email}<div className="small muted">{a.phone || ""}</div>{a.wants_contact && <span className="pill hot">vuole un consulente</span>}</td>
                <td><span className={"pill " + riskClass(a.overall_risk)}>{a.overall_risk}</span></td>
                <td className="num">{eur(a.budget_low)} – {eur(a.budget_high)}</td>
                <td>{refName(a.ref_code)}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select className={"st " + a.status} value={a.status} onChange={(e) => changeStatus(a.id, e.target.value as Status)} aria-label="Stato">
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </td>
              </tr>
            );
            return open ? [tr, <tr key={a.id + "-d"} className="det"><td colSpan={7}>{detail(a)}</td></tr>] : [tr];
          }) : <tr><td colSpan={7} className="empty">{an.length ? "Nessuna analisi con questi filtri." : "Nessuna analisi ancora."}</td></tr>}
        </tbody>
      </table></div>
    </div>
  );

  const link = (
    <>
      <div className="card">
        <div className="card-head"><div><h2>Nuovo link</h2><div className="small muted">Il link porta l'azienda al Risk Radar e collega l'analisi a chi l'ha procurata.</div></div></div>
        <form className="fields" onSubmit={createReferrer}>
          <label className="field">Nome del link *<input required maxLength={80} placeholder="Es. Studio Rossi, Fiera 2026" value={newRef.name} onChange={(e) => setNewRef({ ...newRef, name: e.target.value })} /></label>
          <label className="field">Titolare (collaboratore)<input maxLength={120} placeholder="Nome e cognome" value={newRef.operatore_nome} onChange={(e) => setNewRef({ ...newRef, operatore_nome: e.target.value })} /></label>
          <label className="field">Email del titolare<input type="email" maxLength={200} placeholder="Riceve l'avviso, se attivo" value={newRef.operatore_email} onChange={(e) => setNewRef({ ...newRef, operatore_email: e.target.value })} /></label>
          <div><button className="btn">Crea link</button></div>
        </form>
      </div>
      <div className="card">
        <div className="card-head"><h2>Link dei collaboratori</h2><span className="small muted">{refs.filter((r) => r.active).length} attivi su {refs.length}</span></div>
        <div className="tw"><table>
          <thead><tr><th>Link</th><th>Titolare</th><th>Indirizzo da inviare</th><th className="num">Analisi</th><th className="num">Consulente</th><th>Stato</th><th /></tr></thead>
          <tbody>
            {refs.length ? refs.map((r) => {
              const s = perRef.get(r.code);
              return (
                <tr key={r.code} className={r.active ? "" : "off"}>
                  <td><b>{r.name}</b></td>
                  <td>{r.operatore_nome || <span className="muted">—</span>}{r.operatore_email && <div className="small muted">{r.operatore_email}</div>}</td>
                  <td className="link">{refLink(r.code)}</td>
                  <td className="num">{s?.n ?? 0}</td>
                  <td className="num">{s?.lead ?? 0}</td>
                  <td>{r.active ? <span className="pill good">attivo</span> : <span className="pill">disattivato</span>}</td>
                  <td><div className="btn-row" style={{ flexWrap: "nowrap" }}>
                    <button className="btn g sm" onClick={() => copyLink(r.code)}>Copia</button>
                    <button className="btn g sm" onClick={() => setQrRef(r)}>QR</button>
                    <button className="btn g sm" onClick={() => setEditRef(r)}>Modifica</button>
                    <button className="btn g sm" onClick={() => toggleReferrer(r)}>{r.active ? "Disattiva" : "Riattiva"}</button>
                  </div></td>
                </tr>
              );
            }) : <tr><td colSpan={7} className="empty">Nessun link: crea il primo qui sopra.</td></tr>}
          </tbody>
        </table></div>
        <p className="small muted" style={{ marginBottom: 0 }}>Un link disattivato resta nelle statistiche, ma le nuove analisi fatte da quel link risultano "accesso diretto".</p>
      </div>
    </>
  );

  const owners = refs.filter((r) => r.active && r.operatore_email).length;
  const impostazioni = cfg && (
    <div className="card" style={{ maxWidth: 760 }}>
      <div className="card-head"><div><h2>Email "Nuova analisi"</h2><div className="small muted">Parte quando un'azienda completa l'analisi, dal nostro indirizzo (lo stesso di "OK, il prezzo è giusto?").</div></div>
        {data?.settings.smtp === false && <span className="pill bad">SMTP non configurato</span>}</div>
      <form onSubmit={saveSettings}>
        <label className="field">Indirizzi dell'ufficio (separati da virgola, massimo 10)
          <textarea rows={2} placeholder="Nessun indirizzo: l'email non parte" value={cfg.emails} onChange={(e) => setCfg({ ...cfg, emails: e.target.value })} />
        </label>
        <label className="check" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={cfg.owner} onChange={(e) => setCfg({ ...cfg, owner: e.target.checked })} />
          <span>Avvisa anche il titolare del link<div className="small muted">Solo per i link con l'email del titolare ({owners} attivi oggi). Riceve i dati dell'azienda che ha usato il suo link.</div></span>
        </label>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn" disabled={busy}>Salva</button>
          <button type="button" className="btn g" disabled={busy || !data?.settings.notify_emails.length} onClick={testEmail}
            title="Invia un esempio con dati inventati agli indirizzi dell'ufficio salvati">Invia email di prova</button>
        </div>
        <p className="small muted" style={{ marginBottom: 0 }}>L'email di prova va solo agli indirizzi dell'ufficio già salvati, mai ai titolari dei link.</p>
      </form>
    </div>
  );

  return (
    <div className="rra">
      <header className="rra-top">
        <div className="rra-top-in">
          <div className="brand"><div className="mark">✓</div><div>Risk Radar Aziende<small>Dashboard · ALCA Broker</small></div></div>
          {data && (
            <nav className="tabs" aria-label="Sezioni">
              {TABS.map((t) => (
                <button key={t.id} className={"tab" + (tab === t.id ? " on" : "")} aria-current={tab === t.id ? "page" : undefined} onClick={() => setTab(t.id)}>
                  {t.label}{t.id === "analisi" && nNew > 0 && <span className="dot" aria-label={`${nNew} da gestire`}>{nNew}</span>}
                </button>
              ))}
            </nav>
          )}
          {data && (
            <div className="user">
              <div>Amministratore<small>aggiornato alle {updatedAt}</small></div>
              <button className="btn g sm" onClick={() => key && load(key).catch(guard)} title="Aggiorna">↻</button>
              <button className="btn g sm" onClick={logout}>Esci</button>
            </div>
          )}
        </div>
      </header>
      <main className="rra-main">
        {!data ? (
          <form className="card login" onSubmit={login}>
            <h2>Accesso dashboard</h2>
            <p className="muted small">Inserisci la chiave di amministrazione.</p>
            <input type="password" autoComplete="current-password" placeholder="Chiave" style={{ width: "100%" }} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} />
            <div className="err">{loginErr}</div>
            <button className="btn" style={{ width: "100%", justifyContent: "center" }}>Entra</button>
          </form>
        ) : tab === "cruscotto" ? cruscotto : tab === "analisi" ? analisi : tab === "link" ? link : impostazioni}
      </main>

      {qrRef && (
        <div className="modal-bg" onClick={() => setQrRef(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label={`QR del link ${qrRef.name}`} onClick={(e) => e.stopPropagation()}>
            <h2>{qrRef.name}</h2>
            <div className="link" style={{ marginTop: 4 }}>{refLink(qrRef.code)}</div>
            <QrSvg text={refLink(qrRef.code)} />
            <div className="btn-row" style={{ justifyContent: "flex-end" }}>
              <button className="btn g" onClick={() => setQrRef(null)}>Chiudi</button>
              <button className="btn" onClick={() => downloadQrPng(refLink(qrRef.code), qrRef.name)}>Scarica PNG</button>
            </div>
          </div>
        </div>
      )}
      {editRef && (
        <div className="modal-bg" onClick={() => setEditRef(null)}>
          <form className="modal" role="dialog" aria-modal="true" aria-label="Modifica link" onClick={(e) => e.stopPropagation()} onSubmit={saveReferrer}>
            <h2>Modifica link</h2>
            <p className="small muted">L'indirizzo del link non cambia: {refLink(editRef.code)}</p>
            <div style={{ display: "grid", gap: 10 }}>
              <label className="field">Nome del link *<input required maxLength={80} value={editRef.name} onChange={(e) => setEditRef({ ...editRef, name: e.target.value })} /></label>
              <label className="field">Titolare<input maxLength={120} value={editRef.operatore_nome ?? ""} onChange={(e) => setEditRef({ ...editRef, operatore_nome: e.target.value })} /></label>
              <label className="field">Email del titolare<input type="email" maxLength={200} value={editRef.operatore_email ?? ""} onChange={(e) => setEditRef({ ...editRef, operatore_email: e.target.value })} /></label>
            </div>
            <div className="btn-row" style={{ justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn g" onClick={() => setEditRef(null)}>Annulla</button>
              <button className="btn">Salva</button>
            </div>
          </form>
        </div>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
