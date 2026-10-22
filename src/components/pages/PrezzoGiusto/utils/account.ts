import { supabase } from "@/lib/supabase";
import type { Consents, Estimate, RequestStatus } from "./estimate";
import { DEFAULT_REF, type Referente } from "./model";

// Letture dirette dal database: le RLS restituiscono solo i dati del cliente in sessione.

export type Profilo = {
  nome: string;
  cognome: string;
  cellulare: string;
  referral_id: string | null;
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
  comune: string;
  cap: string;
  referral_id: string | null;
  stato: RequestStatus;
  consensi: Consents;
  created_at: string;
  risultati: Risultato | null;
};

const COLONNE =
  "id, targa, tipo_strada, strada, civico, comune, cap, referral_id, stato, consensi, created_at, risultati(prezzo)";

const LOAD_ERROR = "Non riusciamo a caricare i tuoi dati. Ricarica la pagina tra qualche istante.";

// Relazione uno a uno: a seconda della versione può arrivare come oggetto o come array
const normalize = (row: Record<string, unknown>): Richiesta => {
  const r = row.risultati;
  return { ...row, risultati: Array.isArray(r) ? (r[0] ?? null) : (r ?? null) } as Richiesta;
};

export async function fetchRichieste(): Promise<Richiesta[]> {
  const { data, error } = await supabase
    .from("richieste")
    .select(COLONNE)
    .order("created_at", { ascending: false });
  if (error) throw new Error(LOAD_ERROR);
  return data.map(normalize);
}

export async function fetchRichiesta(id: string): Promise<Richiesta | null> {
  const { data, error } = await supabase
    .from("richieste")
    .select(COLONNE)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  return data ? normalize(data) : null;
}

export async function fetchProfilo(userId: string): Promise<Profilo> {
  const { data, error } = await supabase
    .from("profili")
    .select("nome, cognome, cellulare, referral_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(LOAD_ERROR);
  return data ?? { nome: "", cognome: "", cellulare: "", referral_id: null };
}

export async function updateProfilo(userId: string, profilo: ProfiloModificabile) {
  const { error } = await supabase.from("profili").update(profilo).eq("id", userId);
  if (error) throw new Error("Non è stato possibile salvare i dati. Riprova.");
}

/** Il risultato nel formato usato dai componenti della stima. */
export function estimateOf(r: Richiesta): Estimate | null {
  const res = r.risultati;
  if (!res) return null;
  // Prezzo puntuale: min e max coincidono
  return {
    min: res.prezzo,
    max: res.prezzo,
    currency: "EUR",
    period: "year",
    basis: "",
    demo: false,
  };
}

export const indirizzoOf = (r: Richiesta) =>
  `${r.tipo_strada} ${r.strada} ${r.civico}, ${r.cap} ${r.comune}`;

// TODO: risolvere il referente con l'API referral. Per ora il browser conosce solo quello demo.
const REFERENTI: Record<string, Referente> = { [DEFAULT_REF.id]: DEFAULT_REF };
export const referenteOf = (r: Richiesta): Referente =>
  (r.referral_id && REFERENTI[r.referral_id]) || DEFAULT_REF;
