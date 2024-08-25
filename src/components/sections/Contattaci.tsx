import { useState } from "react";
import { BiEnvelope, BiMap, BiPhone } from "react-icons/bi";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";

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

  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [acceptTerms, setAcceptTerms] = useState<boolean | "indeterminate">(
    false
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log({
      nameInput,
      emailInput,
      messageInput,
      acceptTerms,
    });
  };

  return (
    <section
      className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-18 md:pb-20 md:pb-25 bg-background2"
      id="Contattaci"
    >
      <div className="container grid grid-cols-1 items-start gap-y-12 md:grid-flow-row md:grid-cols-2 md:gap-x-12 lg:grid-flow-col lg:gap-x-20 lg:gap-y-16">
        <div>
          <div className="mb-6 md:mb-8">
            <h2 className="mb-5 text-5xl font-bold md:mb-6 md:text-7xl lg:text-8xl">
              {heading}
            </h2>
            <p className="md:text-md">{description}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 py-2">
            <div className="flex items-center gap-4">
              <BiEnvelope className="size-6 flex-none" />
              <p>{email}</p>
            </div>
            <div className="flex items-center gap-4">
              <BiPhone className="size-6 flex-none" />
              <p>{phone}</p>
            </div>
            <div className="flex items-center gap-4">
              <BiMap className="size-6 flex-none" />
              <p>{address}</p>
            </div>
          </div>
        </div>

        <form
          className="grid grid-cols-1 grid-rows-[auto_auto] gap-6"
          onSubmit={handleSubmit}
        >
          <div className="grid w-full items-center">
            <Label htmlFor="name" className="mb-2">
              Nome
            </Label>
            <Input
              type="text"
              id="name"
              placeholder="Nome"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
            />
          </div>

          <div className="grid w-full items-center">
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input
              type="email"
              id="email"
              placeholder="Email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
          </div>

          <div className="grid w-full items-center">
            <Label htmlFor="message" className="mb-2">
              Messaggio
            </Label>
            <Textarea
              id="message"
              placeholder="Il tuo messaggio..."
              className="min-h-[11.25rem] overflow-auto"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
            />
          </div>

          <div className="mb-3 flex items-center space-x-2 text-sm md:mb-4">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={setAcceptTerms}
            />
            <Label htmlFor="terms" className="cursor-pointer">
              Accetto i{" "}
              <a
                className="text-text hover:text-gray-300 underline"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
              >
                Termini di Servizi
              </a>
            </Label>
          </div>

          <div>
            <Button>Invia</Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export const Contact5Defaults: Contact5Props = {
  heading: "Contattaci",
  description: "Compila il form per metterti in contatto con noi.",
  email: "alcabrokersrl@legalmail.it",
  phone: "+39 081 529 70 45",
  address: "Via Vittoria Colonna 14 - 80121 Napoli (NA)",
};
