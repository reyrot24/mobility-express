import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Steps } from "../components/Steps";
import { PG_BASE } from "../utils/model";
import { ESTIMATE_DISCLAIMER, ESTIMATE_METHOD } from "../utils/estimate";

const faqs = [
  ["Questa stima è un preventivo assicurativo?", ESTIMATE_DISCLAIMER],
  [
    "Su cosa si basa il range?",
    `${ESTIMATE_METHOD} Non identifica una specifica offerta di una compagnia.`,
  ],
  [
    "Riceverò un ricontatto o messaggi commerciali?",
    "Il ricontatto per il preventivo effettivo avviene solo se lo richiedi. Le comunicazioni commerciali richiedono una scelta distinta e facoltativa. Puoi ricevere la stima senza selezionare nessuna delle due opzioni.",
  ],
  [
    "Come entro nella mia area personale?",
    "Dal link personale ricevuto via email. Potrai poi scegliere una password per accedere in autonomia.",
  ],
  [
    "Chi sarà il mio referente?",
    "La persona associata al link che hai ricevuto. I suoi contatti accompagnano la stima e l’eventuale richiesta di ricontatto.",
  ],
];

const ComeFunziona = () => (
  <>
    <Steps />
    <section className="px-[5%] pb-16">
      <div className="mx-auto max-w-3xl">
        <h2 className="mb-4 text-2xl font-bold tracking-tight">
          Prima di cominciare.
        </h2>
        <Accordion type="single" collapsible defaultValue="faq-0">
          {faqs.map(([question, answer], i) => (
            <AccordionItem key={question} value={`faq-${i}`}>
              <AccordionTrigger className="text-left">{question}</AccordionTrigger>
              <AccordionContent className="opacity-90">{answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <Button asChild size="lg" className="mt-6">
          <Link to={PG_BASE}>Richiedi una stima indicativa</Link>
        </Button>
      </div>
    </section>
  </>
);

export default ComeFunziona;
