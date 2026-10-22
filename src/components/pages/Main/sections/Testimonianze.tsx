type Props = {
  heading: string;
  description: string;
  testimonianze: testimonianze[];
};

export type Testimonial3Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export type testimonianze = {
  nome: string;
  testimonianza: string;
};

const TESTIMONIANZE: testimonianze[] = [
  {
    nome: "Mariagrazia Sibilio",
    testimonianza:
      "Grazie a Mobility Express, ampliare il mio portafoglio clienti è stato semplice e rapido. La piattaforma offre una serie di strumenti e funzionalità che rendono il processo di acquisizione e gestione dei clienti molto più fluido. È un supporto indispensabile per chiunque desideri crescere e affermarsi nel settore assicurativo.",
  },
  {
    nome: "Ciro Elefante",
    testimonianza:
      "Facile da usare e ricca di opportunità, Mobility Express è diventata essenziale per il mio business. La piattaforma offre tutto ciò di cui ho bisogno per gestire le mie attività con efficienza e velocità. È uno strumento che ha migliorato notevolmente il mio modo di lavorare e che non posso più fare a meno.",
  },
  {
    nome: "Michela Ricci",
    testimonianza:
      "Mobility Express è la piattaforma completa che ha davvero trasformato il mio lavoro quotidiano. Grazie a essa, sono riuscita ad ampliare il mio portafoglio clienti e aumentare i miei guadagni. È ricca di opportunità, facile da usare e incredibilmente veloce, offrendo tutto ciò di cui ho bisogno nel settore assicurativo. In Mobility Express ho trovato un alleato prezioso per far crescere la mia attività. La consiglio vivamente!",
  },
];

const Testimonianze = (props: Testimonial3Props) => {
  const { heading, description } = {
    ...Testimonial3Defaults,
    ...props,
  } as Props;
  return (
    <section
      className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background2 "
      id="Testimonianze"
    >
      <div className="container">
        <div className="mx-auto mb-12 w-full max-w-lg text-center md:mb-14 lg:mb-16">
          <h1 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
            {heading}
          </h1>
          <p className="md:text-md">{description}</p>
        </div>
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:gap-x-12 lg:gap-y-16">
          {TESTIMONIANZE.map((testimonianza, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <blockquote className="my-6 text-base font-bold leading-[1.4] md:my-8 md:text-md">
                <span className="text-orange">" </span>
                {testimonianza.testimonianza}
                <span className="text-orange">"</span>
              </blockquote>

              <p className="font-semibold text-orange">{testimonianza.nome}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const Testimonial3Defaults: Testimonial3Props = {
  heading: "Testimonianze",
  description: "Leggi le testimonianze di alcuni clienti soddisfatti.",
};

export default Testimonianze;
