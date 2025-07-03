import { BiEnvelope, BiMap, BiPhone } from "react-icons/bi";

type Props = {
  heading: string;
  description: string;
  email: string;
  phone: string;
  address: string;
};

export type Contact5Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Contattaci = (props: Contact5Props) => {
  const { heading, description, email, phone, address } = {
    ...Contact5Defaults,
    ...props,
  } as Props;

  return (
    <section
      className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background2"
      id="Contattaci"
    >
      <div className="container grid grid-cols-1 items-start mb-8">
        <div>
          <div className="mb-6 md:mb-8">
            <h2 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
              {heading}
            </h2>
            <p className="md:text-md">{description}</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
        <div className="flex flex-col gap-4 items-center ">
          <BiEnvelope size={40} className="text-orangeHover" />
          <h1 className="font-bold">Email</h1>
          <p className="text-center">Inviaci un'email per qualsiasi dubbio:</p>
          <p className="text-center">{email}</p>
        </div>
        <div className="flex flex-col gap-4 items-center">
          <BiPhone size={40} className="text-orangeHover" />
          <h1 className="font-bold">Telefono</h1>
          <p className="text-center">
            Chiamaci per parlare direttamente con noi:
          </p>
          <p className="text-center">{phone}</p>
        </div>
        <div className="flex flex-col gap-4 items-center">
          <BiMap size={40} className="text-orangeHover" />
          <h1 className="font-bold">Indirizzo</h1>
          <p className="text-center">
            Vienici a trovare al seguente indirizzo:
          </p>
          <p className="text-center">{address}</p>
        </div>
      </div>
    </section>
  );
};

export const Contact5Defaults: Contact5Props = {
  heading: "Contattaci",
  description:
    "Contattaci attraverso uno di questi canali o vienici a trovare.",
  email: "sviluppo@alcabroker.it",
  phone: "+39 081 8283736",
  address: "Via Vittoria Colonna 14 - 80121 Napoli (NA)",
};
