// Lettura del risultato inviato da devops alla nostra API (webhook).
// Formato: { richiestaId, compagnia, prezzoTotale, idRicerca, providerCode } con prezzo annuale
// in euro, oppure { richiestaId, prezzoTotale: null } se devops non ha un prezzo per la richiesta.

/**
 * Intervallo mostrato al cliente: da 10 € sotto a 30 € sopra il prezzo, in multipli di 10.
 * Stesso calcolo di src/components/pages/PrezzoGiusto/utils/estimate.ts.
 */
export const intervalloStima = (prezzo) => ({
  min: Math.max(10, Math.floor((prezzo - 10) / 10) * 10),
  max: Math.ceil((prezzo + 30) / 10) * 10,
});

export const DEMO_ESTIMATE = {
  prezzo: 350,
  ...intervalloStima(350),
  currency: "EUR",
  period: "year",
  basis: "prezzo_compagnia",
  company: "Compagnia dimostrativa",
  demo: true,
};

/**
 * Valida il prezzo ricevuto: "prezzo" è quello esatto da salvare, min e max l'intervallo per il cliente.
 * @returns {object|null} la stima normalizzata, null se devops non ha un risultato
 * @throws {Error} se il formato non è valido
 */
export function parseStima(result) {
  if (result?.prezzoTotale === null) return null;

  const { prezzoTotale: prezzo, compagnia } = result ?? {};
  if (typeof prezzo !== "number" || !Number.isFinite(prezzo) || prezzo <= 0)
    throw new Error("INVALID_ESTIMATE");
  if (typeof compagnia !== "string" || !compagnia.trim())
    throw new Error("MISSING_ESTIMATE_COMPANY");

  return {
    prezzo,
    ...intervalloStima(prezzo),
    currency: "EUR",
    period: "year",
    basis: "prezzo_compagnia",
    company: compagnia.trim(),
    demo: false,
  };
}
