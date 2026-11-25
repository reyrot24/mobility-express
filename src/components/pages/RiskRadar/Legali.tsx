// Footer legale e privacy del Risk Radar: stessi testi e componenti di /prezzo-giusto (PgFooter),
// senza i documenti propri del servizio RC Auto ("OK, il prezzo è giusto?"), che qui non valgono.
// Il footer sta fuori da .rr, quindi usa le classi Tailwind del sito come PgFooter.
import Privacy from "../Legali/Privacy";
import TerminiDiServizio from "../Legali/TerminiDiServizio";
import CookiePolicy from "../Legali/CookiePolicy";
import { InfoDialog } from "../PrezzoGiusto/components/Dialogs";
import { PRIVACY_EMAIL } from "../PrezzoGiusto/utils/estimate";

// Sezione specifica del Risk Radar, mostrata prima della Privacy Policy generale del sito.
// Da far validare al DPO come la sezione di "OK, il prezzo è giusto?".
const RiskRadarPrivacy = () => (
  <section className="mb-6 rounded-lg bg-background2 p-5 text-xs [&_p]:mb-2">
    <h2 className="mb-3 text-base font-bold">Risk Radar Aziende</h2>
    <p>
      Per preparare l'analisi Alca Broker S.r.l. usa la partita IVA, i dati dell'azienda
      ricavati da banche dati pubbliche (VIES) e da fonti online, le risposte che fornisci,
      l'email e, se lo indichi, il telefono.
    </p>
    <p>
      Se lo chiedi, ti inviamo via email il riepilogo dell'analisi: prima ti scriviamo per
      confermare l'indirizzo (il link vale 24 ore) e solo dopo la conferma inviamo il riepilogo.
      Le email partono a nome di Alca Broker S.r.l.; le risposte arrivano al consulente che ti
      ha proposto il servizio o al nostro ufficio. Non usiamo l'indirizzo per altre comunicazioni.
    </p>
    <p>
      Il ricontatto da parte di un consulente è una scelta facoltativa: puoi ricevere
      l'analisi senza chiederlo. Per esercitare i tuoi diritti scrivi a{" "}
      <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>{PRIVACY_EMAIL}</a>.
    </p>
  </section>
);

export const RrPrivacyContent = () => (
  <>
    <RiskRadarPrivacy />
    <Privacy />
  </>
);

export const RrPrivacyDialog = ({ trigger }: { trigger: React.ReactNode }) => (
  <InfoDialog trigger={trigger} className="h-[500px] max-w-3xl no-scrollbar">
    <RrPrivacyContent />
  </InfoDialog>
);

const footerLinks = [
  { page: <RrPrivacyContent />, title: "Privacy Policy" },
  { page: <TerminiDiServizio />, title: "Termini di Servizio" },
  { page: <CookiePolicy />, title: "Cookie Policy" },
];

const linkClassName = "underline underline-offset-4 hover:text-[#ffb47e] cursor-pointer";

export const RrFooter = () => (
  <footer className="border-t-[3px] border-orange bg-blueText px-[5%] pb-6 pt-9 text-white print:hidden">
    <div className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-center">
      <span className="text-xl font-bold tracking-tight">
        Risk Radar <span className="text-[#ff9d56]">Aziende</span>
      </span>
      <span className="text-xs text-[#c9cdeb]">Il prezzo giusto per te.</span>
    </div>
    <p className="max-w-5xl break-words text-xs leading-7 text-[#e0e3f5]">
      Il servizio di intermediazione assicurativa è offerto da Alca Broker srl, broker
      assicurativo regolamentato dall'IVASS ed iscritto al RUI con numero{" "}
      <strong>B000514026</strong>, P.IVA <strong>07965051217</strong>, Indirizzo: VIA VITTORIA
      COLONNA 14 - 80121 NAPOLI (NA) - PEC:{" "}
      <a className={linkClassName} href="mailto:alcabrokersrl@legalmail.it">
        alcabrokersrl@legalmail.it
      </a>
      .
    </p>
    <div className="mt-6 flex flex-col justify-between gap-6 border-t border-white/15 pt-5 md:flex-row md:items-center">
      <nav aria-label="Informazioni legali" className="flex flex-wrap gap-x-6 gap-y-3 text-xs">
        {footerLinks.map((link) => (
          <InfoDialog
            key={link.title}
            className="h-[500px] max-w-3xl no-scrollbar"
            trigger={<button type="button" className={linkClassName}>{link.title}</button>}
          >
            {link.page}
          </InfoDialog>
        ))}
      </nav>
      <p className="text-[11px] text-[#c9cdeb]">© 2024 Alca Broker Srl. Tutti i diritti riservati.</p>
    </div>
  </footer>
);
