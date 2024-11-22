import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../../ui/accordion";
import { Button } from "../../../ui/button";

type QuestionsProps = {
  title: string;
  answer: string;
};

type Props = {
  heading: string;
  description: string;
  footerHeading: string;
  footerDescription: string;
  questions: QuestionsProps[];
};

export type Faq1Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const FAQs = (props: Faq1Props) => {
  const { heading, description, questions, footerHeading, footerDescription } =
    {
      ...Faq1Defaults,
      ...props,
    } as Props;
  return (
    <section
      className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background1 "
      id="FAQs"
    >
      <div className="container ">
        <div className="mb-12 text-left md:mb-18 lg:mb-20">
          <h2 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
            {heading}
          </h2>
          <p className="md:text-md">{description}</p>
        </div>
        <Accordion type="multiple">
          {questions.map((question, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="border-whiteHover"
            >
              <AccordionTrigger className="md:py-5 md:text-md">
                {question.title}
              </AccordionTrigger>
              <AccordionContent className="md:pb-6">
                {question.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="mx-auto mt-12 max-w-md text-center md:mt-18 lg:mt-20">
          <h4 className="mb-3 text-2xl font-bold md:mb-4 md:text-3xl md:leading-[1.3] lg:text-4xl">
            {footerHeading}
          </h4>
          <p className="md:text-md">{footerDescription}</p>
          <div className="mt-6 md:mt-8">
            <a
              href="https://tidycal.com/sviluppo/introduzione-mobility-express"
              rel="noopener noreferrer"
              target="_blank"
            >
              <Button>Prenota un consulto</Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export const Faq1Defaults: Faq1Props = {
  heading: "FAQs",
  description: "Ecco le risposte alle domande più frequenti.",
  questions: [
    {
      title: "Cos'è Mobility Express?",
      answer:
        "Mobility Express è il brand di Alca Broker dedicato a una piattaforma avanzata per la preventivazione, gestione e vendita di polizze assicurative. Questo progetto si unisce alla solidità di una rete di subagenti assicurativi indipendenti con nostre tecnologie all'avanguardia, offrendo agli loro una soluzione completa per espandere il proprio business. Grazie a Mobility Express, puoi proporre ai tuoi clienti un'ampia gamma di prodotti assicurativi, oltre a servizi come Energia e Noleggio a lungo termine, usufruendo di un sistema di provvigioni vantaggioso e strumenti esclusivi per semplificare la gestione della tua attività. La piattaforma ti permette inoltre di aumentare la tua visibilità e massimizzare i guadagni con i nostri strumenti innovativi.",
    },
    {
      title: "Quali vantaggi offre la piattaforma Mobility Express?",
      answer:
        "Se sei un subagente, avere a disposizione la piattaforma Mobility Express ti offre l'accesso a una vasta gamma di prodotti assicurativi, sia per il settore motor che per altri rami. Potrai approfittare di opportunità economiche vantaggiose, ricevere supporto dedicato nelle fasi di pre e post vendita e utilizzare una tecnologia all'avanguardia per accelerare e operare in modo rapido ed efficiente.",
    },
    {
      title: "Quali vantaggi economici ci sono?",
      answer:
        "Entrando a far parte della nostra rete, avrai accesso a provvigioni competitive su un ampio range di prodotti. Inoltre, potrai partecipare a contest con premi.",
    },
  ],
  footerHeading: "Hai ancora domande?",
  footerDescription: "Clicca il pulsante qui sotto per contattarci.",
};
