import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PG_BASE } from "../utils/model";
import { CONDIZIONI, PRIVACY, type DocumentoLegale } from "../utils/documenti";

// Pagine pubbliche /prezzo-giusto/condizioni e /prezzo-giusto/privacy: accessibili senza login,
// con versione, data e PDF. La lettura non attiva nulla: l'adesione si conferma solo dal link personale.

/** "**grassetto**" → <strong>. */
const Testo = ({ value }: { value: string }) => (
  <>
    {value.split("**").map((part, i) => (
      <Fragment key={i}>{i % 2 ? <strong>{part}</strong> : part}</Fragment>
    ))}
  </>
);

const dataItaliana = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const Documento = ({
  doc,
  altro,
}: {
  doc: DocumentoLegale;
  altro: DocumentoLegale;
}) => (
  <article className="mx-auto max-w-3xl px-[5%] pb-16 pt-8 ">
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--pg-accento-testo,#ac4300)]">
      {doc.etichetta}
    </p>
    <h1 className="mb-3 text-3xl font-bold tracking-tight">{doc.titolo}</h1>
    <p className="mb-5 opacity-80">{doc.sottotitolo}</p>

    <div className="mb-6 flex flex-wrap items-center gap-3">
      <Button asChild>
        <a href={doc.pdf} target="_blank" rel="noopener">
          <Download className="mr-2 size-4" aria-hidden="true" />
          Scarica il PDF
        </a>
      </Button>
      <span className="text-xs opacity-70">
        Versione {doc.versione} · {dataItaliana(doc.data)}
      </span>
    </div>

    <p className="mb-8 rounded-md border border-[#f1d38c] bg-[#fff7df] p-4 text-xs font-semibold text-[#6b4a00]">
      {doc.avviso}
    </p>

    {doc.sezioni.map((sezione) => (
      <section key={sezione.titolo} className="mb-6">
        <h2 className="mb-2 text-lg font-bold">{sezione.titolo}</h2>
        {sezione.paragrafi.map((p, i) => (
          <p key={i} className="mb-3 leading-relaxed opacity-90">
            <Testo value={p} />
          </p>
        ))}
      </section>
    ))}

    <p className="mt-8 border-t border-[#e0e2ed] pt-4 text-xs opacity-80 dark:border-white/10">
      <Testo value={doc.nota} />
    </p>
    <p className="mt-6 text-xs">
      Vedi anche:{" "}
      <Link className="underline" to={`${PG_BASE}/${altro.tipo}`}>
        {altro.titolo}
      </Link>{" "}
      (versione {altro.versione}).
    </p>
  </article>
);

export const Condizioni = () => <Documento doc={CONDIZIONI} altro={PRIVACY} />;
export const InformativaPrivacy = () => (
  <Documento doc={PRIVACY} altro={CONDIZIONI} />
);
