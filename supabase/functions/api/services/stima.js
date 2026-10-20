// Lettura del risultato inviato da devops alla nostra API (webhook).
// TODO: il formato definitivo non è ancora noto. Per ora si usa il formato previsto in
// origine per la stima: { richiesta_id, stima: { min, max, valuta, periodicita, base,
// metodologia_id, fonte_tariffe, aggiornamento_tariffe } } oppure { richiesta_id, stima: null }.

export const DEMO_ESTIMATE = {
  min: 320,
  max: 390,
  currency: "EUR",
  period: "year",
  basis: "demo_reference_range",
  demo: true,
};

/**
 * Valida la stima ricevuta. Un prezzo puntuale o il minimo di preventivi reali
 * NON viene trasformato in un range.
 * @returns {object|null} la stima normalizzata, null se devops non ha un risultato
 * @throws {Error} se il formato non è valido
 */
export function parseStima(result) {
  if (result?.stima === null) return null;

  const s = result?.stima;
  if (
    !s ||
    typeof s.min !== "number" ||
    typeof s.max !== "number" ||
    !Number.isFinite(s.min) ||
    !Number.isFinite(s.max) ||
    s.min <= 0 ||
    s.max <= s.min
  )
    throw new Error("INVALID_ESTIMATE");
  if (
    s.valuta !== "EUR" ||
    s.periodicita !== "annuale" ||
    s.base !== "parametri_generali_tariffe_riferimento"
  )
    throw new Error("INVALID_ESTIMATE_BASIS");
  if (
    !["metodologia_id", "fonte_tariffe", "aggiornamento_tariffe"].every(
      (key) => typeof s[key] === "string" && s[key].trim().length > 0
    )
  )
    throw new Error("MISSING_ESTIMATE_PROVENANCE");

  return {
    min: s.min,
    max: s.max,
    currency: s.valuta,
    period: "year",
    basis: s.base,
    methodologyId: s.metodologia_id,
    referenceSource: s.fonte_tariffe,
    referenceDate: s.aggiornamento_tariffe,
    demo: false,
  };
}
