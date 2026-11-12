import { supabase } from "@/lib/supabase";
import { intervalloStima, type Consents, type Estimate, type RequestStatus } from "./estimate";
import { DEFAULT_REF, type Referente } from "./model";
import { anteprimaAttiva } from "./anteprima";
import * as finti from "../anteprima/dati";

// Anteprima locale (solo `npm run dev`): dati finti al posto del database. Sempre false in produzione.
const inAnteprima = () => import.meta.env.DEV && anteprimaAttiva();

// Letture dirette dal database: le RLS restituiscono solo i dati del cliente in sessione.

export type Profilo = {
  nome: string;
  cognome: string;
  cellulare: string;
  referral_id: string | null;
  // Arrivano da devops con il risultato: il cliente li legge ma non li modifica
  comune: string | null;
  cap: string | null;
};

export type ProfiloModificabile = Pick<Profilo, "nome" | "cognome" | "cellulare">;

export type Risultato = {
  prezzo: number;
};

export type Richiesta = {
  id: string;
  targa: string;
  tipo_strada: string;
  strada: string;
  civico: string;
  // Vuoti (o null) finché devops non li restituisce con il risultato
  comune: string | null;
  cap: string | null;
  referral_id: string | null;
  // Pagina personalizzata da cui è partita la richiesta (o quella del profilo, dall'area personale)
  id_configurazione: string | null;
  stato: RequestStatus;
  consensi: Consents;
  created_at: string;
  risultati: Risultato | null;
};

const COLONNE =
  "id, targa, tipo_strada, strada, civico, comune, cap, referral_id, id_configurazione, stato, consensi, created_at, risultati(prezzo)";

const LOAD_ERROR = "Non riusciamo a caricare i tuoi dati. Ricarica la pagina tra qualche istante.";

// Relazione uno a uno: a seconda della versione può arrivare come oggetto o come array
const normalize = (row: Record<string, unknown>): Richiesta => {
  const r = row.risultati;
  return { ...row, risultati: Array.isArray(r) ? (r[0] ?? null) : (r ?? null) } as Richiesta;
};

export async function fetchRichieste(): Promise<Richiesta[]> {
  if (inAnteprima()) return finti.fetchRichieste();
  const { data, error } = await supabase
    .from("richieste")
    .select(COLONNE)
    .order("created_at", { ascending: false });
  if (error) throw new Error(LOAD_ERROR);
  return data.map(normalize);
}

export async function fetchRichiesta(id: string): Promise<Richiesta | null> {
  if (inAnteprima()) return finti.fetchRichiesta(id);
  const { data, error } = await supabase
    .from("richieste")
    .select(COLONNE)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  return data ? normalize(data) : null;
}

export async function fetchProfilo(userId: string): Promise<Profilo> {
  if (inAnteprima()) return finti.fetchProfilo();
  const { data, error } = await supabase
    .from("profili")
    .select("nome, cognome, cellulare, referral_id, comune, cap")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  return data ?? { nome: "", cognome: "", cellulare: "", referral_id: null, comune: null, cap: null };
}

/**
 * Codice referente e pagina personalizzata salvati sul profilo alla conferma: l'area personale
 * usa logo e colori del link da cui è arrivato il cliente. null se non disponibili.
 */
export async function fetchConfigurazioneProfilo(userId: string) {
  if (inAnteprima()) return finti.fetchConfigurazioneProfilo();
  const { data, error } = await supabase
    .from("profili")
    .select("referral_id, id_configurazione")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as { referral_id: string | null; id_configurazione: string | null };
}

export async function updateProfilo(userId: string, profilo: ProfiloModificabile) {
  if (inAnteprima()) return finti.updateProfilo(profilo);
  const { error } = await supabase.from("profili").update(profilo).eq("id", userId);
  if (error) throw new Error("Non è stato possibile salvare i dati. Riprova.");
}

/** Il risultato nel formato usato dai componenti della stima. */
export function estimateOf(r: Richiesta): Estimate | null {
  const res = r.risultati;
  if (!res) return null;
  return {
    ...intervalloStima(res.prezzo),
    currency: "EUR",
    period: "year",
    basis: "",
    demo: false,
  };
}

/** Senza comune e CAP (arrivano da devops con il risultato) mostra solo la via. */
export const indirizzoOf = (r: Richiesta) => {
  const via = `${r.tipo_strada} ${r.strada} ${r.civico}`;
  const luogo = [r.cap, r.comune].filter(Boolean).join(" ");
  return luogo ? `${via}, ${luogo}` : via;
};

// TODO: risolvere il referente con l'API referral. Per ora il browser conosce solo quello demo.
const REFERENTI: Record<string, Referente> = { [DEFAULT_REF.id]: DEFAULT_REF };
export const referenteOf = (r: Richiesta): Referente =>
  (r.referral_id && REFERENTI[r.referral_id]) || DEFAULT_REF;
