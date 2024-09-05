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

type Props = {
  tagline: string;
  heading: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  button: ButtonProps;
};

export type Contact6Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Form = (props: Contact6Props) => {
  const { button } = {
    ...Contact6Defaults,
    ...props,
  } as Props;

  // Stati Dati Azienda
  const [ragioneSociale, setRagioneSociale] = useState("");
  const [pIva, setPIva] = useState("");
  const [viaCorso, setViaCorso] = useState("");
  const [indirizzo, setIndirizzo] = useState("");
  const [civico, setCivico] = useState("");
  const [cap, setCAP] = useState("");
  const [comune, setComune] = useState("");
  const [provincia, setProvincia] = useState("");
  const [RUIAzienda, setRUIAzienda] = useState("");
  const [dataIscrizioneAzienda, setDataIscrizioneAzienda] = useState("");
  const [telefonoAzienda, setTelefonoAzienda] = useState("");
  const [fax, setFax] = useState("");
  const [emailAzienda, setEmailAzienda] = useState("");
  const [pec, setPEC] = useState("");

  // Stati Dati Responsabile
  const [cognome, setCognome] = useState("");
  const [nome, setNome] = useState("");
  const [cf, setCf] = useState("");
  const [dataNascita, setDataNascita] = useState("");
  const [luogoNascita, setLuogoNascita] = useState("");
  const [RUIResponsabile, setRUIResponsabile] = useState("");
  const [dataIscrizioneResponsabile, setdataIscrizioneResponsabile] =
    useState("");
  const [telefonoResponsabile, setTelefonoResponsabile] = useState("");
  const [cellulare, setCellulare] = useState("");
  const [emailResponsabile, setEmailResponsabile] = useState("");

  const [selectedItem, setSelectedItem] = useState("");
  const [note, setNote] = useState("");
  const [acceptTerms, setAcceptTerms] = useState<boolean | "indeterminate">(
    false
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    console.log({
      selectedItem,
      note,
      acceptTerms,
    });
  };

  const tipologia = [
    { value: "società", label: "Società" },
    { value: "ditta-individuale", label: "Ditta Individuale" },
    { value: "persona-fisica", label: "Persona Fisica" },
  ];

  function setValueDatiAzienda(e: string, id: string) {
    switch (id) {
      case "ragione-sociale":
        setRagioneSociale(e);
        break;
      case "p-iva":
        setPIva(e);
        break;
      case "via-corso":
        setViaCorso(e);
        break;
      case "indirizzo":
        setIndirizzo(e);
        break;
      case "civico":
        setCivico(e);
        break;
      case "cap":
        setCAP(e);
        break;
      case "comune":
        setComune(e);
        break;
      case "provincia":
        setProvincia(e);
        break;
      case "rui":
        setRUIAzienda(e);
        break;
      case "data-IscrizioneAzienda-azienda":
        setDataIscrizioneAzienda(e);
        break;
      case "telefono-azienda":
        setTelefonoAzienda(e);
        break;
      case "fax":
        setFax(e);
        break;
      case "email-azienda":
        setEmailAzienda(e);
        break;
      case "pec":
        setPEC(e);
        break;
      default:
        break;
    }
  }

  function setValueDatiResponsabile(e: string, id: string) {
    switch (id) {
      case "cognome":
        setCognome(e);
        break;
      case "nome":
        setNome(e);
        break;
      case "cf":
        setCf(e);
        break;
      case "data-nascita":
        setDataNascita(e);
        break;
      case "luogo-nascita":
        setLuogoNascita(e);
        break;
      case "rui":
        setRUIResponsabile(e);
        break;
      case "data-iscrizione-responsabile":
        setdataIscrizioneResponsabile(e);
        break;
      case "telefono-responsabile":
        setTelefonoResponsabile(e);
        break;
      case "cellulare":
        setCellulare(e);
        break;
      case "e-mail-responsabile":
        setEmailResponsabile(e);
        break;

      default:
        break;
    }
  }

  function setValueDatiAnagrafici(e: string, id: string) {
    switch (id) {
      case "cognome":
        setCognome(e);
        break;
      case "nome":
        setNome(e);
        break;
      case "cf":
        setCf(e);
        break;
      case "data-nascita":
        setDataNascita(e);
        break;
      case "luogo-nascita":
        setLuogoNascita(e);
        break;
      case "via-corso":
        setViaCorso(e);
        break;
      case "indirizzo":
        setIndirizzo(e);
        break;
      case "civico":
        setCivico(e);
        break;
      case "cap":
        setCAP(e);
        break;
      case "comune":
        setComune(e);
        break;
      case "provincia":
        setProvincia(e);
        break;
      case "rui":
        setRUIResponsabile(e);
        break;
      case "data-iscrizione":
        setdataIscrizioneResponsabile(e);
        break;
      case "telefono":
        setTelefonoResponsabile(e);
        break;
      case "cellulare":
        setCellulare(e);
        break;
      case "e-mail":
        setEmailResponsabile(e);
        break;

      default:
        break;
    }
  }

  return (
    <section className="px-[5%] pt-36 md:pt-42 md:pt-50 pb-18 md:pb-20 md:pb-25 bg-background1">
      <div className="container flex items-center justify-center gap-y-12 md:gap-x-12 lg:gap-x-20 lg:gap-y-16">
        <form
          className="grid grid-cols-1 grid-rows-[auto_auto] gap-6"
          onSubmit={handleSubmit}
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
                      value={cognome}
                      onChange={(e) =>
                        setValueDatiAnagrafici(
                          e.target.value,
                          datiAnagrafici.cognome.id
                        )
                      }
                      required
                    />
                  </div>
                  {/* -> Nome */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.nome.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.nome.id}
                      value={nome}
                      onChange={(e) =>
                        setValueDatiAnagrafici(
                          e.target.value,
                          datiAnagrafici.nome.id
                        )
                      }
                      required
                    />
                  </div>
                  {/* -> CF */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.cf.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.cf.id}
                      value={cf}
                      onChange={(e) =>
                        setValueDatiAnagrafici(
                          e.target.value,
                          datiAnagrafici.cf.id
                        )
                      }
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
                      value={dataNascita}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.dataNascita.id
                        )
                      }
                      required
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
                      value={luogoNascita}
                      onChange={(e) =>
                        setValueDatiAnagrafici(
                          e.target.value,
                          datiAnagrafici.luogoNascita.id
                        )
                      }
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
                      value={viaCorso}
                      onChange={(e) =>
                        setValueDatiAnagrafici(
                          e.target.value,
                          datiAnagrafici.viaCorso.id
                        )
                      }
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
                      value={indirizzo}
                      onChange={(e) =>
                        setValueDatiAnagrafici(
                          e.target.value,
                          datiAnagrafici.indirizzo.id
                        )
                      }
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
                      value={civico}
                      onChange={(e) =>
                        setValueDatiAnagrafici(
                          e.target.value,
                          datiAnagrafici.civico.id
                        )
                      }
                      required
                    />
                  </div>
                  {/* -> CAP */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.cap.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.cap.id}
                      value={cap}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.cap.id
                        )
                      }
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
                      value={comune}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.comune.id
                        )
                      }
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
                      value={provincia}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.provincia.id
                        )
                      }
                      required
                    />
                  </div>
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiAnagrafici.rui.id}
                      value={RUIResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.rui.id
                        )
                      }
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
                      value={dataIscrizioneResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.dataIscrizione.id
                        )
                      }
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
                      value={telefonoResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.telefono.id
                        )
                      }
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
                      value={cellulare}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.cellulare.id
                        )
                      }
                      required
                    />
                  </div>
                  {/* -> Email */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.email.label}</Label>
                    <Input
                      type="email"
                      id={datiAnagrafici.email.id}
                      value={emailResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiAnagrafici.email.id
                        )
                      }
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
                      value={ragioneSociale}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.ragioneSociale.id
                        )
                      }
                    />
                  </div>
                  {/* -> P. Iva */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.pIva.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.pIva.id}
                      value={pIva}
                      onChange={(e) =>
                        setValueDatiAzienda(e.target.value, datiAzienda.pIva.id)
                      }
                    />
                  </div>
                  {/* -> Via, Corso */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.viaCorso.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.viaCorso.id}
                      value={viaCorso}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.viaCorso.id
                        )
                      }
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
                      value={indirizzo}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.indirizzo.id
                        )
                      }
                    />
                  </div>
                  {/* -> Civico */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.civico.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.civico.id}
                      value={civico}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.civico.id
                        )
                      }
                    />
                  </div>
                  {/* -> CAP */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.cap.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.cap.id}
                      value={cap}
                      onChange={(e) =>
                        setValueDatiAzienda(e.target.value, datiAzienda.cap.id)
                      }
                    />
                  </div>
                  {/* -> Comune */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.comune.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.comune.id}
                      value={comune}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.comune.id
                        )
                      }
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
                      value={provincia}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.provincia.id
                        )
                      }
                    />
                  </div>
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.rui.id}
                      value={RUIAzienda}
                      onChange={(e) =>
                        setValueDatiAzienda(e.target.value, datiAzienda.rui.id)
                      }
                    />
                  </div>
                  {/* -> Data IscrizioneAzienda */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAzienda.dataIscrizione.label}
                    </Label>
                    <Input
                      type="date"
                      id={datiAzienda.dataIscrizione.id}
                      value={dataIscrizioneAzienda}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.dataIscrizione.id
                        )
                      }
                    />
                  </div>
                  {/* -> Telefono */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.telefono.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.telefono.id}
                      value={telefonoAzienda}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.telefono.id
                        )
                      }
                    />
                  </div>
                  {/* -> Fax */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.fax.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.fax.id}
                      value={fax}
                      onChange={(e) =>
                        setValueDatiAzienda(e.target.value, datiAzienda.fax.id)
                      }
                    />
                  </div>
                  {/* -> E-mail */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.email.label}</Label>
                    <Input
                      type="email"
                      id={datiAzienda.email.id}
                      value={emailAzienda}
                      onChange={(e) =>
                        setValueDatiAzienda(
                          e.target.value,
                          datiAzienda.email.id
                        )
                      }
                    />
                  </div>
                  {/* -> PEC */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.pec.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.pec.id}
                      value={pec}
                      onChange={(e) =>
                        setValueDatiAzienda(e.target.value, datiAzienda.pec.id)
                      }
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
                      value={cognome}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.cognome.id
                        )
                      }
                      required
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
                      value={nome}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.nome.id
                        )
                      }
                      required
                    />
                  </div>
                  {/* -> CF */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiResponsabile.cf.label}</Label>
                    <Input
                      type="text"
                      id={datiResponsabile.cf.id}
                      value={cf}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.cf.id
                        )
                      }
                      required
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
                      value={dataNascita}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.dataNascita.id
                        )
                      }
                      required
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
                      value={luogoNascita}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.luogoNascita.id
                        )
                      }
                      required
                    />
                  </div>
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiResponsabile.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiResponsabile.rui.id}
                      value={RUIResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.rui.id
                        )
                      }
                      required
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
                      value={dataIscrizioneResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.dataIscrizione.id
                        )
                      }
                      required
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
                      value={telefonoResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.telefono.id
                        )
                      }
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
                      value={cellulare}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.cellulare.id
                        )
                      }
                      required
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
                      value={emailResponsabile}
                      onChange={(e) =>
                        setValueDatiResponsabile(
                          e.target.value,
                          datiResponsabile.email.id
                        )
                      }
                      required
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
            <Input
              type="text"
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
            <Button>{button.title}</Button>
          </div>
        </form>
      </div>
    </section>
  );
};

export const Contact6Defaults: Contact6Props = {
  tagline: "Tagline",
  heading: "Contact us",
  description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
  email: "hello@relume.io",
  phone: "+1 (555) 000-0000",
  address: "123 Sample St, Sydney NSW 2000 AU",
  button: { title: "Submit" },
};
