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
import { useForm } from "../FormContext";

const Section5 = ({ errors }: { errors: { [key: string]: string | null } }) => {
  const [presenzaCorsi, setPresenzaCorsi] = useState("");
  const { formState, dispatch } = useForm();

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
                    dispatch({
                      type: "section5",
                      payload: { corsiAcqua: value },
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
              {presenzaCorsi === "si" && (
                <>
                  <div className="py-2 flex flex-col">
                    <Label className="mb-2">Nome</Label>
                    <Input
                      type="text"
                      value={formState.section5.corsiAcquaNome}
                      onChange={(e) =>
                        dispatch({
                          type: "section5",
                          payload: { corsiAcquaNome: e.target.value },
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
                      value={formState.section5.corsiAcquaDistanza}
                      onChange={(e) =>
                        dispatch({
                          type: "section5",
                          payload: { corsiAcquaDistanza: e.target.value },
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
                      value={formState.section5.corsiAcquaDislivello}
                      onChange={(e) =>
                        dispatch({
                          type: "section5",
                          payload: { corsiAcquaDislivello: e.target.value },
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
                    dispatch({
                      type: "section5",
                      payload: { scaffaliSuolo: value },
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
              <div className="py-2 flex flex-col">
                <Label className="mb-2">Scaffalature non controventate</Label>
                <Select
                  onValueChange={(value) => {
                    dispatch({
                      type: "section5",
                      payload: { scaffalatureControventate: value },
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
                    dispatch({
                      type: "section5",
                      payload: { superA11Mil: value },
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section5;
