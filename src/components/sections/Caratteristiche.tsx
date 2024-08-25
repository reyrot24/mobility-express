import { Button } from "../ui/button";

type ImageProps = {
  src: string;
  alt?: string;
};

type FeaturesProps = {
  icon: ImageProps;
  heading: string;
  description: string;
};

type Props = {
  features: FeaturesProps[];
  heading: string;
  description: string;
};

export type Layout221Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Caratteristiche = (props: Layout221Props) => {
  const { features, heading, description } = {
    ...Layout221Defaults,
    ...props,
  } as Props;

  return (
    <section
      className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background1"
      id="Caratteristiche"
    >
      <div className="container">
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-12 md:items-center md:gap-x-12 lg:gap-x-20">
          <div className="static md:sticky md:top-[30%] md:col-span-5">
            <h2 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
              {heading}
            </h2>
            <p className="md:text-md">{description}</p>
            <div className="mt-6 flex items-center gap-x-4 md:mt-8">
              <Button>
                <a
                  href="https://tidycal.com/sviluppo/introduzione-mobility-express"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Prenota un consulto
                </a>
              </Button>
            </div>
          </div>
          <div className="order-1 lg:order-2 md:col-span-7">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 py-2 md:grid-cols-2">
              {features.map((feature, index) => (
                <div key={index}>
                  <div className="mb-3 md:mb-4">
                    <img
                      src={feature.icon.src}
                      className="size-12 text-orange"
                      alt={feature.icon.alt}
                    />
                  </div>
                  <h1 className="mb-3 text-xl font-bold md:mb-4 md:text-2xl">
                    {feature.heading}
                  </h1>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Layout221Defaults: Layout221Props = {
  features: [
    {
      icon: {
        src: "https://cdn-icons-png.flaticon.com/512/1378/1378723.png",
        alt: "Tecnologia",
      },
      heading: "Tecnologia Avanzata",
      description:
        "Gestisci preventivi, confronti ed emissioni assicurative da un'unica piattaforma integrata.",
    },
    {
      icon: {
        src: "https://www.svgrepo.com/show/167663/earn-money.svg",
        alt: "Guadagni",
      },
      heading: "Maggiori Guadagni",
      description:
        "Accedi a opportunità di guadagno rapide e vantaggiose con facilità.",
    },
    {
      icon: {
        src: "https://cdn-icons-png.flaticon.com/512/8744/8744612.png",
        alt: "Prodotti",
      },
      heading: "Ampia Gamma di Prodotti",
      description:
        "Trova le soluzione assicurative più adatte ai tuoi clienti con accesso diretto ai principali prodotti.",
    },
    {
      icon: {
        src: "https://www.svgrepo.com/show/304477/support.svg",
        alt: "Supporto",
      },
      heading: "Supporto Dedicato",
      description:
        "Affidati all'esperienza di professionisti per migliorare e gestire ogni fase del processo, dalla vendita all'assistenza post-vendita.",
    },
  ],
  heading: "Potenzia il Tuo Business con la nostra Piattaforma Innovativa",
  description:
    "Una piattaforma all-in-one che semplifica ogni aspetto del tuo lavoro assicurativo. Accedi a strumenti avanzati per far crescere la tua attività e ottimizzare il processo di vendita con un'interfaccia intuitiva. Riduci i tempi di gestione e aumenta l'efficienza del tuo servizio con soluzione professionali.",
};
