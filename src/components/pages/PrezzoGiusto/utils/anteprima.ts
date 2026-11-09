// Anteprima locale: SOLO con `npm run dev` (import.meta.env.DEV). Nella build di produzione
// import.meta.env.DEV è false, quindi le rotte /prezzo-giusto/anteprima e i dati finti spariscono.
//
// - Modalità anteprima attiva: tutte le chiamate all'API e al database usano dati finti in memoria
//   (anteprima/dati.ts). Nessuna richiesta parte verso devops o verso Supabase.
// - Accesso finto: area personale con EMAIL_ANTEPRIMA, qualsiasi password.

export const ANTEPRIMA_DISPONIBILE = import.meta.env.DEV;

export const EMAIL_ANTEPRIMA = "anteprima@locale.test";
export const USER_ID_ANTEPRIMA = "00000000-0000-4000-8000-000000000000";
/** Id della pagina personalizzata finta: /prezzo-giusto/ANTEPRIMA/ANTEPRIMA */
export const CONFIGURAZIONE_ANTEPRIMA = "ANTEPRIMA";

const CHIAVE_ATTIVA = "pg-anteprima";
const CHIAVE_SESSIONE = "pg-anteprima-sessione";

function leggi(chiave: string) {
  try {
    return localStorage.getItem(chiave) === "1";
  } catch {
    return false;
  }
}

function scrivi(chiave: string, valore: boolean) {
  try {
    if (valore) localStorage.setItem(chiave, "1");
    else localStorage.removeItem(chiave);
  } catch {
    // storage non disponibile: resta lo stato in memoria della pagina
  }
}

/** Dati finti al posto di API e database. Sempre false in produzione. */
export const anteprimaAttiva = () => ANTEPRIMA_DISPONIBILE && leggi(CHIAVE_ATTIVA);

export function impostaAnteprima(attiva: boolean) {
  scrivi(CHIAVE_ATTIVA, attiva);
  if (!attiva) scrivi(CHIAVE_SESSIONE, false);
}

/** Accesso finto all'area personale. Sempre false in produzione. */
export const sessioneAnteprima = () => anteprimaAttiva() && leggi(CHIAVE_SESSIONE);

export const impostaSessioneAnteprima = (attiva: boolean) => scrivi(CHIAVE_SESSIONE, attiva);
