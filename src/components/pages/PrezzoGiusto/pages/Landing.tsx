import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { QuoteForm } from "../components/QuoteForm";
import { RefPerson } from "../components/Referente";
import { ReferenteDialog } from "../components/Dialogs";
import { Eyebrow, TextButton } from "../components/Surface";
import { Steps } from "../components/Steps";
import { EstimateNotice } from "../components/Estimate";
import { TrustStrip } from "../components/TrustStrip";
import { LinkNonValido } from "./Messaggi";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { PG_BASE, type QuoteRequest } from "../utils/model";

const Landing = () => {
  const { activeRef, findRef, setActiveRef, submitQuote } = usePrezzoGiusto();
  // Codice referente dal link di devops: /prezzo-giusto/<codice> oppure /prezzo-giusto?referral_id=<codice>
  const { codice } = useParams();
  const [searchParams] = useSearchParams();
  const refId = codice ?? (searchParams.get("referral_id")?.trim() || undefined);
  const navigate = useNavigate();
  // findRef crea un nuovo oggetto a ogni chiamata: senza useMemo l'effetto sotto si ripeterebbe a ogni render
  const linkedRef = useMemo(() => (refId ? findRef(refId) : undefined), [refId, findRef]);

  useEffect(() => {
    if (linkedRef) setActiveRef(linkedRef);
  }, [linkedRef, setActiveRef]);

  if (refId && !linkedRef) return <LinkNonValido />;
  const referral = linkedRef ?? activeRef;

  async function handleSubmit(data: QuoteRequest, idempotencyKey: string) {
    await submitQuote(data, idempotencyKey);
    navigate(`${PG_BASE}/inviata`);
  }

  return (
    <>
      <section className="bg-background2 px-[5%]">
        <div className="grid items-start gap-8 py-8 md:grid-cols-[1fr_1.13fr] md:items-center md:gap-16 md:py-12">
          <div>
            <Eyebrow>RC auto · stima orientativa</Eyebrow>
            <h1 className="text-[34px] font-extrabold leading-[1.12] tracking-tighter md:text-[clamp(32px,3.6vw,48px)]">
              Un primo
              <br />
              riferimento per
              <br />
              <span className="text-[#e45a00] dark:text-orange">
                la tua RC auto.
              </span>
            </h1>
            <p className="mt-6 text-sm leading-relaxed opacity-90 md:text-base">
              Ricevi via email una fascia orientativa di costo. Se lo desideri,
              chiedi al tuo referente un preventivo effettivo.
            </p>
            <div className="mt-6 flex flex-wrap gap-5 text-[11px] md:text-xs">
              {["Senza impegno", "Ricontatto solo su richiesta"].map((benefit) => (
                <span key={benefit}>
                  <span className="mr-1.5 font-bold text-[#ce5000]">✓</span>
                  {benefit}
                </span>
              ))}
            </div>
            <EstimateNotice className="mt-6" />
            <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#e8d5c4] pt-6 dark:border-white/10">
              <RefPerson referral={referral} />
              <ReferenteDialog
                referral={referral}
                trigger={<TextButton>Conosciamoci</TextButton>}
              />
            </div>
          </div>
          <QuoteForm onSubmit={handleSubmit} referentName={referral.name} />
        </div>
      </section>
      <TrustStrip />
      <Steps />
    </>
  );
};

export default Landing;
