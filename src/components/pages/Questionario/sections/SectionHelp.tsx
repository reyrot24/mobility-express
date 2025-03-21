import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import toast from "react-hot-toast";

const SectionHelp = ({ numeroTelefono }: { numeroTelefono: any }) => {
  const [numeroUtente, setNumeroUtente] = useState<any>();

  async function sendPhoneNumber() {
    try {
      console.log(numeroUtente);
      /* const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          numeroTelefono: numeroUtente,
        }),
      }; */

      /*  const response = await fetch(
        "https://devops.mobilityexpress.it/api/csSearch",
        options
      );
      const responseData = await response.json(); */
      toast.success("Numero inviato. Ti contatteremo a breve");
      setNumeroUtente("");
    } catch (err) {
      console.log(err);
    }
  }

  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl py-4">
      <div className="flex flex-col">
        <h1 className="font-bold py-4 text-xl">Come possiamo aiutarti?</h1>
      </div>
      <div className="flex flex-col gap-4 items-center mt-8">
        <div className="flex gap-4 items-center">
          <div className="flex justify-center gap-4">
            <Input
              type="text"
              className="w-60"
              placeholder="Inserire il numero di cellulare"
              value={numeroUtente}
              onChange={(e) => setNumeroUtente(e.target.value)}
            />
            <Button onClick={sendPhoneNumber}>Chiamami</Button>
          </div>
        </div>
        oppure
        <h3 className="scroll-m-20 text-2xl font-semibold">
          Contattaci al numero {numeroTelefono}
        </h3>
      </div>
    </section>
  );
};

export default SectionHelp;
