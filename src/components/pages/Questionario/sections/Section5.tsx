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

const Section5 = ({
  errors,
  setFormLocale,
  formLocale,
}: {
  errors: { [key: string]: string | null };
  setFormLocale: any;
  formLocale: any;
}) => {
  const [presenzaCorsi, setPresenzaCorsi] = useState(
    formLocale.section5.corsiAcqua
  );

  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl">
      <div>
        <div className="flex flex-col gap-4 mb-4">
          <h1 className="font-bold py-4 text-xl">
            Sezione 5: Altre Informazioni
          </h1>
          <div className="mb-8">
            <h2 className="italic text-md text-orange">Rischio idrologico:</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Presenza di corsi d’acqua entro 2 km
                </Label>
                <Select
                  onValueChange={(value) => {
                    setPresenzaCorsi(value);
                    value === "no"
                      ? setFormLocale({
                          ...formLocale,
                          section5: {
                            ...formLocale.section5,
                            corsiAcqua: value,
                            corsiAcquaNome: "",
                            corsiAcquaDistanza: "",
                            corsiAcquaDislivello: "",
                          },
                        })
                      : setFormLocale({
                          ...formLocale,
                          section5: {
                            ...formLocale.section5,
                            corsiAcqua: value,
                          },
                        });
                  }}
                  value={formLocale.section5.corsiAcqua}
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
              {presenzaCorsi === "si" && (
                <>
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">Nome</Label>
                    <Input
                      type="text"
                      value={formLocale.section5.corsiAcquaNome}
                      onChange={(e) =>
                        setFormLocale({
                          ...formLocale,
                          section5: {
                            ...formLocale.section5,
                            corsiAcquaNome: e.target.value,
                          },
                        })
                      }
                      className={`col-span-3 ${
                        errors.corsiAcquaNome ? "border-red-500 border-2" : ""
                      }`}
                    />
                  </div>
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">Distanza</Label>
                    <Input
                      type="number"
                      value={formLocale.section5.corsiAcquaDistanza}
                      onChange={(e) =>
                        setFormLocale({
                          ...formLocale,
                          section5: {
                            ...formLocale.section5,
                            corsiAcquaDistanza: e.target.value,
                          },
                        })
                      }
                      className={`col-span-3 ${
                        errors.corsiAcquaDistanza
                          ? "border-red-500 border-2"
                          : ""
                      }`}
                      min="0"
                    />
                  </div>
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">Dislivello</Label>
                    <Input
                      type="number"
                      value={formLocale.section5.corsiAcquaDislivello}
                      onChange={(e) =>
                        setFormLocale({
                          ...formLocale,
                          section5: {
                            ...formLocale.section5,
                            corsiAcquaDislivello: e.target.value,
                          },
                        })
                      }
                      className={`col-span-3 ${
                        errors.corsiAcquaDislivello
                          ? "border-red-500 border-2"
                          : ""
                      }`}
                      min="0"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mb-8">
            <h2 className="italic text-md text-orange">Sicurezza impianti:</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="py-2 flex flex-col">
                <Label className="mb-2">
                  Scaffali/macchinari ancorati al suolo
                </Label>
                <Select
                  onValueChange={(value) => {
                    setFormLocale({
                      ...formLocale,
                      section5: {
                        ...formLocale.section5,
                        scaffaliSuolo: value,
                      },
                    });
                  }}
                  value={formLocale.section5.scaffaliSuolo}
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
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Scaffalature non controventate</Label>
                <Select
                  onValueChange={(value) => {
                    setFormLocale({
                      ...formLocale,
                      section5: {
                        ...formLocale.section5,
                        scaffalatureControventate: value,
                      },
                    });
                  }}
                  value={formLocale.section5.scaffalatureControventate}
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
          </div>
          <div className="mb-8">
            <h2 className="italic text-md text-orange">
              Somma totale assicurata:
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Superiore a 11.000.000 €</Label>
                <Select
                  onValueChange={(value) => {
                    setFormLocale({
                      ...formLocale,
                      section5: {
                        ...formLocale.section5,
                        superA11Mil: value,
                      },
                    });
                  }}
                  value={formLocale.section5.superA11Mil}
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section5;
