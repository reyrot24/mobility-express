import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CircleHelp } from "lucide-react";
import { useState } from "react";

const HelpButton = () => {
  const [chiamami, setChiamami] = useState(false);

  return (
    <div className="z-40 left-8 bottom-8 fixed">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon">
            <CircleHelp className="h-[1.2rem] w-[1.2rem]" />
            {/* <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" /> */}
          </Button>
        </DialogTrigger>
        <DialogContent aria-describedby="">
          <DialogTitle>Help Center</DialogTitle>
          <DialogDescription>Come possiamo aiutarti?</DialogDescription>
          <div className="flex flex-col gap-4 items-center">
            <h3
              onClick={() => setChiamami(!chiamami)}
              className="scroll-m-20 text-2xl font-semibold tracking-tight cursor-pointer hover:text-orangeHover"
            >
              Chiamami
            </h3>
            {chiamami && (
              <div className="flex justify-center gap-4">
                <Input
                  type="text"
                  className="w-60"
                  placeholder="Inserire il numero di cellulare"
                />
                <Button>Invia</Button>
              </div>
            )}
            <h3
              onClick={() => setChiamami(!chiamami)}
              className="scroll-m-20 text-2xl font-semibold tracking-tight cursor-pointer hover:text-orangeHover"
            >
              Contattaci al numero 0818283736
            </h3>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button
                type="button"
                variant="default"
                onClick={() => setChiamami(false)}
              >
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HelpButton;
