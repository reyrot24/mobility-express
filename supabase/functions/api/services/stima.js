// Lettura del risultato inviato da devops alla nostra API (webhook).
// Formato: { richiestaId, compagnia, prezzoTotale, idRicerca, providerCode } con prezzo annuale
// in euro, oppure { richiestaId, prezzoTotale: null } se devops non ha un prezzo per la richiesta.

export const DEMO_ESTIMATE = {
  min: 350,
  max: 350,
  currency: "EUR",
  period: "year",
  basis: "prezzo_compagnia",
  company: "Compagnia dimostrativa",
  demo: true,
};

/**
 * Valida il prezzo ricevuto: min e max coincidono (prezzo puntuale).
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
    min: prezzo,
    max: prezzo,
    currency: "EUR",
    period: "year",
    basis: "prezzo_compagnia",
    company: compagnia.trim(),
    demo: false,
  };
}
