import { Button } from "../ui/button";
import type { ButtonProps } from "@relume_io/relume-ui";
import { RxChevronRight } from "react-icons/rx";

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
  buttons: ButtonProps[];
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
              <Button>Prenota un consulto</Button>
            </div>
          </div>
          <div className="order-1 lg:order-2 md:col-span-7">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 py-2 md:grid-cols-2">
              {features.map((feature, index) => (
                <div key={index}>
                  <div className="mb-3 md:mb-4">
                    <img
                      src={feature.icon.src}
                      className="size-12"
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
        src: "https://relume-assets.s3.amazonaws.com/relume-icon.svg",
        alt: "Relume logo 1",
      },
      heading: "Short heading here",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.",
    },
    {
      icon: {
        src: "https://relume-assets.s3.amazonaws.com/relume-icon.svg",
        alt: "Relume logo 2",
      },
      heading: "Short heading here",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.",
    },
    {
      icon: {
        src: "https://relume-assets.s3.amazonaws.com/relume-icon.svg",
        alt: "Relume logo 3",
      },
      heading: "Short heading here",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.",
    },
    {
      icon: {
        src: "https://relume-assets.s3.amazonaws.com/relume-icon.svg",
        alt: "Relume logo 4",
      },
      heading: "Short heading here",
      description:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros.",
    },
  ],
  buttons: [
    {
      title: "Button",
      variant: "secondary",
    },
    {
      title: "Button",
      variant: "link",
      size: "link",
      iconRight: <RxChevronRight />,
    },
  ],
  heading: "Medium length section heading goes here",
  description:
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse varius enim in eros elementum tristique. Duis cursus, mi quis viverra ornare, eros dolor interdum nulla, ut commodo diam libero vitae erat.",
};
