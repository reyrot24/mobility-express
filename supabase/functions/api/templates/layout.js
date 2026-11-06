export const escapeHtml = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]
  );

/** Testo del referente su più righe: escape e a capo come <br/>. */
export const multiline = (value) => escapeHtml(value).replace(/\n/g, "<br/>");

/**
 * Stile delle email: colori, intestazione e firma scelti dal referente (blocco "email" della
 * sua pagina, validato in lib/pagina.js), altrimenti quelli standard.
 * @param {object|null|undefined} email configurazione.email
 */
export const stileEmail = (email) => ({
  accento: email?.colori?.accento ?? "#ff6b01",
  sfondo: email?.colori?.sfondo ?? "#f5f6fa",
  card: email?.colori?.card ?? "#ffffff",
  intestazione: email?.intestazione ?? "il prezzo giusto per te.",
  firma: email?.firma ?? null,
});

const STILE_STANDARD = stileEmail(null);

/** Note legali sotto la card: grigie su sfondi chiari, chiare su sfondi scuri. */
function coloreNote(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "#5e637e" : "#c9cdeb";
}

export const button = (href, label, secondary = false, accento = STILE_STANDARD.accento) =>
  `<a href="${escapeHtml(href)}" style="display:block;text-align:center;${
    secondary
      ? "background:#ffffff;color:#040c54;border:1px solid #cfd3e5"
      : `background:${accento};color:#ffffff;border:1px solid ${accento}`
  };text-decoration:none;font-weight:700;padding:14px;border-radius:6px;margin-top:12px">${escapeHtml(label)}</a>`;

export const hr = `<hr style="border:0;border-top:1px solid #e0e2ed;margin:24px 0"/>`;

/** Firma del referente, prima delle note in fondo all'email. */
export const firma = (stile) =>
  stile.firma ? `<p style="font-size:14px;margin:24px 0 0">${multiline(stile.firma)}</p>` : "";

/** Struttura comune delle email: card con bordo colorato e piè di pagina legale. */
export const layout = (content, stile = STILE_STANDARD) => `<!doctype html>
<html lang="it"><body style="margin:0;background:${stile.sfondo};font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#040c54">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:${stile.card};border-radius:12px;border-top:4px solid ${stile.accento};padding:32px;line-height:1.55">
      <div style="font-size:18px;font-weight:700;margin-bottom:28px">
        <span style="display:inline-block;width:32px;height:32px;line-height:32px;text-align:center;background:${stile.accento};border-radius:6px;margin-right:8px">✓</span>${escapeHtml(stile.intestazione)}
      </div>
      ${content}
    </div>
    <p style="font-size:11px;color:${coloreNote(stile.sfondo)};text-align:center;margin-top:16px">Mobility Express è un marchio di Alca Broker srl · RUI B000514026 · P.IVA 07965051217</p>
  </div>
</body></html>`;

/**
 * Link ai documenti del servizio "OK, il prezzo è giusto?" (versione inclusa).
 * @param {{condizioni: {url: string, versione: string}, privacy: {url: string, versione: string}}} documenti
 */
export const linkDocumenti = (documenti, accento = STILE_STANDARD.accento) =>
  `<ul style="font-size:14px;margin:8px 0 0;padding-left:18px">
        <li><a href="${escapeHtml(documenti.condizioni.url)}" style="color:${accento}">Condizioni del servizio</a> (versione ${escapeHtml(documenti.condizioni.versione)})</li>
        <li><a href="${escapeHtml(documenti.privacy.url)}" style="color:${accento}">Informativa privacy del servizio</a> (versione ${escapeHtml(documenti.privacy.versione)})</li>
      </ul>`;

/** Nota in fondo alle comunicazioni di servizio: come gestire o interrompere il monitoraggio. */
export const notaServizio = (servizioUrl) =>
  `<p style="font-size:12px;color:#5e637e;margin:8px 0 0">Comunicazione di servizio di “OK, il prezzo è giusto?”, non promozionale. Puoi <a href="${escapeHtml(servizioUrl)}" style="color:#5e637e">gestire il servizio o interrompere il monitoraggio</a> dalla tua area personale, oppure scrivendo a info@alcabroker.it.</p>`;

export const notaServizioTesto = (servizioUrl) =>
  `Comunicazione di servizio, non promozionale. Gestisci o interrompi il monitoraggio: ${servizioUrl} (oppure scrivi a info@alcabroker.it).`;
