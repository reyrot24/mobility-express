// Risk Radar Aziende: chiamate alle Edge Functions risk-radar e risk-radar-admin
// dello stesso progetto Supabase del resto del sito (VITE_SUPABASE_URL).
// In locale si può puntare a `npm run rr:dev` con VITE_RR_API_BASE=http://localhost:54321/functions/v1.
const API_BASE = (
  (import.meta.env.VITE_RR_API_BASE as string | undefined) ??
  `${(import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? ""}/functions/v1`
).replace(/\/$/, "");

export class RrApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function post<T>(path: string, body: unknown, headers: Record<string, string> = {}): Promise<T> {
  if (!API_BASE.startsWith("http")) throw new RrApiError("Servizio non ancora configurato.", 0);
  const r = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new RrApiError(j.error || "Servizio momentaneamente non disponibile.", r.status);
  return j as T;
}

/* ---------- Tipi delle risposte ---------- */
export type Ateco = { code: string; description: string | null; division: string | null };
export type Registry = {
  name: string | null; town: string | null; status: string | null; ateco: Ateco | null;
  turnover: number | null; employees: number | null; revIdx: number | null; empIdx: number | null; year: number | null;
};
export type WebData = {
  status: string; name?: string | null; ateco?: Ateco | null; turnover?: number | null; year?: number | null;
  employees?: number | null; revIdx?: number | null; empIdx?: number | null; source?: string;
};
export type Company = {
  piva?: string; checked: boolean; valid?: boolean; name?: string | null; address?: string | null;
  registry?: Registry | null; web?: WebData;
};
export type Params = {
  ateco: string; rev: number; emp: number; veh: number; vehCount: number | null;
  prop: "own" | "rent"; digital: number; export: number; sector?: string;
};
export type Cover = { id: string; name: string; short: string; why: string; score: number; prio: "alta" | "media" | "bassa"; low: number; high: number; limit: string };
export type Package = { name: string; items: { name: string; lim: string; low: number; high: number }[]; low: number; high: number };
export type Result = {
  sector: { code: string; name: string; group: string }; revenue: string; employees: string; vehicles: number;
  risks: { key: string; label: string; score: number }[]; covers: Cover[]; packages: Package[]; overall: number; disclaimer: string;
};

export const rrApi = {
  lookup: (piva: string) => post<Company>("risk-radar/lookup", { piva }),
  enrich: (piva: string) => post<WebData>("risk-radar/enrich", { piva }),
  analyze: (body: { piva: string; params: Params; ref: string | null; email: string; phone: string; wants_contact: boolean; send_summary: boolean }) =>
    post<{ id: string; company: Company; result: Result; summary: "conferma" | "limite_superato" | null }>("risk-radar/analyze", body),
  contact: (id: string) => post<{ ok: true }>("risk-radar/contact", { id }),
  /** Conferma dell'email (link ricevuto): fa partire il riepilogo dell'analisi. */
  confirm: (token: string) => post<{ ok: true; company: string; email: string; already?: boolean }>("risk-radar/confirm", { token }),
};

/* ---------- Dashboard ---------- */
export const STATUSES = ["nuova", "contattata", "proposta", "chiusa", "persa"] as const;
export type Status = (typeof STATUSES)[number];
export type Referrer = {
  code: string; name: string; active: boolean; created_at: string;
  operatore_id: string | null; operatore_nome: string | null; operatore_email: string | null;
  link_sent_at: string | null; link_sent_to: string | null;
};
export type Analysis = {
  id: string; created_at: string; updated_at: string | null; piva: string; company_name: string | null; address: string | null; vies_valid: boolean | null;
  ref_code: string | null; params: Params | null; ateco_code: string | null; ateco_source: "registro" | "web" | "cliente" | null;
  overall_risk: number; budget_low: number; budget_high: number; email: string; phone: string | null; wants_contact: boolean; status: Status;
  note: string | null; notified_at: string | null; notified_to: string | null; notify_error: string | null;
  contact_requested_at: string | null; contact_notified_at: string | null; contact_notify_error: string | null;
  summary_requested_at: string | null; summary_confirmed_at: string | null; summary_sent_at: string | null; summary_status: string | null;
};
export type NotifySettings = {
  notify_emails: string[]; notify_owner: boolean; smtp?: boolean;
  /** Email al cliente: live = RR_EMAIL_REALI "true"; altrimenti partono solo verso la allowlist. */
  customer?: { live: boolean; allowlist: string[] };
};
export type DashboardData = { user: string; referrers: Referrer[]; analyses: Analysis[]; settings: NotifySettings };
export type ReferrerInput = { name?: string; operatore_nome?: string; operatore_email?: string; active?: boolean };

/** Accesso alla dashboard: il token vale 12 ore e va nell'header x-admin-token. */
export const rrAdminLogin = (username: string, password: string) =>
  post<{ token: string; username: string; expires_at: string }>("risk-radar-admin/login", { username, password });

export const rrAdminApi = (token: string) => {
  const h = { "x-admin-token": token };
  return {
    logout: () => post<{ ok: true }>("risk-radar-admin/logout", {}, h),
    data: () => post<DashboardData>("risk-radar-admin/data", {}, h),
    referrer: (r: ReferrerInput & { name: string }) => post<Referrer>("risk-radar-admin/referrer", r, h),
    updateReferrer: (code: string, r: ReferrerInput) => post<Referrer>("risk-radar-admin/referrer-update", { code, ...r }, h),
    update: (id: string, patch: { status?: Status; note?: string }) =>
      post<{ ok: true; updated_at: string }>("risk-radar-admin/status", { id, ...patch }, h),
    settings: (s: NotifySettings) => post<NotifySettings>("risk-radar-admin/settings", s, h),
    testEmail: () => post<{ ok: true; to: string[] }>("risk-radar-admin/test-email", {}, h),
    sendLink: (code: string) => post<Referrer>("risk-radar-admin/referrer-send", { code, site: window.location.origin }, h),
  };
};
