import { useRef, useState } from "react";
import { BiEnvelope, BiMap, BiPhone } from "react-icons/bi";
import { Button } from "../../../ui/button";
import { Label } from "../../../ui/label";
import { Input } from "../../../ui/input";
import { Textarea } from "../../../ui/textarea";
import { Checkbox } from "../../../ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "../../../ui/dialog";
import TerminiDiServizio from "../../Legali/TerminiDiServizio";
import emailjs from "@emailjs/browser";
import { useForm } from "react-hook-form";
import ReCAPTCHA from "react-google-recaptcha";

type Props = {
  heading: string;
  description: string;
  email: string;
  phone: string;
  address: string;
};

export type Contact5Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

interface IFormInput {
  user_name: string;
  user_email: string;
  message: string;
}

export const Contattaci = (props: Contact5Props) => {
  const { heading, description, email, phone, address } = {
    ...Contact5Defaults,
    ...props,
  } as Props;

  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState<boolean | "indeterminate">(
    false
  );

  const { register, handleSubmit, reset } = useForm<IFormInput>();

  const recaptcha = useRef<ReCAPTCHA>(null);

  const onSubmit = (data: IFormInput) => {
    setLoading(true);

    const captchaValue = recaptcha.current?.getValue();
    if (!captchaValue) {
      alert("Verifica il reCAPTCHA!");
      setLoading(false);
    } else {
      const templateParams = {
        ...data,
        "g-recaptcha-response": captchaValue,
      };

      if (acceptTerms) {
        emailjs
          .send(
            import.meta.env.VITE_EMAIL_SERVICE_ID,
            import.meta.env.VITE_EMAIL_TEMPLATE_ID,
            templateParams,
            import.meta.env.VITE_EMAIL_PUBLIC_KEY
          )
          .then(() => {
            reset();
            setLoading(false);
            alert(
              "Email inviata con successo. A breve riceverà un'email di conferma!"
            );
          });
      } else {
        setLoading(false);
        alert("Accetta la Privacy!");
      }
    }
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
              <BiEnvelope className="size-6 flex-none text-orangeHover" />
              <p>{email}</p>
            </div>
            <div className="flex items-center gap-4">
              <BiPhone className="size-6 flex-none text-orangeHover" />
              <p>{phone}</p>
            </div>
            <div className="flex items-center gap-4">
              <BiMap className="size-6 flex-none text-orangeHover" />
              <p>{address}</p>
            </div>
          </div>
        </div>
        <form
          className="grid grid-cols-1 grid-rows-[auto_auto] gap-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="grid w-full items-center">
            <Label htmlFor="name" className="mb-2">
              Nome
            </Label>
            <Input
              type="text"
              placeholder="Nome"
              id="user_name"
              {...register("user_name", { required: true })}
            />
          </div>

          <div className="grid w-full items-center">
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input
              type="email"
              placeholder="Email"
              id="user_email"
              {...register("user_email", { required: true })}
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
              {...register("message", { required: true })}
            />
          </div>

          <div className="mb-3 flex items-center space-x-2 text-sm md:mb-4">
            <Checkbox
              id="terms"
              checked={acceptTerms}
              onCheckedChange={setAcceptTerms}
            />
            <div>
              <Label htmlFor="terms" className="cursor-pointer ">
                Accetto i
              </Label>
            </div>
            <div>
              <Dialog>
                <DialogTrigger asChild>
                  <p className="font-semibold underline decoration-text cursor-pointer hover:decoration-whiteHover underline-offset-1 hover:text-whiteHover ">
                    Termini di Servizi
                  </p>
                </DialogTrigger>
                <DialogContent className="h-[500px] overflow-auto no-scrollbar">
                  <TerminiDiServizio />
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="default">
                        Close
                      </Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          {/*  <Recaptcha siteKey="6LdEmoIqAAAAAGSf5nsJgjLMsWtu7_UCIKSC-opI" /> */}
          <ReCAPTCHA
            ref={recaptcha}
            sitekey="6LdEmoIqAAAAAGSf5nsJgjLMsWtu7_UCIKSC-opI"
          />

          <div>
            <Button disabled={loading} type="submit">
              Invia
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export const Contact5Defaults: Contact5Props = {
  heading: "Contattaci",
  description: "Compila il form per metterti in contatto con noi.",
  email: "sviluppo@alcabroker.it",
  phone: "+39 081 529 70 45",
  address: "Via Vittoria Colonna 14 - 80121 Napoli (NA)",
};

//registrazioni@mobilityexpress.it
/*
emailjs.send("service_id", "template_id", {
  to_name: "Mario Rossi",
  from_name: "La Tua Azienda",
  message: "Grazie per esserti registrato!",
  subject: "Benvenuto nella nostra piattaforma" // Oggetto fisso
}, "user_id")
.then((response) => {
  console.log("Email inviata con successo!", response.status, response.text);
})
.catch((error) => {
  console.error("Errore nell'invio dell'email:", error);
}); */
