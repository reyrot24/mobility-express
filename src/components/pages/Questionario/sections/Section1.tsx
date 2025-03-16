import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { useForm } from "../FormContext";
import { Toaster } from "react-hot-toast";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SearchPIVA from "../utils/searchPIVA";
import { useState } from "react";
import { RingSpinnerOverlay } from "react-spinner-overlay";

const Section1 = ({ errors }: { errors: { [key: string]: string | null } }) => {
  const { formState, dispatch } = useForm();
  const [risultati, setRisultati] = useState<any>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    console.log("Searching for:", formState.section1.cfPiva);
    try {
      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          cercare: formState.section1.cfPiva, //"04259930610"
        }),
      };

      const response = await fetch(
        "https://devops.mobilityexpress.it/api/csSearch",
        options
      );
      const responseData = await response.json();
      setRisultati(responseData.data.companies);
    } catch (err) {
      console.log(err);
    }
  }

  async function handleSelectCompany(id: string) {
    setOpen(false); // Close the dialog
    setLoading(true);
    setRisultati([]);
    try {
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ Idcercare: id }),
      };

      const response = await fetch(
        "https://devops.mobilityexpress.it/api/csGetInfo",
        options
      );
      const responseData = await response.json();
      const dataCostituzione = new Date(
        responseData.data.report.alternateSummary.incorporationDate
      )
        .toISOString()
        .split("T")[0];

      // Update the form state with company details
      //Business name = Ragione sociale,
      //Address = sede legale
      //data costituzione = incorporationDate
      //Codice ateco = company summary -> mainActivity -> code
      //Rimuovere gg/mm/aaaa dalla data costituzione
      dispatch({
        type: "section1",
        payload: {
          ragioneSociale: responseData.data.report.companySummary.businessName,
          sedeLegale: responseData.data.report.alternateSummary.address,
          dataCostituzione: dataCostituzione,
          codiceAteco:
            responseData.data.report.companySummary.mainActivity.code,
        },
      });
      setLoading(false);
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl">
      <div>
        <Toaster position="top-right" reverseOrder={false} />
        <RingSpinnerOverlay
          loading={loading}
          color="#FF6B01"
          /* overlayColor="233044ea" */
        />
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="font-bold py-4 text-xl">
            Sezione 1: Informazioni sul Contraente
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="py-2 flex flex-col">
              <Label className="mb-2">CF / PIVA</Label>
              <div className="grid grid-cols-4 gap-4">
                <Input
                  type="text"
                  value={formState.section1.cfPiva}
                  onChange={(e) =>
                    dispatch({
                      type: "section1",
                      payload: { cfPiva: e.target.value },
                    })
                  }
                  required
                  className={`col-span-3 ${
                    errors.cfPiva ? "border-red-500 border-2" : ""
                  }`}
                />

                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={handleSearch}
                      disabled={
                        !(
                          formState.section1.cfPiva.length === 11 &&
                          /^\d+$/.test(formState.section1.cfPiva)
                        )
                      }
                    >
                      <Search />
                    </Button>
                  </DialogTrigger>
                  <DialogContent aria-describedby="">
                    <DialogTitle>Ricerca P.IVA</DialogTitle>
                    <SearchPIVA
                      risultati={risultati}
                      onSelect={handleSelectCompany}
                    />
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="default">
                          Close
                        </Button>
                      </DialogClose>
                    </DialogFooter>

                    <DialogDescription>Description goes here</DialogDescription>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">Ragione Sociale</Label>
              <Input
                type="text"
                value={formState.section1.ragioneSociale}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { ragioneSociale: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.ragioneSociale ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">Sede Legale</Label>
              <Input
                type="text"
                value={formState.section1.sedeLegale}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { sedeLegale: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.ragioneSociale ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">Data Costituzione</Label>
              <Input
                type="date"
                value={formState.section1.dataCostituzione}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { dataCostituzione: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.dataCostituzione ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">Codice Ateco</Label>
              <Input
                type="text"
                value={formState.section1.codiceAteco}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { codiceAteco: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.codiceAteco ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">
                Altri Codici Ateco (sep. da virgola):
              </Label>
              <Input
                type="text"
                value={formState.section1.altriCodiciAteco}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { altriCodiciAteco: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.altriCodiciAteco ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">Telefono</Label>
              <Input
                type="number"
                value={formState.section1.telefono}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { telefono: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.telefono ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">Email</Label>
              <Input
                type="email"
                value={formState.section1.email}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { email: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.email ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
            <div className="py-2 flex flex-col">
              <Label className="mb-2">Nominativo Riferimento</Label>
              <Input
                type="text"
                value={formState.section1.nominativoRiferimento}
                onChange={(e) =>
                  dispatch({
                    type: "section1",
                    payload: { nominativoRiferimento: e.target.value },
                  })
                }
                className={`col-span-3 ${
                  errors.nominativoRiferimento ? "border-red-500 border-2" : ""
                }`}
                required
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section1;
/* className={
  state.errors[field]
    ? "border-red-500 col-span-3"
    : `${field === "cfPiva" && "col-span-3"}`
} */
