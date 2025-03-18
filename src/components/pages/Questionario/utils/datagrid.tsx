import { useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  ColumnDef,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface RowData {
  date: string;
  amount: number;
  type: string;
  disabled: boolean; // Determines if the row is disabled
}

// Initialize 5 rows, first row enabled, others disabled
const initialData: RowData[] = Array.from({ length: 5 }, (_) => ({
  date: "",
  amount: 0,
  type: "",
  disabled: true, // First row enabled, others disabled
}));

const DataTable = ({
  setFormLocale,
  formLocale,
}: {
  setFormLocale: any;
  formLocale: any;
}) => {
  const [data, setData] = useState<RowData[]>(
    formLocale?.section2?.eventiNegliUltimi10AnniArray.length !== 0
      ? formLocale.section2.eventiNegliUltimi10AnniArray
      : initialData
  );

  const columns: ColumnDef<RowData>[] = [
    {
      header: "Seleziona",
      accessorKey: "disabled",
      cell: ({ row }) => (
        <Checkbox
          checked={!row.original.disabled}
          onCheckedChange={() => toggleRowDisabled(row.index)}
        />
      ),
    },
    {
      header: "Data",
      accessorKey: "date",
      cell: ({ row }) => (
        <Input
          type="date"
          value={row.original.date}
          onChange={(e) => updateRow(row.index, "date", e.target.value)}
          disabled={row.original.disabled}
        />
      ),
    },
    {
      header: "Tipologia Evento",
      accessorKey: "type",
      cell: ({ row }) => (
        <Select
          value={row.original.type}
          onValueChange={(value) => updateRow(row.index, "type", value)}
          disabled={row.original.disabled}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleziona una tipologia..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sismico">Sismico</SelectItem>
            <SelectItem value="alluvione">Alluvione</SelectItem>
            <SelectItem value="frane">Frane</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    {
      header: "Importo liquidato (se assicurato)",
      accessorKey: "amount",
      cell: ({ row }) => {
        const [localValue, setLocalValue] = useState(
          row.original.amount.toString()
        ); // Local state for input
        return (
          <Input
            type="number"
            /* value={row.original.amount}
          onChange={(e) => updateRow(row.index, "amount", e.target.value)}
          onFocus={(e) => e.target.select()} // Auto-select all text on focus
          disabled={row.original.disabled} */
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)} // Update local state
            onBlur={() => updateRow(row.index, "amount", Number(localValue))} // Commit change on blur
            disabled={row.original.disabled}
          />
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Toggle disabled state
  const toggleRowDisabled = (index: number) => {
    setData((prev) => {
      const newData = prev.map((row, i) =>
        i === index ? { ...row, disabled: !row.disabled } : row
      );

      // Filtra solo le righe attive
      const enabledRows = newData.filter((row) => !row.disabled);

      // Aggiorna il form locale con solo le righe attive
      setFormLocale((prev: any) => ({
        ...prev,
        section2: {
          ...prev.section2,
          eventiNegliUltimi10AnniArray: enabledRows,
        },
      }));

      console.log("Saving Rows after toggle:", enabledRows);

      return newData; // ✅ Aggiorna lo stato correttamente
    });
  };

  // Update row data
  const updateRow = (index: number, key: keyof RowData, value: any) => {
    setData((prev) => {
      const newData = prev.map((row, i) =>
        i === index ? { ...row, [key]: value } : row
      );
      const enabledRows = newData.filter((row) => !row.disabled);

      setFormLocale((prev: any) => ({
        ...prev,
        section2: {
          ...prev.section2,
          eventiNegliUltimi10AnniArray: enabledRows,
        },
      }));

      console.log("Saving Rows:", enabledRows);

      return newData; // ✅ Ensure state is correctly updated
    });
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default DataTable;

/*Problemi da aggiustare:
sembra che quando clicco no, ci sono ancora i dati dell'array della tabella.
Devo mettere l'errore che controlla se un campo è abilitato e non c'è niente dentro
*/
