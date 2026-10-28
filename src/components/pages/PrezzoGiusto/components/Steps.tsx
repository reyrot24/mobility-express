import { Eyebrow } from "./Surface";

const steps = [
  [
    "01 / RACCONTACI DI TE",
    "Partiamo dalla tua auto.",
    "Inserisci targa, indirizzo di residenza ed email.",
  ],
  [
    "02 / CONTROLLA LA TUA EMAIL",
    "Ricevi una stima indicativa.",
    "Ricevi un intervallo orientativo. Non è un preventivo assicurativo né una proposta di contratto.",
  ],
  [
    "03 / PARLIAMONE INSIEME",
    "Il tuo referente è qui.",
    "Se lo richiedi, il referente ti ricontatta per il preventivo effettivo. Marketing e ricontatto sono scelte separate.",
  ],
];

export const Steps = ({ style }: { style?: React.CSSProperties }) => (
  <section className="px-[5%] py-12 md:py-16" style={style}>
    <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <Eyebrow className="mb-3">Semplice, dall’inizio</Eyebrow>
        <h2 className="text-2xl font-bold tracking-tight">
          Tre passi. Una scelta più serena.
        </h2>
      </div>
      <p className="text-xs opacity-80 md:max-w-[270px]">
        Il digitale per iniziare.
        <br />
        Una persona per accompagnarti.
      </p>
    </div>
    <div className="grid gap-6 md:grid-cols-3 md:gap-8">
      {steps.map(([number, title, text]) => (
        <article
          key={number}
          className="border-t border-[#e2e4ed] pt-5 dark:border-white/10"
        >
          <span className="mb-3 block text-[11px] font-semibold text-[var(--pg-accento-testo,#af4300)] dark:text-orange md:mb-5">
            {number}
          </span>
          <h3 className="text-lg font-bold">{title}</h3>
          <p className="mt-2.5 text-xs opacity-80">{text}</p>
        </article>
      ))}
    </div>
  </section>
);
