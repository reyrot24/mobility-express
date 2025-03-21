import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const Section4 = ({
  errors,
  setFormLocale,
  formLocale,
}: {
  errors: { [key: string]: string | null };
  setFormLocale: any;
  formLocale: any;
}) => {
  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl">
      <div className="">
        <div className="flex flex-col gap-4 mb-4">
          <h1 className="font-bold py-4 text-xl">
            Sezione 4: Beni Assicurati e Somme Assicurate
          </h1>
          <div className="flex flex-col">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bene</TableHead>
                  <TableHead>Somma Assicurata (€) *</TableHead>
                  <TableHead>Forma di Copertura</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Fabbricato (1)</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      step=".01"
                      className={`col-span-3 w-40 ${
                        errors.fabbricato ? "border-red-500 border-2" : ""
                      }`}
                      value={formLocale.section4.fabbricato}
                      onChange={(e) =>
                        setFormLocale({
                          ...formLocale,
                          section4: {
                            ...formLocale.section4,
                            fabbricato: e.target.value,
                          },
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>Valore intero</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>
                    Macchinari e Attrezzature e Impianti (2) (3)
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className={`col-span-3 w-40 ${
                        errors.macchinari ? "border-red-500 border-2" : ""
                      }`}
                      min="1"
                      step=".01"
                      value={formLocale.section4.macchinari}
                      onChange={(e) =>
                        setFormLocale({
                          ...formLocale,
                          section4: {
                            ...formLocale.section4,
                            macchinari: e.target.value,
                          },
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>Valore intero</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Terreni</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      className={`col-span-3 w-40 ${
                        errors.terreni ? "border-red-500 border-2" : ""
                      }`}
                      min="1"
                      step=".01"
                      value={formLocale.section4.terreni}
                      onChange={(e) =>
                        setFormLocale({
                          ...formLocale,
                          section4: {
                            ...formLocale.section4,
                            terreni: e.target.value,
                          },
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>Primo Rischio Assoluto</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Section4;
