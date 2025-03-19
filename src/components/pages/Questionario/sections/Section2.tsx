import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import DataTable from "../utils/datagrid";

const Section2 = ({
  errors,
  setFormLocale,
  formLocale,
}: {
  errors: { [key: string]: string | null };
  setFormLocale: any;
  formLocale: any;
}) => {
  const [eventiNegliUltimi10Anni, setEventiNegliUltimi10Anni] = useState(
    formLocale.section2.eventiNegliUltimi10Anni
  );
  const [migliorieApportate, setMigliorieApportate] = useState(
    formLocale.section2.migliorieApportate
  );

  useEffect(() => {
    if (formLocale.section2.eventiNegliUltimi10Anni === "no") {
      setFormLocale((prev: any) => ({
        ...prev,
        section2: {
          ...prev.section2,
          eventiNegliUltimi10AnniArray: [],
        },
      }));
    }
  }, [formLocale.section2.eventiNegliUltimi10Anni]);

  useEffect(() => {
    if (formLocale.section2.migliorieApportate === "no") {
      setFormLocale((prev: any) => ({
        ...prev,
        section2: {
          ...prev.section2,
          descrizioneMigliorieApportate: "",
        },
      }));
    }
  }, [formLocale.section2.migliorieApportate]);

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
                  value={formLocale.section2.indirizzoCompleto}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        indirizzoCompleto: e.target.value,
                      },
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
                  value={formLocale.section2.annoCostruzione}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        annoCostruzione: e.target.value,
                      },
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
                  value={formLocale.section2.annoRistrutturazione}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        annoRistrutturazione: e.target.value,
                      },
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
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        fabbricato: value,
                      },
                    })
                  }
                  value={formLocale.section2.fabbricato}
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
                  value={formLocale.section2.superficieTotale}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        superficieTotale: e.target.value,
                      },
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
                  value={formLocale.section2.superficieCoperta}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        superficieCoperta: e.target.value,
                      },
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
                  value={formLocale.section2.numeroPianiTotali}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        numeroPianiTotali: e.target.value,
                      },
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
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        pianiSeminterrati: value,
                      },
                    })
                  }
                  value={formLocale.section2.pianiSeminterrati}
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
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        pianoPiuBasso: value,
                      },
                    })
                  }
                  value={formLocale.section2.pianoPiuBasso}
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
                  value={formLocale.section2.numeroPianiAttività}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        numeroPianiAttività: e.target.value,
                      },
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
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        fabbricatoAssicurato: value,
                      },
                    })
                  }
                  value={formLocale.section2.fabbricatoAssicurato}
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
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        strutturaAntisismica: value,
                      },
                    })
                  }
                  value={formLocale.section2.strutturaAntisismica}
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
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        eventiNegliUltimi10Anni: value,
                      },
                    });
                  }}
                  value={eventiNegliUltimi10Anni}
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
              <div
                className={`col-span-3 flex flex-col ${
                  errors.eventiNegliUltimi10Anni
                    ? "border-red-500 border-2"
                    : ""
                }`}
              >
                <DataTable
                  setFormLocale={setFormLocale}
                  formLocale={formLocale}
                />
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
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
                        migliorieApportate: value,
                      },
                    });
                  }}
                  value={formLocale.section2.migliorieApportate}
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
                  value={formLocale.section2.descrizioneMigliorieApportate}
                  onChange={(e) =>
                    setFormLocale({
                      ...formLocale,
                      section2: {
                        ...formLocale.section2,
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
