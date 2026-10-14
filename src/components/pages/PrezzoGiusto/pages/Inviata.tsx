import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eyebrow, Panel } from "../components/Surface";
import { NessunaRichiesta } from "./Messaggi";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { PG_BASE } from "../utils/model";

const Inviata = () => {
  const { current: q } = usePrezzoGiusto();
  if (!q) return <NessunaRichiesta />;

  return (
    <Panel className="mx-auto my-8 max-w-lg">
      <div className="mb-6 grid size-14 place-items-center rounded-full bg-orange text-xl text-blueText">
        ✓
      </div>
      <Eyebrow className="mb-3">Richiesta {q.id}</Eyebrow>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        La tua richiesta
        <br />è in elaborazione.
      </h1>
      {q.status === "in_attesa_attivazione" ? (
        <p className="mb-5 opacity-80">
          Ti abbiamo scritto a <strong className="break-all">{q.email}</strong>.
          Apri l’email e <strong>attiva la tua area personale</strong>: è
          l’ultimo passaggio, poi prepariamo la stima e ti avvisiamo quando è
          pronta.
        </p>
      ) : (
        <p className="mb-5 opacity-80">
          Ti abbiamo inviato una conferma a{" "}
          <strong className="break-all">{q.email}</strong>. Appena la stima è
          pronta ti scriviamo di nuovo e la trovi nella tua area personale.
        </p>
      )}
      <div className="mb-6 rounded-lg bg-background2 p-3 text-[11px] leading-relaxed">
        Veicolo: <strong className="text-xs">{q.plate}</strong>
        <br />
        Referente: <strong className="text-xs">{q.ref.name}</strong>
        <br />
        Ricontatto:{" "}
        <strong className="text-xs">
          {q.consents.callback.granted ? "richiesto via email" : "non richiesto"}
        </strong>
        <br />
        Marketing:{" "}
        <strong className="text-xs">
          {q.consents.marketing.granted ? "consenso prestato" : "consenso non prestato"}
        </strong>
      </div>
      <div className="flex flex-col gap-3">
        {q.status !== "in_attesa_attivazione" && (
          <Button asChild size="lg">
            <Link to={`${PG_BASE}/accesso`}>Vai alla tua area personale</Link>
          </Button>
        )}
        <Button asChild size="lg" variant="outline">
          {/* Stesso link del referente, così il codice resta associato */}
          <Link to={`${PG_BASE}/${encodeURIComponent(q.ref.id)}`}>
            Fai un’altra richiesta
          </Link>
        </Button>
      </div>
    </Panel>
  );
};

export default Inviata;
