import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SectionHelp = () => {
  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl py-4">
      <div className="flex flex-col">
        <h1 className="font-bold py-4 text-xl">Help Center</h1>
        Come possiamo aiutarti?
      </div>
      <div className="flex flex-col gap-4 items-center mt-8">
        <div className="flex gap-4">
          <h3 className="text-2xl font-semibold tracking-tight">Chiamami</h3>

          <div className="flex justify-center gap-4">
            <Input
              type="text"
              className="w-60"
              placeholder="Inserire il numero di cellulare"
            />
            <Button>Invia</Button>
          </div>
        </div>
        o
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight cursor-pointer hover:text-orangeHover">
          Contattaci al numero 0818283736
        </h3>
      </div>
    </section>
  );
};

export default SectionHelp;
