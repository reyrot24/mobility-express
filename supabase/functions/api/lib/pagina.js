// Configurazione della pagina personalizzata del referente (/prezzo-giusto/<referral_id>/<id_configurazione>).
// Stessa forma del tipo PaginaReferente in src/components/pages/PrezzoGiusto/utils/pagina.ts.
// Ogni campo è facoltativo: null = testo standard del sito. Le chiavi sconosciute vengono ignorate.

export const VERSIONE_PAGINA = 1;

// Errore di validazione: il messaggio indica il campo e torna a devops così com'è.
class ErrorePagina extends Error {}

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);

function oggetto(value, campo) {
  if (value === undefined || value === null) return {};
  if (!isObject(value)) throw new ErrorePagina(`${campo}: deve essere un oggetto.`);
  return value;
}

/** Testo semplice: spazi ai bordi rimossi, vuoto = null. Gli a capo sono ammessi solo se multiriga. */
function testo(value, campo, max, { multiriga = false } = {}) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw new ErrorePagina(`${campo}: deve essere un testo.`);
  const text = value.replace(/\r\n?/g, "\n").trim();
  if (!text) return null;
  if (text.length > max) throw new ErrorePagina(`${campo}: massimo ${max} caratteri.`);
  if (!multiriga && text.includes("\n")) throw new ErrorePagina(`${campo}: non può andare a capo.`);
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(text)) throw new ErrorePagina(`${campo}: caratteri non validi.`);
  return text;
}

function booleano(value, campo) {
  if (value === undefined || value === null) return true;
  if (typeof value !== "boolean") throw new ErrorePagina(`${campo}: deve essere true o false.`);
  return value;
}

function lista(value, campo, max) {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value)) throw new ErrorePagina(`${campo}: deve essere una lista.`);
  if (value.length > max) throw new ErrorePagina(`${campo}: massimo ${max} elementi.`);
  return value;
}

function email(value, campo) {
  const text = testo(value, campo, 254);
  if (text && !/^\S+@[^\s@]+\.[^\s@]+$/.test(text)) throw new ErrorePagina(`${campo}: email non valida.`);
  return text?.toLowerCase() ?? null;
}

function telefono(value, campo) {
  const text = testo(value, campo, 30);
  if (text && !/^\+?[\d\s.()/-]{6,30}$/.test(text)) throw new ErrorePagina(`${campo}: numero non valido.`);
  return text;
}

/** Numero per il link di WhatsApp: oltre al formato servono abbastanza cifre per aprire la chat. */
function whatsapp(value, campo) {
  const text = telefono(value, campo);
  if (text && text.replace(/\D/g, "").length < 8) throw new ErrorePagina(`${campo}: numero non valido.`);
  return text;
}

