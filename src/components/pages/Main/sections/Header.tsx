import { Button } from "../../../ui/button";
import type { ButtonProps } from "@relume_io/relume-ui";

type Props = {
  description: string;
  buttons: ButtonProps[];
};

export type Header62Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Header = (props: Header62Props) => {
  const { description } = {
    ...Header62Defaults,
    ...props,
  } as Props;
  return (
    <section
      className="px-[5%] pt-36 md:pt-42 md:pt-50 pb-18 md:pb-20 md:pb-25 bg-background2"
      id="Home"
    >
      <div className="container max-w-lg text-center">
        <h1 className="mb-5 text-6xl font-bold md:mb-6 md:text-9xl lg:text-10xl">
          Diventa Parte della Più Solida Rete di Subagenti{" "}
          <span className="text-orange">Assicurativi</span> in Italia
        </h1>
        <p className="md:text-md">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-x-4 md:mt-8">
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

export const Header62Defaults: Header62Props = {
  description:
    "Amplia il tuo business con il potere di una rete nazionale. Sfrutta opportunità esclusive e ricevi un supporto personalizzato per la tua crescita.",
  buttons: [
    {
      title: "Button",
    },
    {
      title: "Button",
      variant: "secondary",
    },
  ],
};
