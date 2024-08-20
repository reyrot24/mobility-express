import { ButtonProps } from "@relume_io/relume-ui";
import { Button } from "../ui/button";

type Props = {
  heading: string;
  description: string;
  buttons: ButtonProps[];
};

export type Cta25Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const CTA = (props: Cta25Props) => {
  const { heading, description } = {
    ...Cta25Defaults,
    ...props,
  } as Props;
  return (
    <section className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background1">
      <div className="container max-w-lg text-center">
        <h2 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
          {heading}
        </h2>
        <p className="md:text-md">{description}</p>
        <div className="mt-6 flex items-center justify-center gap-4 md:mt-8">
          <Button>Prenota un consulto</Button>
        </div>
      </div>
    </section>
  );
};

export const Cta25Defaults: Cta25Props = {
  heading: "Medium length heading goes here",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique.",
  buttons: [{ title: "Button" }, { title: "Button", variant: "secondary" }],
};
