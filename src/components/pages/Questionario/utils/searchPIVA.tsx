import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type risultatiType = {
  name: string;
  address: { simpleValue: string };
  nrea: string;
  id: string;
};

const SearchPIVA = ({
  risultati,
  onSelect,
}: {
  risultati: risultatiType[];
  onSelect: (id: string) => void;
}) => {
  return (
    <div>
      <div className="my-4">
        <div className="mt-4">Risultati: {risultati.length}</div>
        <div className="mt-4">
          <Table className="bg-background2">
            <TableHeader>
              <TableRow>
                <TableCell className="text-left">Ragione Sociale</TableCell>
                <TableCell className="text-left">Indirizzo</TableCell>
                {/* <TableCell className="text-center">N. REA</TableCell> */}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* {rows.length === 0 ? (
                <TableRow>
                  <TableCell>Non ci sono risultati</TableCell>
                </TableRow>
              ) : (
                risultati.map((el) => (
                  <TableRow>
                    <TableCell className="font-medium">
                      {el?.ragioneSociale}
                    </TableCell>
                    <TableCell>{el?.piva}</TableCell>
                    <TableCell>{el?.nrea}</TableCell>
                  </TableRow>
                ))
              )} */}
              {risultati.map((el) => (
                <TableRow key={el.id}>
                  <TableCell className="font-medium">
                    {/*Chiedere se selezionare tutta la riga o solo il nome */}
                    <span
                      className="hover:text-orange cursor-pointer"
                      onClick={() => onSelect(el.id)}
                    >
                      {el?.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-left">
                    {el?.address.simpleValue}
                  </TableCell>
                  {/* <TableCell>{el?.nrea}</TableCell> */}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default SearchPIVA;
