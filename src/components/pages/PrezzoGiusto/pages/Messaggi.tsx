import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Panel } from "../components/Surface";
import { PG_BASE } from "../utils/model";

type Props = {
  title: string;
  children?: React.ReactNode;
  action: { to: string; label: string };
};

export const CenterMessage = ({ title, children, action }: Props) => (
  <Panel className="mx-auto my-8 max-w-lg">
    <h1 className="mb-3 text-2xl font-bold tracking-tight">{title}</h1>
    {children && <p className="mb-6 opacity-80">{children}</p>}
    <Button asChild size="lg">
      <Link to={action.to}>{action.label}</Link>
    </Button>
  </Panel>
);

export const NessunaRichiesta = () => (
  <CenterMessage
    title="Partiamo da una richiesta."
    action={{ to: PG_BASE, label: "Richiedi una stima" }}
  >
    Compila il modulo per ricevere la tua prima stima e ritrovarla nella tua
    area personale.
  </CenterMessage>
);

export const LinkNonValido = () => (
  <div className="px-[5%] py-10">
    <CenterMessage
      title="Questo link non è più attivo."
      action={{ to: PG_BASE, label: "Vai alla pagina iniziale" }}
    >
      Chiedi al tuo referente un nuovo link per richiedere la stima.
    </CenterMessage>
  </div>
);

export const PaginaNonTrovata = () => (
  <CenterMessage
    title="Pagina non trovata."
    action={{ to: PG_BASE, label: "Torna alla pagina iniziale" }}
  />
);

/** Mentre arriva la pagina personalizzata del referente: niente testi standard che poi cambiano. */
export const PaginaInCaricamento = () => (
  <div className="grid min-h-[65vh] place-items-center px-[5%]" role="status">
    <div className="flex flex-col items-center gap-4">
      <span
        aria-hidden="true"
        className="size-9 animate-spin rounded-full border-[3px] border-orange/25 border-t-orange"
      />
      <span className="text-xs opacity-70">Stiamo preparando la pagina…</span>
    </div>
  </div>
);

export const Caricamento = ({ label = "Caricamento…" }: { label?: string }) => (
  <p className="my-16 text-center text-xs opacity-70" role="status">
    {label}
  </p>
);
