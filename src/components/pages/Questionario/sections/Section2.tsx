import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import DataTable from "../utils/datagrid";
import { useForm } from "../FormContext";

const Section2 = ({ errors }: { errors: { [key: string]: string | null } }) => {
  const { formState, dispatch } = useForm();
  const [eventiNegliUltimi10Anni, setEventiNegliUltimi10Anni] = useState("");
  const [migliorieApportate, setMigliorieApportate] = useState("");

  /* const validateForm = (): boolean => {
    const errors: { [key: string]: string | null } = {};
    let hasErrors = false;

    // Validate fields
    if (!formState.section2.indirizzoCompleto.trim()) {
      errors.indirizzoCompleto = "Indirizzo completo non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.annoCostruzione.trim()) {
      errors.annoCostruzione =
        "Anno di costruzione del fabbricato non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.annoRistrutturazione.trim()) {
      errors.annoRistrutturazione =
        "Anno di ristrutturazione antisismica non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.superficieTotale.trim()) {
      errors.superficieTotale = "Superficie Totale non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.superficieCoperta.trim()) {
      errors.superficieCoperta =
        "Superficie Coperta in pianta non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.numeroPianiTotali.trim()) {
      errors.numeroPianiTotali = "Numero piani totali non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.numeroPianiAttività.trim()) {
      errors.numeroPianiAttività =
        "Numero di piani su cui si sviluppa l’attività non può essere vuoto";
      hasErrors = true;
    }

    // Dispatch errors to the state
    dispatch({ type: "SET_ERRORS", payload: errors });

    // If there are errors, show them in an alert
    if (hasErrors) {
      let errorMessage = "Please fix the following errors:\n\n";
      for (const key in errors) {
        if (errors[key]) {
          errorMessage += `${errors[key]}\n`;
        }
      }
      toast.error("Error");
      alert(errorMessage); // Show the errors in an alert
    }

    return !hasErrors;
  }; */

  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl">
      <div>
        <div className="flex flex-col gap-4 mb-4">
          <h1 className="font-bold py-4 text-xl">
            Sezione 2: Informazioni sull'Ubicazione del Rischio
          </h1>
          <div className="mb-8">
            <h2 className="italic text-md text-orange">Ubicazione:</h2>
            <div className="grid grid-cols-1 md:grid-cols-3  gap-4">
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Indirizzo completo</Label>
                <Input
                  type="text"
                  value={formState.section2.indirizzoCompleto}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: { indirizzoCompleto: e.target.value },
                    })
                  }
                  className={`col-span-3 ${
                    errors.indirizzoCompleto ? "border-red-500 border-2" : ""
                  }`}
                  required
                />
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Anno di costruzione del fabbricato
                </Label>
                <Input
                  type="number"
                  value={formState.section2.annoCostruzione}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: { annoCostruzione: e.target.value },
                    })
                  }
                  className={`col-span-3 ${
                    errors.annoCostruzione ? "border-red-500 border-2" : ""
                  }`}
                  required
                  min="1900"
                />
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Anno di ristrutturazione antisismica (se intervenuta)
                </Label>
                <Input
                  type="number"
                  value={formState.section2.annoRistrutturazione}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: { annoRistrutturazione: e.target.value },
                    })
                  }
                  className={`col-span-3 ${
                    errors.annoRistrutturazione ? "border-red-500 border-2" : ""
                  }`}
                  required
                  min="1900"
                />
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Fabbricato</Label>
                <Select
                  onValueChange={(value) =>
                    dispatch({
                      type: "section2",
                      payload: { fabbricato: value },
                    })
                  }
                  defaultValue="proprieta"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una tipologia..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proprieta">Proprietà</SelectItem>
                    <SelectItem value="locazione">Locazione</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Superficie totale (area coperta + scoperta in mq)
                </Label>
                <Input
                  type="number"
                  value={formState.section2.superficieTotale}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: { superficieTotale: e.target.value },
                    })
                  }
                  className={`col-span-3 ${
                    errors.superficieTotale ? "border-red-500 border-2" : ""
                  }`}
                  required
                  min="1"
                  step=".01"
                />
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Superficie coperta in pianta (mq)
                </Label>
                <Input
                  type="number"
                  value={formState.section2.superficieCoperta}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: { superficieCoperta: e.target.value },
                    })
                  }
                  className={`col-span-3 ${
                    errors.superficieCoperta ? "border-red-500 border-2" : ""
                  }`}
                  required
                  min="1"
                  step=".01"
                />
              </div>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="italic text-md text-orange">
              Caratteristiche costruttive:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Numero piani totali (fuori terra)
                </Label>
                <Input
                  type="number"
                  value={formState.section2.numeroPianiTotali}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: { numeroPianiTotali: e.target.value },
                    })
                  }
                  className={`col-span-3 ${
                    errors.numeroPianiTotali ? "border-red-500 border-2" : ""
                  }`}
                  required
                  min="1"
                />
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Piani seminterrati/interrati</Label>
                <Select
                  onValueChange={(value) =>
                    dispatch({
                      type: "section2",
                      payload: { pianiSeminterrati: value },
                    })
                  }
                  defaultValue="no"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una tipologia..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="si">Si</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Piano più basso occupato dall’attività
                </Label>
                <Select
                  onValueChange={(value) =>
                    dispatch({
                      type: "section2",
                      payload: { pianoPiuBasso: value },
                    })
                  }
                  defaultValue="seminterrato"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una tipologia..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seminterrato">Seminterrato</SelectItem>
                    <SelectItem value="pianoStrada">Piano Strada</SelectItem>
                    <SelectItem value="primoPiano">Primo Piano</SelectItem>
                    <SelectItem value="altri">
                      Altri piani superiori al primo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Numero di piani su cui si sviluppa l’attività
                </Label>
                <Input
                  type="number"
                  value={formState.section2.numeroPianiAttività}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: { numeroPianiAttività: e.target.value },
                    })
                  }
                  className={`col-span-3 ${
                    errors.numeroPianiAttività ? "border-red-500 border-2" : ""
                  }`}
                  required
                  min="1"
                />
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Intero fabbricato assicurato</Label>
                <Select
                  onValueChange={(value) =>
                    dispatch({
                      type: "section2",
                      payload: { fabbricatoAssicurato: value },
                    })
                  }
                  defaultValue="no"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una tipologia..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="si">SI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Struttura antisismica</Label>
                <Select
                  onValueChange={(value) =>
                    dispatch({
                      type: "section2",
                      payload: { strutturaAntisismica: value },
                    })
                  }
                  defaultValue="no"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una tipologia..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="si">SI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="mb-8">
            <h2 className="italic text-md text-orange">Eventi passati:</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Eventi sismici, alluvioni, frane negli ultimi 10 anni
                </Label>
                <Select
                  onValueChange={(value) => {
                    setEventiNegliUltimi10Anni(value);
                    dispatch({
                      type: "section2",
                      payload: { eventiNegliUltimi10Anni: value },
                    });
                  }}
                  defaultValue="no"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="si">Si</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {eventiNegliUltimi10Anni === "si" && (
              <div className="flex flex-col col-span-3">
                <DataTable />
              </div>
            )}
          </div>

          <div className="mb-8">
            <h2 className="italic text-md text-orange">Migliorie apportate:</h2>
            <Label>
              Descrivere interventi migliorativi (es. ancoraggio macchinari,
              rinforzi antisismici):
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="py-2 flex flex-col">
                <Select
                  onValueChange={(value) => {
                    setMigliorieApportate(value);
                    dispatch({
                      type: "section2",
                      payload: { migliorieApportate: value },
                    });
                  }}
                  defaultValue="no"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="si">Si</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {migliorieApportate === "si" && (
                <Input
                  type="text"
                  value={formState.section2.descrizioneMigliorieApportate}
                  onChange={(e) =>
                    dispatch({
                      type: "section2",
                      payload: {
                        descrizioneMigliorieApportate: e.target.value,
                      },
                    })
                  }
                  className="col-span-1 md:col-span-2 my-2"
                  required
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section2;