/** Colore esadecimale #rrggbb, salvato in minuscolo. */
function colore(value, campo) {
  const text = testo(value, campo, 7);
  if (!text) return null;
  if (!/^#[0-9a-f]{6}$/i.test(text)) throw new ErrorePagina(`${campo}: usa un colore nel formato #rrggbb.`);
  return text.toLowerCase();
}

/** Luminanza relativa di un colore #rrggbb (0 = nero, 1 = bianco). */
function luminanza(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Testi di una delle email al cliente (conferma della richiesta o stima). */
function testiEmail(value, campo) {
  const o = oggetto(value, campo);
  return {
    oggetto: testo(o.oggetto, `${campo}.oggetto`, 80),
    titolo: testo(o.titolo, `${campo}.titolo`, 80, { multiriga: true }),
    messaggio: testo(o.messaggio, `${campo}.messaggio`, 600, { multiriga: true }),
  };
}

/** Personalizzazione delle email al cliente (templates/layout.js). */
function personalizzazioneEmail(value) {
  const e = oggetto(value, "email");
  const colori = oggetto(e.colori, "email.colori");
  const card = colore(colori.card, "email.colori.card");
  // Nelle email il testo resta scuro: la card deve essere chiara
  if (card && luminanza(card) <= 0.4)
    throw new ErrorePagina("email.colori.card: scegli un colore chiaro, il testo delle email è scuro.");
  return {
    colori: {
      accento: colore(colori.accento, "email.colori.accento"),
      sfondo: colore(colori.sfondo, "email.colori.sfondo"),
      card,
    },
    intestazione: testo(e.intestazione, "email.intestazione", 60),
    conferma: testiEmail(e.conferma, "email.conferma"),
    stima: testiEmail(e.stima, "email.stima"),
    firma: testo(e.firma, "email.firma", 300, { multiriga: true }),
  };
}

/**
 * Valida e normalizza la configurazione inviata da devops.
 * @returns {{ data: object } | { error: string }}
 */
export function validatePagina(body) {
  try {
    const root = oggetto(body, "configurazione");
    if (root.versione !== undefined && root.versione !== VERSIONE_PAGINA)
      throw new ErrorePagina(`versione: è supportata solo la ${VERSIONE_PAGINA}.`);

    const navbar = oggetto(root.navbar, "navbar");
    const hero = oggetto(root.hero, "hero");
    const referente = oggetto(root.referente, "referente");
    const sezioni = oggetto(root.sezioni, "sezioni");
    const colori = oggetto(root.colori, "colori");

    return {
      data: {
        versione: VERSIONE_PAGINA,
        // Logo e foto restano nel database di devops: per ora la pagina mostra la ✓ al posto del logo
        // e le iniziali al posto della foto. I valori ricevuti vengono ignorati.
        logo: null,
        // Le due righe accanto al logo. Con un titolo personalizzato il sottotitolo standard non compare
        navbar: {
          titolo: testo(navbar.titolo, "navbar.titolo", 60),
          sottotitolo: testo(navbar.sottotitolo, "navbar.sottotitolo", 60),
        },
        hero: {
          etichetta: testo(hero.etichetta, "hero.etichetta", 60),
          titolo: testo(hero.titolo, "hero.titolo", 80, { multiriga: true }),
          titoloEvidenziato: testo(hero.titoloEvidenziato, "hero.titoloEvidenziato", 60),
          descrizione: testo(hero.descrizione, "hero.descrizione", 400, { multiriga: true }),
          // null = vantaggi standard, [] = nessun vantaggio
          vantaggi:
            lista(hero.vantaggi, "hero.vantaggi", 4)?.map((v, i) => {
              const text = testo(v, `hero.vantaggi[${i}]`, 40);
              if (!text) throw new ErrorePagina(`hero.vantaggi[${i}]: non può essere vuoto.`);
              return text;
            }) ?? null,
        },
        referente: {
          nome: testo(referente.nome, "referente.nome", 80),
          ruolo: testo(referente.ruolo, "referente.ruolo", 60),
          telefono: telefono(referente.telefono, "referente.telefono"),
          // null = nessuna icona di WhatsApp sul sito
          whatsapp: whatsapp(referente.whatsapp, "referente.whatsapp"),
          email: email(referente.email, "referente.email"),
          foto: null,
          presentazione: testo(referente.presentazione, "referente.presentazione", 300, { multiriga: true }),
        },
        sezioni: {
          fiducia: booleano(sezioni.fiducia, "sezioni.fiducia"),
          passi: booleano(sezioni.passi, "sezioni.passi"),
        },
        // Sfondi delle parti della pagina e colore principale (pulsanti, bordi, titolo evidenziato)
        colori: {
          navbar: colore(colori.navbar, "colori.navbar"),
          principale: colore(colori.principale, "colori.principale"),
          form: colore(colori.form, "colori.form"),
          sezioni: colore(colori.sezioni, "colori.sezioni"),
          accento: colore(colori.accento, "colori.accento"),
        },
        email: personalizzazioneEmail(root.email),
      },
    };
  } catch (err) {
    if (err instanceof ErrorePagina) return { error: err.message };
    throw err;
  }
}
