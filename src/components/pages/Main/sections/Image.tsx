import { foto } from "@/constants/images";
import { Button } from "../../../ui/button";

type ImageProps = {
  src: string;
  alt?: string;
};

type Props = {
  heading: string;
  description: string;
  image: ImageProps;
};

export type Layout90Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Image = (props: Layout90Props) => {
  const { heading, description, image } = {
    ...Layout90Defaults,
    ...props,
  } as Props;
  return (
    <section className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background2 ">
      <div className="container">
        <img
          src={image.src}
          className="w-full object-cover border-[1px] border-orangeHover"
          alt={image.alt}
        />
      </div>
      <div className="container max-w-lg text-center mt-12 md:mt-18 lg:mt-20 ">
        <h3 className="text-4xl font-bold leading-[1.2] md:text-5xl lg:text-6xl">
          {heading}
        </h3>
        <p className="mt-5 md:mt-6 md:text-md">{description}</p>
        <div className="mt-6  gap-x-4 md:mt-8">
          <a
            href="https://tidycal.com/sviluppo/introduzione-mobility-express"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button>Prenota un consulto</Button>
          </a>
        </div>
      </div>
    </section>
  );
};

export const Layout90Defaults: Layout90Props = {
  heading: "Mobility Express: Requisiti d'ingresso",
  description:
    "Per entrare nella rete Mobility Express, è necessario essere un intermediario assicurativo iscritto come subagente nella sezione E del RUI e soddisfare tutti i requisiti normativi. Se possiedi questi requisiti e desideri unirti al nostro team di consulenti, compila il form con i tuoi dati, contatti e numero d'iscrizione al RUI. Invia la tua candidatura oggi stesso e diventa parte della nostra rete!",
  image: foto,
};
