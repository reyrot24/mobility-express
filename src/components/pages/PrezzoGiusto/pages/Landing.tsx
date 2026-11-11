import { useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { QuoteForm } from "../components/QuoteForm";
import { RefPerson } from "../components/Referente";
import { ReferenteDialog } from "../components/Dialogs";
import { Eyebrow, TextButton } from "../components/Surface";
import { Steps } from "../components/Steps";
import { EstimateNotice } from "../components/Estimate";
import { TrustStrip } from "../components/TrustStrip";
import { LinkNonValido, PaginaInCaricamento } from "./Messaggi";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { CONFIGURATION_ID, PG_BASE, type QuoteRequest } from "../utils/model";
import { HERO_STANDARD, surfaceStyle, withReferente } from "../utils/pagina";

const Landing = () => {
  const { activeRef, activePage, pages, openLink, findRef, submitQuote } = usePrezzoGiusto();
  // Dal link di devops: /prezzo-giusto/<codice>/<id configurazione>.
  // Il codice serve per le richieste, l'id per la pagina personalizzata
  const { codice: refId, idConfigurazione } = useParams();
  // Un id non valido è come una configurazione che non esiste: pagina standard
  const configId =
    idConfigurazione && CONFIGURATION_ID.test(idConfigurazione) ? idConfigurazione : null;
  const navigate = useNavigate();
  const linkedRef = useMemo(() => (refId ? findRef(refId) : undefined), [refId, findRef]);

  useEffect(() => {
    if (linkedRef) openLink(linkedRef, configId);
  }, [linkedRef, configId, openLink]);

  if (refId && !linkedRef) return <LinkNonValido />;
  // Dal link si aspetta la configurazione; senza codice resta quella del link già aperto
  if (configId && !pages.has(configId)) return <PaginaInCaricamento />;
  const page = linkedRef ? (configId ? pages.get(configId) : null) : activePage;
  const referral = linkedRef ? withReferente(linkedRef, page) : activeRef;
  const hero = page?.hero;
  const benefits = hero?.vantaggi ?? HERO_STANDARD.vantaggi;
  const descrizione = hero?.descrizione ?? HERO_STANDARD.descrizione;
  // Le pagine salvate prima dei colori non hanno "colori"
  const colors = page?.colori;
  const sectionsStyle = surfaceStyle(colors?.sezioni);

  async function handleSubmit(data: QuoteRequest, idempotencyKey: string) {
    await submitQuote(data, idempotencyKey);
    navigate(`${PG_BASE}/inviata`);
  }

  return (
    <>
      <section className="bg-background2 px-[5%]" style={surfaceStyle(colors?.principale)}>
        {/* Su smartphone: titolo, poi subito il modulo, poi vantaggi e referente.
            Da tablet in su: testo a sinistra, modulo a destra. */}
        <div className="grid items-start gap-x-14 gap-y-4 py-4 md:grid-cols-[1fr_1fr] md:gap-y-6 md:py-8">
          <div className="md:col-start-1 md:row-start-1 md:self-end">
            <Eyebrow>{hero?.etichetta ?? HERO_STANDARD.etichetta}</Eyebrow>
            <h1 className="whitespace-pre-line break-words text-2xl font-extrabold leading-[1.15] tracking-tight md:text-[clamp(26px,2.6vw,36px)]">
              {hero?.titolo ?? HERO_STANDARD.titolo}
              <br />
              <span className="text-[var(--pg-accento-testo,#e45a00)] dark:text-orange">
                {hero?.titoloEvidenziato ?? HERO_STANDARD.titoloEvidenziato}
              </span>
            </h1>
            {/* Su smartphone la descrizione va sotto il modulo, che così resta nella prima schermata */}
            <p className="mt-4 hidden whitespace-pre-line break-words text-sm leading-relaxed opacity-90 md:block">
              {descrizione}
            </p>
          </div>
          <div className="md:col-start-2 md:row-span-2 md:row-start-1 md:self-center">
            <QuoteForm
              onSubmit={handleSubmit}
              referentName={referral.name}
              conReferente={Boolean(refId)}
              style={surfaceStyle(colors?.form)}
            />
          </div>
          <div className="md:col-start-1 md:row-start-2 md:self-start">
            <p className="mb-5 whitespace-pre-line break-words text-sm leading-relaxed opacity-90 md:hidden">
              {descrizione}
            </p>
            {benefits.length > 0 && (
              <div className="flex flex-wrap gap-5 text-[11px] md:text-xs">
                {benefits.map((benefit) => (
                  <span key={benefit}>
                    <span className="mr-1.5 font-bold text-[var(--pg-accento-testo,#ce5000)]">✓</span>
                    {benefit}
                  </span>
                ))}
              </div>
            )}
            <EstimateNotice className="mt-5" />
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-[#e8d5c4] pt-6 dark:border-white/10">
              <RefPerson referral={referral} large />
              <ReferenteDialog
                referral={referral}
                trigger={<TextButton className="text-sm">Conosciamoci</TextButton>}
              />
            </div>
          </div>
        </div>
      </section>
      {(page?.sezioni.fiducia ?? true) && <TrustStrip style={sectionsStyle} />}
      {(page?.sezioni.passi ?? true) && <Steps style={sectionsStyle} />}
    </>
  );
};

export default Landing;
