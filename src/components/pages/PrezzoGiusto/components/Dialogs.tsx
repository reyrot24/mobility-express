import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import Privacy from "../../Legali/Privacy";
import { Contact } from "./Referente";
import { EstimateNotice } from "./Estimate";
import { PRIVACY_EMAIL } from "../utils/estimate";
import { PG_BASE } from "../utils/model";
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

// Sezione specifica del servizio, mostrata prima della Privacy Policy generale del sito
export const ServicePrivacy = () => (
  <section className="mb-6 rounded-lg bg-background2 p-5 text-xs [&_p]:mb-2">
    <h2 className="mb-3 text-base font-bold">Il servizio “OK, il prezzo è giusto?”</h2>
    <p>
      Il servizio ha un’informativa dedicata di Alca Broker S.r.l.:{" "}
      <Link className="underline" to={`${PG_BASE}/privacy`}>
        Informativa privacy del servizio
      </Link>{" "}
      e{" "}
      <Link className="underline" to={`${PG_BASE}/condizioni`}>
        Condizioni del servizio
      </Link>
      .
    </p>
    <p>
      Il ricontatto per un preventivo effettivo e le comunicazioni commerciali sono scelte
      facoltative e distinte: puoi ricevere la stima senza nessuna delle due. Il consenso
      commerciale si gestisce dall’area personale o scrivendo a{" "}
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
