import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const checkboxes = [
  "Strutture in Calcestruzzo gettato",
  "Strutture in Calcestruzzo prefabbricato",
  "Strutture in Acciaio / Legno",
  "Strutture in Muratura / Altro",
];

const Section3 = ({
  errors,
  setFormLocale,
  formLocale,
}: {
  errors: { [key: string]: string | null };
  setFormLocale: any;
  formLocale: any;
}) => {
  const handleCheckboxChange = (label: string) => {
    const updatedStrutture = formLocale.section3.strutture.includes(label)
      ? formLocale.section3.strutture.filter((item: any) => item !== label) // Remove if already selected
      : [...formLocale.section3.strutture, label]; // Add if not selected

    setFormLocale({
      ...formLocale,
      section3: {
        ...formLocale.section3,
        strutture: updatedStrutture,
      },
    });
  };

  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl">
      <div className="grid grid-cols- mb-8">
        <div className="flex flex-col gap-4 mb-4">
          <h1 className="font-bold py-4 text-xl">
            Sezione 3: Dati Tecnici del Fabbricato *
          </h1>
          {errors.strutture && (
            <span className="text-red-500 text-sm">
              Selezionare almeno una checkbox
            </span>
          )}
          {checkboxes.map((label) => (
            <div key={label} className="flex items-center space-x-2">
              <Checkbox
                id={label}
                checked={formLocale.section3.strutture.includes(label)}
                onCheckedChange={() => handleCheckboxChange(label)}
              />
              <Label
                htmlFor={label}
                className="leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {label}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Section3;
