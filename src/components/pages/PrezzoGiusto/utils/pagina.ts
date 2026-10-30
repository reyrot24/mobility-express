import type { Referente } from "./model";

// Pagina personalizzata del referente: /prezzo-giusto/<codice>/<id configurazione>.
// La configura il referente su devops; la valida e la normalizza il server
// (supabase/functions/api/lib/pagina.js). null = testo standard del sito.
export type PaginaReferente = {
  versione: 1;
  logo: string | null;
  // Righe accanto al logo. Con un titolo personalizzato il sottotitolo standard non compare
  navbar: {
    titolo: string | null;
    sottotitolo: string | null;
  };
  hero: {
    etichetta: string | null;
    titolo: string | null;
    titoloEvidenziato: string | null;
    descrizione: string | null;
    // [] = nessun vantaggio
    vantaggi: string[] | null;
  };
  referente: {
    nome: string | null;
    ruolo: string | null;
    telefono: string | null;
    // null o assente (pagine salvate prima di questo campo) = nessuna icona di WhatsApp
    whatsapp?: string | null;
    email: string | null;
    foto: string | null;
    presentazione: string | null;
  };
  sezioni: { fiducia: boolean; passi: boolean };
  // Colori #rrggbb. null = colori standard del sito. Assente nelle pagine salvate prima dei colori
  colori?: {
    navbar: string | null;
    principale: string | null;
    form: string | null;
    sezioni: string | null;
    accento: string | null;
  };
};

// Testi della pagina standard, usati per i campi che il referente non ha personalizzato
export const NAVBAR_STANDARD = { titolo: "il prezzo giusto", sottotitolo: "per te." };

/** Titolo e sottotitolo accanto al logo. Le pagine salvate prima di "navbar" non ce l'hanno. */
export const navbarTitles = (pagina: PaginaReferente | null | undefined) =>
  pagina?.navbar?.titolo
    ? { titolo: pagina.navbar.titolo, sottotitolo: pagina.navbar.sottotitolo }
    : NAVBAR_STANDARD;

export const HERO_STANDARD = {
  etichetta: "RC auto · stima orientativa",
  titolo: "Un primo\nriferimento per",
  titoloEvidenziato: "la tua RC auto.",
  descrizione:
    "Ricevi via email una fascia orientativa di costo. Se lo desideri, chiedi al tuo referente un preventivo effettivo.",
  vantaggi: ["Senza impegno", "Ricontatto solo su richiesta"],
};

/** Referente del link con i dati inseriti nella pagina personalizzata. */
export function withReferente(ref: Referente, pagina: PaginaReferente | null | undefined): Referente {
  const r = pagina?.referente;
  if (!r) return ref;
  return {
    ...ref,
    name: r.nome ?? ref.name,
    role: r.ruolo ?? ref.role,
    phone: r.telefono ?? ref.phone,
    whatsapp: r.whatsapp ?? undefined,
    email: r.email ?? ref.email,
    photo: r.foto ?? undefined,
    intro: r.presentazione ?? undefined,
  };
}

/** Link alla chat di WhatsApp. wa.me vuole il prefisso internazionale: senza prefisso il numero è italiano. */
export function whatsappLink(numero: string) {
  const cifre = numero.replace(/\D/g, "");
  const internazionale = numero.trim().startsWith("+")
    ? cifre
    : cifre.startsWith("00")
      ? cifre.slice(2)
      : cifre.startsWith("39") && cifre.length > 10
        ? cifre
        : `39${cifre}`;
  return `https://wa.me/${internazionale}?text=Ciao%2C%20vorrei%20informazioni%20su%20Polizze%20Express`;
}

/** Testo leggibile sullo sfondo scelto dal referente: blu scuro su colori chiari, bianco su colori scuri. */
export function contrastText(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#040c54" : "#ffffff";
}

/** Sfondo personalizzato con il testo in contrasto. undefined = colori standard (anche in modalità scura). */
export const surfaceStyle = (hex: string | null | undefined): React.CSSProperties | undefined =>
  hex ? { backgroundColor: hex, color: contrastText(hex) } : undefined;
