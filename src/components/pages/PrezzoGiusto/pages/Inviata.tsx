import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eyebrow, Panel } from "../components/Surface";
import { NessunaRichiesta } from "./Messaggi";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { PG_BASE } from "../utils/model";

const Inviata = () => {
  const { current: q } = usePrezzoGiusto();
  if (!q) return <NessunaRichiesta />;
  const daAttivare = q.status === "in_attesa_attivazione";

  return (
    <Panel className="mx-auto my-8 max-w-lg">
      <div className="mb-6 grid size-14 place-items-center rounded-full bg-orange text-xl text-blueText">
        ✓
      </div>
      <Eyebrow className="mb-3">Richiesta {q.id}</Eyebrow>
      <h1 className="mb-3 text-2xl font-bold tracking-tight">
        {daAttivare ? (
          <>
            Ci sei quasi:
            <br />
            controlla la tua email.
          </>
        ) : (
          <>
            Richiesta ricevuta,
            <br />
            ci pensiamo noi.
          </>
        )}
      </h1>
      {daAttivare ? (
        <>
          <p className="mb-3 opacity-80">
            Abbiamo inviato a <strong className="break-all">{q.email}</strong>{" "}
            il link per attivare la tua area personale, insieme a una password
            temporanea.
          </p>
          <p className="mb-5 opacity-80">
            <strong>Attivala per confermare la richiesta</strong>: subito dopo
            prepariamo la stima e ti scriviamo appena è pronta. Non trovi
            l’email? Controlla anche nella cartella spam.
          </p>
        </>
      ) : (
        <p className="mb-5 opacity-80">
          Stiamo preparando la stima per il tuo veicolo. Ti scriveremo a{" "}
          <strong className="break-all">{q.email}</strong> appena è pronta e
          intanto puoi seguire la richiesta dalla tua area personale.
        </p>
      )}
      <div className="mb-6 rounded-lg bg-background2 p-3 text-[11px] leading-relaxed">
        Veicolo: <strong className="text-xs">{q.plate}</strong>
        <br />
        Referente: <strong className="text-xs">{q.ref.name}</strong>
        <br />
        Ricontatto dal referente:{" "}
        <strong className="text-xs">
          {q.consents.callback.granted ? "richiesto" : "non richiesto"}
        </strong>
        <br />
        Comunicazioni commerciali:{" "}
        <strong className="text-xs">
          {q.consents.marketing.granted ? "accettate" : "non accettate"}
        </strong>
      </div>
      <div className="flex flex-col gap-3">
        {!daAttivare && (
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
