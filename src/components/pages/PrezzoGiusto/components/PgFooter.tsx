import TerminiDiServizio from "../../Legali/TerminiDiServizio";
import CookiePolicy from "../../Legali/CookiePolicy";
import { InfoDialog, NotaStimaDialog, PrivacyContent } from "./Dialogs";

const footerLinks = [
  { page: <PrivacyContent />, title: "Privacy Policy" },
  { page: <TerminiDiServizio />, title: "Termini di Servizio" },
  { page: <CookiePolicy />, title: "Cookie Policy" },
];

const linkClassName =
  "underline underline-offset-4 hover:text-[#ffb47e] cursor-pointer";

export const PgFooter = () => (
  <footer className="border-t-[3px] border-orange bg-blueText px-[5%] pb-6 pt-9 text-white dark:bg-blueBgDark">
    <div className="mb-6 flex flex-col justify-between gap-2 md:flex-row md:items-center">
      <a href="/" className="text-xl font-bold tracking-tight">
        Mobility <span className="text-[#ff9d56]">Express</span>
      </a>
      <span className="text-xs text-[#c9cdeb]">
        Una prima stima. Una persona di fiducia.
      </span>
    </div>
    <p className="max-w-5xl break-words text-xs leading-7 text-[#e0e3f5]">
      Mobility Express è un marchio di Alca Broker srl. Il servizio di
      intermediazione assicurativa è offerto da Alca Broker srl, broker
      assicurativo regolamentato dall'IVASS ed iscritto al RUI con numero{" "}
      <strong>B000514026</strong>, P.IVA <strong>07965051217</strong>,
      Indirizzo: VIA VITTORIA COLONNA 14 - 80121 NAPOLI (NA) - PEC:{" "}
      <a className={linkClassName} href="mailto:alcabrokersrl@legalmail.it">
        alcabrokersrl@legalmail.it
      </a>{" "}
      - Telefono:{" "}
      <a className={linkClassName} href="tel:+390815297045">
        +39 081 529 70 45
      </a>
      .
    </p>
    <div className="mt-6 flex flex-col justify-between gap-6 border-t border-white/15 pt-5 md:flex-row md:items-center">
      <nav
        aria-label="Informazioni legali"
        className="flex flex-wrap gap-x-6 gap-y-3 text-xs"
      >
        {footerLinks.map((link) => (
          <InfoDialog
            key={link.title}
            className="h-[500px] max-w-3xl no-scrollbar"
            trigger={
              <button type="button" className={linkClassName}>
                {link.title}
              </button>
            }
          >
            {link.page}
          </InfoDialog>
        ))}
        <NotaStimaDialog
          trigger={
            <button type="button" className={linkClassName}>
              Note sulla stima
            </button>
          }
        />
      </nav>
      <p className="text-[11px] text-[#c9cdeb]">
        © 2024 Alca Broker Srl. Tutti i diritti riservati.
      </p>
    </div>
  </footer>
);
