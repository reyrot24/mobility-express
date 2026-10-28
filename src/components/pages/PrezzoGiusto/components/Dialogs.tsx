import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import Privacy from "../../Legali/Privacy";
import { Contact } from "./Referente";
import { EstimateNotice } from "./Estimate";
import { PRIVACY_EMAIL } from "../utils/estimate";
import type { Referente } from "../utils/model";

type InfoDialogProps = {
  title?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  children: React.ReactNode;
};

export const InfoDialog = ({
  title,
  trigger,
  open,
  onOpenChange,
  className,
  children,
}: InfoDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
    <DialogContent
      aria-describedby={undefined}
      className={cn("max-h-[86vh] overflow-auto text-text", className)}
    >
      {title ? (
        <DialogTitle className="pr-6 text-xl font-bold">{title}</DialogTitle>
      ) : (
        <DialogTitle className="sr-only">Informazioni</DialogTitle>
      )}
      <div className="space-y-3 text-sm [&_p]:opacity-90">{children}</div>
    </DialogContent>
  </Dialog>
);

// Sezione specifica del servizio, mostrata prima della Privacy Policy generale
export const ServicePrivacy = () => (
  <section className="mb-6 rounded-lg bg-background2 p-5 text-xs [&_p]:mb-2">
    <h2 className="mb-3 text-base font-bold">La richiesta di stima e le tue scelte</h2>
    <p>
      La richiesta serve a ricevere via email una stima indicativa e a
      ritrovarla nell’area personale. Targa, residenza ed email sono dati
      personali.
    </p>
    <p>
      Il ricontatto via email per un preventivo effettivo è facoltativo e
      riguarda il referente associato al link. È distinto dal consenso
      facoltativo per le comunicazioni commerciali via email di Alca Broker srl.
    </p>
    <p>
      Puoi ricevere la stima senza richiedere il ricontatto e senza acconsentire
      al marketing. Il consenso commerciale può essere revocato scrivendo a{" "}
      <a className="underline" href={`mailto:${PRIVACY_EMAIL}`}>
        {PRIVACY_EMAIL}
      </a>
      .
    </p>
  </section>
);

export const PrivacyContent = () => (
  <>
    <ServicePrivacy />
    <Privacy />
  </>
);

export const PrivacyDialog = ({ trigger }: { trigger: React.ReactNode }) => (
  <InfoDialog trigger={trigger} className="h-[500px] max-w-3xl no-scrollbar">
    <PrivacyContent />
  </InfoDialog>
);

export const NotaStimaDialog = ({ trigger }: { trigger: React.ReactNode }) => (
  <InfoDialog title="Una stima per orientarti." trigger={trigger}>
    <EstimateNotice />
    <p>
      Il range non riserva un prezzo, non identifica una compagnia e non
      consente di sottoscrivere una polizza. Per un preventivo effettivo puoi
      richiedere un ricontatto al referente.
    </p>
  </InfoDialog>
);

export const ReferenteDialog = ({
  referral,
  trigger,
}: {
  referral: Referente;
  trigger: React.ReactNode;
}) => (
  <InfoDialog title="Il valore di una persona." trigger={trigger}>
    <Contact referral={referral} />
    <p className="whitespace-pre-line break-words pt-3">
      {referral.intro ??
        `${referral.name} ti accompagna dalla prima stima alla verifica delle coperture.`}
    </p>
  </InfoDialog>
);
