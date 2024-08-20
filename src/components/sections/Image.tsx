import { Button } from "../ui/button";

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
        <img src={image.src} className="w-full object-cover" alt={image.alt} />
      </div>
      <div className="container max-w-lg text-center mt-12 md:mt-18 lg:mt-20 ">
        <h3 className="text-4xl font-bold leading-[1.2] md:text-5xl lg:text-6xl">
          {heading}
        </h3>
        <p className="mt-5 md:mt-6 md:text-md">{description}</p>
        <div className="mt-6  gap-x-4 md:mt-8">
          <Button>Prenota un consulto</Button>
        </div>
      </div>
    </section>
  );
};

export const Layout90Defaults: Layout90Props = {
  heading: "Long heading is what you see here in this feature section",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla.",
  image: {
    src: "https://relume-assets.s3.amazonaws.com/placeholder-image-landscape.svg",
    alt: "Placeholder image",
  },
};
