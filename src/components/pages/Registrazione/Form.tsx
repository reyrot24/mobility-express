import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@relume_io/relume-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { datiAnagrafici, datiAzienda, datiResponsabile } from "./inputs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import TerminiDiServizio from "../Legali/TerminiDiServizio";
import emailjs from "@emailjs/browser";
import { useForm } from "react-hook-form";

type Props = {
  button: ButtonProps;
};

export type Contact6Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

interface IFormInput {
  //Dati anagrafici & responsabile
  cognome: string;
  nome: string;
  cf: string;
  data_nascita: string;
  luogo_nascita: string;
  via_corso: string;
  indirizzo: string;
  civico: string;
  cap: string;
  comune: string;
  provincia: string;
  rui: string;
  data_iscrizione: string;
  telefono: string;
  cellulare: string;
  email: string;

  //Dati Azienda
  ragione_sociale: string;
  piva: string;
  via_corso_azienda: string;
  indirizzo_azienda: string;
  civico_azienda: string;
  cap_azienda: string;
  comune_azienda: string;
  provincia_azienda: string;
  rui_azienda: string;
  data_iscrizione_azienda: string;
  telefono_azienda: string;
  fax_azienda: string;
  email_azienda: string;
  pec: string;

  //Altro
  note: string;
}

export const Form = (props: Contact6Props) => {
  const { button } = {
    ...Contact6Defaults,
    ...props,
  } as Props;

  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState<boolean | "indeterminate">(
    false
  );
  const [selectedItem, setSelectedItem] = useState("");

  const { register, handleSubmit, reset } = useForm<IFormInput>();

  const onSubmit = (data: IFormInput) => {
    setLoading(true);
    let templateParams = {};
    if (acceptTerms) {
      if (selectedItem === "persona-fisica") {
        templateParams = {
          ...data,
          tipologia: "Persona Fisica",
        };
      } else if (selectedItem === "ditta-individuale") {
        templateParams = {
          ...data,
          tipologia: "Ditta Individuale",
        };
      } else {
        templateParams = {
          ...data,
          tipologia: "Società",
        };
      }
      emailjs
        .send(
          import.meta.env.VITE_EMAIL_SERVICE_ID,
          import.meta.env.VITE_EMAIL_TEMPLATE_ID_ISCRIVITI,
          templateParams,
          import.meta.env.VITE_EMAIL_PUBLIC_KEY
        )
        .then(() => {
          reset();
          setLoading(false);
        });
    } else {
      setLoading(false);
      alert("Accept the Privacy!");
    }
  };

  const tipologia = [
    { value: "società", label: "Società" },
    { value: "ditta-individuale", label: "Ditta Individuale" },
    { value: "persona-fisica", label: "Persona Fisica" },
  ];

  return (
    <section className="px-[5%] pt-36 md:pt-42 md:pt-50 pb-18 md:pb-20 md:pb-25 bg-background1">
      <div className="container flex items-center justify-center gap-y-12 md:gap-x-12 lg:gap-x-20 lg:gap-y-16">
        <form
          className="grid grid-cols-1 grid-rows-[auto_auto] gap-6"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Select */}
          <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
            <Label className="mb-2 font-bold pt-4">Tipologia</Label>
            <div className="py-[5%]">
              <Select onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona una tipologia..." />
                </SelectTrigger>
                <SelectContent>
                  {tipologia.map((tipo) => (
                    <SelectItem
                      key={tipo.value}
                      value={tipo.value}
                      onClick={() => setSelectedItem(tipo.value)}
                    >
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {selectedItem === "persona-fisica" ? (
            <>
              {/* Dati Anagrafici */}
              <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
                <Label className="mb-2 font-bold pt-4">Dati Anagrafici</Label>
                <section className="py-[5%] grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* -> Cognome */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.cognome.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.cognome.id}
                      {...register("cognome", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Nome */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.nome.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.nome.id}
                      {...register("nome", { required: true })}
                      required
                    />
                  </div>
                  {/* -> CF */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.cf.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.cf.id}
                      {...register("cf", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Data Nascita */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.dataNascita.label}
                    </Label>
                    <Input
                      type="date"
                      id={datiAnagrafici.dataNascita.id}
                      {...register("data_nascita", { required: true })}
                    />
                  </div>
                  {/* -> Luogo Nascita */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.luogoNascita.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.luogoNascita.id}
                      {...register("luogo_nascita", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Via, Corso */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.viaCorso.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.viaCorso.id}
                      {...register("via_corso", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Indirizzo */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.indirizzo.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.indirizzo.id}
                      {...register("indirizzo", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Civico */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.civico.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.civico.id}
                      {...register("civico", { required: true })}
                      required
                    />
                  </div>
                  {/* -> CAP */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.cap.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.cap.id}
                      {...register("cap", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Comune */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.comune.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.comune.id}
                      {...register("comune", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Provincia */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.provincia.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.provincia.id}
                      {...register("provincia", { required: true })}
                      required
                    />
                  </div>
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.rui.id}
                      {...register("rui", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Data Iscrizione */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.dataIscrizione.label}
                    </Label>
                    <Input
                      type="date"
                      id={datiAnagrafici.dataIscrizione.id}
                      {...register("data_iscrizione", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Telefono */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.telefono.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.telefono.id}
                      {...register("telefono", { required: true })}
                    />
                  </div>
                  {/* -> Cellulare */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.cellulare.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.cellulare.id}
                      {...register("cellulare", { required: true })}
                      required
                    />
                  </div>
                  {/* -> Email */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.email.label}</Label>
                    <Input
                      type="email"
                      id={datiAnagrafici.email.id}
                      {...register("email", { required: true })}
                      required
                    />
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              {/* Dati Azienda */}
              <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
                <Label className="mb-2 font-bold pt-4">Dati Azienda</Label>
                <section className="py-[5%] grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* -> Ragione sociale */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAzienda.ragioneSociale.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAzienda.ragioneSociale.id}
                      {...register("ragione_sociale", { required: true })}
                    />
                  </div>
                  {/* -> P. Iva */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.pIva.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.pIva.id}
                      {...register("piva", { required: true })}
                    />
                  </div>
                  {/* -> Via, Corso */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.viaCorso.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.viaCorso.id}
                      {...register("via_corso_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Indirizzo */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAzienda.indirizzo.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAzienda.indirizzo.id}
                      {...register("indirizzo_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Civico */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.civico.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.civico.id}
                      {...register("civico_azienda", { required: true })}
                    />
                  </div>
                  {/* -> CAP */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.cap.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.cap.id}
                      {...register("cap_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Comune */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.comune.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.comune.id}
                      {...register("comune_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Provincia */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAzienda.provincia.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAzienda.provincia.id}
                      {...register("provincia_azienda", { required: true })}
                    />
                  </div>
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.rui.id}
                      {...register("rui_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Data Iscrizione Azienda */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAzienda.dataIscrizione.label}
                    </Label>
                    <Input
                      type="date"
                      id={datiAzienda.dataIscrizione.id}
                      {...register("data_iscrizione_azienda", {
                        required: true,
                      })}
                    />
                  </div>
                  {/* -> Telefono */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.telefono.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.telefono.id}
                      {...register("telefono_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Fax */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.fax.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.fax.id}
                      {...register("fax_azienda")}
                    />
                  </div>
                  {/* -> E-mail */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.email.label}</Label>
                    <Input
                      type="email"
                      id={datiAzienda.email.id}
                      {...register("email_azienda", { required: true })}
                    />
                  </div>
                  {/* -> PEC */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.pec.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.pec.id}
                      {...register("pec")}
                    />
                  </div>
                </section>
              </div>
              {/* Dati Responsabile */}
              <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
                <Label className="mb-2 font-bold pt-4">Dati Responsabile</Label>
                <section className="py-[5%] grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* -> Cognome */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.cognome.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiResponsabile.cognome.id}
                      {...register("cognome", { required: true })}
                    />
                  </div>
                  {/* -> Nome */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.nome.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiResponsabile.nome.id}
                      {...register("nome", { required: true })}
                    />
                  </div>
                  {/* -> CF */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiResponsabile.cf.label}</Label>
                    <Input
                      type="text"
                      id={datiResponsabile.cf.id}
                      {...register("cf", { required: true })}
                    />
                  </div>
                  {/* -> Data Nascita */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.dataNascita.label}
                    </Label>
                    <Input
                      type="date"
                      id={datiResponsabile.dataNascita.id}
                      {...register("data_nascita", { required: true })}
                    />
                  </div>
                  {/* -> Luogo Nascita */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.luogoNascita.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiResponsabile.luogoNascita.id}
                      {...register("luogo_nascita", { required: true })}
                    />
                  </div>
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiResponsabile.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiResponsabile.rui.id}
                      {...register("rui", { required: true })}
                    />
                  </div>
                  {/* -> Data Iscrizione */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.dataIscrizione.label}
                    </Label>
                    <Input
                      type="date"
                      id={datiResponsabile.dataIscrizione.id}
                      {...register("data_iscrizione", { required: true })}
                    />
                  </div>
                  {/* -> Telefono */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.telefono.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiResponsabile.telefono.id}
                      {...register("telefono")}
                    />
                  </div>
                  {/* -> Cellulare */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.cellulare.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiResponsabile.cellulare.id}
                      {...register("cellulare", { required: true })}
                    />
                  </div>
                  {/* -> Email */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiResponsabile.email.label}
                    </Label>
                    <Input
                      type="email"
                      id={datiResponsabile.email.id}
                      {...register("email", { required: true })}
                    />
                  </div>
                </section>
              </div>
            </>
          )}

          <div className="grid w-full items-center">
            <Label htmlFor="message" className="mb-2">
              Note
            </Label>
            <Input type="text" id="note" {...register("note")} />
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
                  <p className="font-semibold underline decoration-text cursor-pointer hover:decoration-orangeHover underline-offset-1 hover:text-orangeHover ">
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

          <div>
            <Button disabled={loading} type="submit">
              {button.title}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export const Contact6Defaults: Contact6Props = {
  button: { title: "Submit" },
};
