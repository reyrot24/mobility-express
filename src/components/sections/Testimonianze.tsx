import { client, urlFor } from "@/client";
import { useEffect, useState } from "react";

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
  azienda: string;
  foto: string;
};

const Testimonianze = (props: Testimonial3Props) => {
  const { heading, description } = {
    ...Testimonial3Defaults,
    ...props,
  } as Props;
  const [testimonianze, setTestimonianze] = useState([]);

  useEffect(() => {
    client
      .fetch('*[_type == "testimonianze" ]{nome, testimonianza, azienda, foto}')
      .then((data) => {
        console.log(data);
        setTestimonianze(data);
      });
  }, []);

  return (
    <section
      className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background2 "
      id="Testimonianze"
    >
      <div className="container">
        <div className="mx-auto mb-12 w-full max-w-lg text-center md:mb-18 lg:mb-20">
          <h1 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
            {heading}
          </h1>
          <p className="md:text-md">{description}</p>
        </div>
        <div className="grid grid-cols-1 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:gap-x-12 lg:gap-y-16">
          {testimonianze.map((testimonianza: testimonianze, index) => (
            <div key={index} className="flex flex-col items-center text-center">
              <blockquote className="my-6 text-md font-bold leading-[1.4] md:my-8 md:text-xl">
                "{testimonianza.testimonianza}"
              </blockquote>
              <img
                src={urlFor(testimonianza.foto).toString()}
                alt="Img"
                className="mb-4 size-14 min-h-14 min-w-14 rounded-full object-cover"
              />
              <p className="font-semibold">{testimonianza.nome}</p>
              <p>
                <span>{testimonianza.azienda}</span>
              </p>
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
