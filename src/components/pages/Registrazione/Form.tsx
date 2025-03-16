import { useEffect, useState } from "react";
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
import {
  datiAnagrafici,
  datiAzienda,
  datiResponsabile,
  datiDittaIndividuale,
} from "./inputs";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import TerminiDiServizio from "../Legali/TerminiDiServizio";
import { useForm } from "react-hook-form";
import { provincetypes, comunitypes, toponomie } from "./types/types";

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

  async function getProvince() {
    try {
      const requestOptions = {
        method: "GET",
        headers: {
          accept: "application/json",
        },
      };

      const response = await fetch(
        "https://devops.mobilityexpress.it/apiAdr/elencoProvince",
        requestOptions
      );
      const responseData = await response.json();
      if (responseData.status !== 1) {
        console.log("Errore nel chiamare l'API delle Province");
      }
      setProvince(responseData.data);
    } catch (err) {
      console.log(err);
    }
  }

  async function apiComuni(provinciaSigla: string) {
    setComuni([]);
    try {
      const options = {
        method: "GET",
        headers: { accept: "application/json" },
      };
      const response = await fetch(
        `https://devops.mobilityexpress.it/apiAdr/elencoComuni/${provinciaSigla}`,
        options
      );
      const responseData = await response.json();
      if (responseData.status !== 1) {
        console.log("Errore nel chiamare l'API dei Comuni");
      }
      setComuni(responseData.data[0]);
    } catch (err) {
      console.log(err);
    }
  }

  async function elencoToponomie() {
    try {
      const options = {
        method: "GET",
        headers: { accept: "application/json" },
      };
      const response = await fetch(
        "https://devops.mobilityexpress.it/apiAdr/elencoToponomie",
        options
      );
      const responseData = await response.json();
      if (responseData.status !== 1) {
        console.log("Errore nel chiamare l'API dei Comuni");
      }
      setToponomie(responseData.data);
    } catch (err) {
      console.log(err);
    }
  }

  const handleComuni = (provinciaSigla: string) => {
    setCap([]);
    apiComuni(provinciaSigla);
    for (let i = 0; i < province.length; i++) {
      const element: provincetypes = province[i];
      if (element.sigla === provinciaSigla) {
        setProvincia(element.nome);
      }
    }
  };

  const handleCap = (codice: string) => {
    comuni.map((comune: any) => {
      if (comune.codice === codice) {
        setCap(comune.cap);
        if (comune.cap.length > 1) {
          setLengthCap(true);
        } else {
          setLengthCap(false);
          setDefaultCap(comune.cap[0]);
          setCapS(comune.cap[0]);
        }
      }
    });
    for (let i = 0; i < comuni.length; i++) {
      const element: comunitypes = comuni[i];
      if (element.codice === codice) {
        setComune(element.comune);
        if (cap.length === 1) {
          setCapS(defaultCap);
        }
      }
    }
  };

  useEffect(() => {
    getProvince();
    elencoToponomie();
  }, []);

  const selectCap = (capValue: string) => {
    if (cap.length === 1) {
      setCapS(capValue);
    } else {
      for (let i = 0; i < cap.length; i++) {
        const element = cap[i];
        if (element === capValue) {
          setCapS(element);
        }
      }
    }
  };

  const [loading, setLoading] = useState(false);
  const [province, setProvince] = useState([]);
  const [comuni, setComuni] = useState([]);
  const [cap, setCap] = useState([]);
  const [defaultCap, setDefaultCap] = useState("");
  const [toponomie, setToponomie] = useState([]);
  const [lengthCap, setLengthCap] = useState(false);
  const [provincia, setProvincia] = useState("");
  const [comune, setComune] = useState("");
  const [capS, setCapS] = useState("");
  const [viaCorso, setViaCorso] = useState("");

  const [acceptTerms, setAcceptTerms] = useState<boolean | "indeterminate">(
    false
  );
  const [selectedItem, setSelectedItem] = useState("società");
  const { register, handleSubmit, reset } = useForm<IFormInput>();

  const onSubmit = (data: IFormInput) => {
    setLoading(true);
    console.log(provincia);
    let templateParams = {};
    if (acceptTerms) {
      if (selectedItem === "persona-fisica") {
        templateParams = {
          tipologia: "Persona Fisica",
          cognome: data.cognome,
          nome: data.nome,
          cf: data.cf,
          provincia: provincia,
          comune: comune,
          cap: capS,
          viaCorso: viaCorso,
          indirizzo: data.indirizzo,
          civico: data.civico,
          rui: data.rui,
          cellulare: data.cellulare,
          email: data.email,
          note: data.note,
        };
      } else if (selectedItem === "ditta-individuale") {
        templateParams = {
          tipologia: "Ditta Individuale",
          ragioneSociale: data.ragione_sociale,
          cognome: data.cognome,
          nome: data.nome,
          cf: data.cf,
          pIva: data.piva,
          ruiAzienda: data.rui_azienda,
          provincia: provincia,
          comune: comune,
          cap: capS,
          viaCorso: viaCorso,
          indirizzo: data.indirizzo_azienda,
          civico: data.civico_azienda,
          cellulare: data.cellulare,
          email: data.email_azienda,
          fax: data.fax_azienda,
          pec: data.pec,
          note: data.note,
        };
      } else {
        templateParams = {
          tipologia: "Società",
          ragioneSociale: data.ragione_sociale,
          pIva: data.piva,
          provincia: provincia,
          comune: comune,
          cap: capS,
          viaCorso: viaCorso,
          indirizzo: data.indirizzo_azienda,
          civico: data.civico_azienda,
          ruiAzienda: data.rui_azienda,
          telefonoAzienda: data.telefono_azienda,
          fax: data.fax_azienda,
          emailAzienda: data.email_azienda,
          pec: data.pec,
          cognome: data.cognome,
          nome: data.nome,
          cf: data.cf,
          rui: data.rui,
          telefono: data.telefono,
          cellulare: data.cellulare,
          email: data.email,
          note: data.note,
        };
      }
      console.log(templateParams);
      reset();
      setLoading(false);
      setComuni([]);
      setCap([]);
      setProvincia("");
      setComune("");
      setCapS("");
      setViaCorso("");
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
          className="grid grid-cols-1 grid-rows-[auto_auto] gap-6 w-full"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Select */}
          <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
            <Label className="mb-2 font-bold pt-4">Tipologia</Label>
            <div className="py-[5%]">
              <Select onValueChange={setSelectedItem} defaultValue="società">
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
              {/* Persona Fisica / Dati Anagrafici */}
              <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
                <Label className="mb-2 font-bold pt-4">Dati Anagrafici</Label>
                <section className="py-[5%] grid grid-cols-2 md:grid-cols-3 gap-4 gap-x-8">
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
                  {/* -> Provincia */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.provincia.label}
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        handleComuni(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        {province?.map((provincia: provincetypes) => (
                          <SelectItem
                            value={provincia.sigla}
                            key={provincia.sigla}
                          >
                            {provincia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> Comune */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.comune.label}
                    </Label>
                    <Select onValueChange={(value) => handleCap(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il comune" />
                      </SelectTrigger>
                      <SelectContent>
                        {comuni.map((comune: comunitypes) => (
                          <SelectItem key={comune.codice} value={comune.codice}>
                            {comune.comune}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> CAP */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.cap.label}</Label>
                    <Select
                      value={!lengthCap ? defaultCap : undefined}
                      onValueChange={(value) => selectCap(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il cap" />
                      </SelectTrigger>
                      <SelectContent>
                        {cap.map((capValue) => (
                          <SelectItem key={capValue} value={capValue}>
                            {capValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> Via, Corso */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.viaCorso.label}
                    </Label>
                    <Select onValueChange={(value) => setViaCorso(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la Via o il Corso" />
                      </SelectTrigger>
                      <SelectContent>
                        {toponomie?.map((toponomia: toponomie) => (
                          <SelectItem
                            value={toponomia.name}
                            key={toponomia.value}
                          >
                            {toponomia.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
          ) : selectedItem === "ditta-individuale" ? (
            <>
              {/* Ditta Individuale / Dati Azienda */}
              <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
                <Label className="mb-2 font-bold pt-4">Dati Azienda</Label>
                <section className="py-[5%] grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* -> Ragione sociale */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.ragioneSociale.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.ragioneSociale.id}
                      {...register("ragione_sociale", { required: true })}
                      className=""
                    />
                  </div>
                  {/* -> Cognome */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.cognome.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.cognome.id}
                      {...register("cognome", { required: true })}
                      className=""
                    />
                  </div>
                  {/* -> Nome */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.nome.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.nome.id}
                      {...register("nome", { required: true })}
                      className=""
                    />
                  </div>
                  {/* -> CF */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.cf.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.cf.id}
                      {...register("cf", { required: true })}
                      className=""
                    />
                  </div>
                  {/* -> P. Iva */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.pIva.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.pIva.id}
                      {...register("piva", { required: true })}
                    />
                  </div>
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.rui.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.rui.id}
                      {...register("rui_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Provincia */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.provincia.label}
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        handleComuni(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        {province?.map((provincia: provincetypes) => (
                          <SelectItem
                            value={provincia.sigla}
                            key={provincia.sigla}
                          >
                            {provincia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> Comune */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.comune.label}
                    </Label>
                    <Select onValueChange={(value) => handleCap(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il comune" />
                      </SelectTrigger>
                      <SelectContent>
                        {comuni.map((comune: comunitypes) => (
                          <SelectItem key={comune.codice} value={comune.codice}>
                            {comune.comune}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> CAP */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.cap.label}</Label>
                    <Select
                      value={!lengthCap ? defaultCap : undefined}
                      onValueChange={(value) => selectCap(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il cap" />
                      </SelectTrigger>
                      <SelectContent>
                        {cap.map((capValue) => (
                          <SelectItem key={capValue} value={capValue}>
                            {capValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> Via, Corso */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.viaCorso.label}
                    </Label>
                    <Select onValueChange={(value) => setViaCorso(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la Via o il Corso" />
                      </SelectTrigger>
                      <SelectContent>
                        {toponomie?.map((toponomia: toponomie) => (
                          <SelectItem
                            value={toponomia.name}
                            key={toponomia.value}
                          >
                            {toponomia.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> Indirizzo */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.indirizzo.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.indirizzo.id}
                      {...register("indirizzo_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Civico */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.civico.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAzienda.civico.id}
                      {...register("civico_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Cellulare */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.cellulare.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.cellulare.id}
                      {...register("cellulare", { required: true })}
                    />
                  </div>
                  {/* -> E-mail */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.email.label}
                    </Label>
                    <Input
                      type="email"
                      id={datiDittaIndividuale.email.id}
                      {...register("email_azienda", { required: true })}
                    />
                  </div>
                  {/* -> Fax */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.fax.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.fax.id}
                      {...register("fax_azienda")}
                    />
                  </div>
                  {/* -> PEC */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiDittaIndividuale.pec.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiDittaIndividuale.pec.id}
                      {...register("pec")}
                    />
                  </div>
                </section>
              </div>
            </>
          ) : (
            <>
              {/* Società / Dati Azienda */}
              <div className="grid w-full items-center bg-background2 px-[5%] rounded-xl">
                <Label className="mb-2 font-bold pt-4">Dati Azienda</Label>
                <section className="py-[5%] grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* -> Ragione sociale */}
                  <div className="py-2 flex flex-col col-span-2">
                    <Label className="mb-2">
                      {datiAzienda.ragioneSociale.label}
                    </Label>
                    <Input
                      type="text"
                      id={datiAzienda.ragioneSociale.id}
                      {...register("ragione_sociale", { required: true })}
                      className=""
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
                  {/* -> Provincia */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.provincia.label}
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        handleComuni(value);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la provincia" />
                      </SelectTrigger>
                      <SelectContent>
                        {province?.map((provincia: provincetypes) => (
                          <SelectItem
                            value={provincia.sigla}
                            key={provincia.sigla}
                          >
                            {provincia.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> Comune */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.comune.label}
                    </Label>
                    <Select onValueChange={(value) => handleCap(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il comune" />
                      </SelectTrigger>
                      <SelectContent>
                        {comuni.map((comune: comunitypes) => (
                          <SelectItem key={comune.codice} value={comune.codice}>
                            {comune.comune}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> CAP */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAnagrafici.cap.label}</Label>
                    <Select
                      value={!lengthCap ? defaultCap : undefined}
                      onValueChange={(value) => selectCap(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona il cap" />
                      </SelectTrigger>
                      <SelectContent>
                        {cap.map((capValue) => (
                          <SelectItem key={capValue} value={capValue}>
                            {capValue}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {/* -> Via, Corso */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">
                      {datiAnagrafici.viaCorso.label}
                    </Label>
                    <Select onValueChange={(value) => setViaCorso(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona la Via o il Corso" />
                      </SelectTrigger>
                      <SelectContent>
                        {toponomie?.map((toponomia: toponomie) => (
                          <SelectItem
                            value={toponomia.name}
                            key={toponomia.value}
                          >
                            {toponomia.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiAzienda.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiAzienda.rui.id}
                      {...register("rui_azienda", { required: true })}
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
              {/* Società / Dati Responsabile */}
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
                  {/* -> RUI */}
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">{datiResponsabile.rui.label}</Label>
                    <Input
                      type="text"
                      id={datiResponsabile.rui.id}
                      {...register("rui", { required: true })}
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

          <div className="grid w-full items-center bg-background2 px-[5%] py-[2.5%] rounded-xl">
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
                <DialogContent className="h-[500px] overflow-auto">
                  <h1 className=" mb-5 text-3xl font-bold md:mb-6 md:text-4xl lg:text-5xl">
                    Termini di Servizio
                  </h1>
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

//Mettere le impostazioni delle provincie e del resto anche a tutte le altre scelte
