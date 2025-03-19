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
import { Plus } from "lucide-react";
import { useState } from "react";
import Section2 from "./Section2";
import Section3 from "./Section3";
import Section4 from "./Section4";
import Section5 from "./Section5";
import { useForm } from "../FormContext";
import toast from "react-hot-toast";

const Ubicazioni = () => {
  const { formState, dispatch } = useForm();
  const [openModale, setOpenModale] = useState(false);
  const [selectedUbicazione, setSelectedUbicazione] = useState<any | null>(
    null
  );
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});
  const [formLocale, setFormLocale] = useState<any | null>({});

  const [isNewUbicazione, setIsNewUbicazione] = useState(false);

  const handleAddUbicazione = () => {
    const nuovaUbicazione = {
      // Genera un ID univoco
      id: Math.floor(Math.random() * 100) + Math.floor(Math.random() * 100),
      section2: {
        indirizzoCompleto: "",
        annoCostruzione: "",
        annoRistrutturazione: "",
        fabbricato: "proprieta",
        superficieTotale: "",
        superficieCoperta: "",
        numeroPianiTotali: "",
        pianiSeminterrati: "no",
        pianoPiuBasso: "seminterrato",
        numeroPianiAttività: "",
        fabbricatoAssicurato: "no",
        strutturaAntisismica: "no",
        eventiNegliUltimi10Anni: "no",
        eventiNegliUltimi10AnniArray: [],
        migliorieApportate: "no",
        descrizioneMigliorieApportate: "",
      },
      section3: { strutture: [] },
      section4: { fabbricato: "", macchinari: "", terreni: "" },
      section5: {
        corsiAcqua: "no",
        corsiAcquaNome: "",
        corsiAcquaDistanza: "",
        corsiAcquaDislivello: "",
        scaffaliSuolo: "no",
        scaffalatureControventate: "no",
        superA11Mil: "no",
      },
    };
    setFormLocale(nuovaUbicazione);
    setSelectedUbicazione(nuovaUbicazione);
    setIsNewUbicazione(true);
    setOpenModale(true);
    dispatch({ type: "ADD_UBICAZIONE", payload: nuovaUbicazione });
  };

  const handleEditUbicazione = (ubicazione: any) => {
    setSelectedUbicazione(ubicazione);
    const savedData = ubicazione.section2.eventiNegliUltimi10AnniArray || [];

    // Assicuriamoci che la tabella abbia sempre almeno 5 righe
    const updatedData = [...savedData];

    while (updatedData.length < 5) {
      updatedData.push({ date: "", type: "", amount: "", disabled: true });
    }

    setFormLocale({
      ...ubicazione,
      section2: {
        ...ubicazione.section2,
        eventiNegliUltimi10AnniArray: updatedData,
      },
    });
    /* setFormLocale(ubicazione); */
    setOpenModale(true);
  };
  //Problema: se premo no alla select, poi tutte le righe devono essere eliminate.

  const handleDeleteUbicazione = (id: number) => {
    dispatch({ type: "DELETE_UBICAZIONE", payload: id });
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string | null } = {};
    let hasErrors = false;

    //SECTION 2
    if (!formLocale.section2.indirizzoCompleto.trim()) {
      errors.indirizzoCompleto = "Indirizzo completo non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section2.annoCostruzione.trim()) {
      errors.annoCostruzione =
        "Anno di costruzione del fabbricato non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section2.annoRistrutturazione.trim()) {
      errors.annoRistrutturazione =
        "Anno di ristrutturazione antisismica non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section2.superficieTotale.trim()) {
      errors.superficieTotale = "Superficie Totale non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section2.superficieCoperta.trim()) {
      errors.superficieCoperta =
        "Superficie Coperta in pianta non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section2.numeroPianiTotali.trim()) {
      errors.numeroPianiTotali = "Numero piani totali non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section2.numeroPianiAttività.trim()) {
      errors.numeroPianiAttività =
        "Numero di piani su cui si sviluppa l’attività non può essere vuoto";
      hasErrors = true;
    }
    if (
      formLocale.section2.eventiNegliUltimi10Anni === "si" &&
      formLocale.section2.eventiNegliUltimi10AnniArray.length === 0
    ) {
      errors.eventiNegliUltimi10Anni =
        "Compilare i campi nella tabella eventi passati se si è selezionato si";
      hasErrors = true;
    }
    if (formLocale.section2.eventiNegliUltimi10Anni === "si") {
      const eventiArray =
        formLocale.section2.eventiNegliUltimi10AnniArray || [];

      // Controlla se almeno una riga è selezionata (disabled: false)
      const righeSelezionate = eventiArray.filter((row: any) => !row.disabled);
      /* console.log("righe selezionate:", righeSelezionate); */
      if (righeSelezionate.length === 0) {
        errors.eventiNegliUltimi10Anni =
          "Devi selezionare almeno una riga nella tabella eventi passati.";
        hasErrors = true;
      } else {
        // Controlla che ogni riga selezionata abbia almeno 'date' e 'type' compilati
        righeSelezionate.forEach((row: any, index: any) => {
          if (!row.date.trim()) {
            errors[
              `eventiNegliUltimi10AnniArray_${index}_date`
            ] = `La data è obbligatoria per la riga attivata n° ${index + 1}`;
            hasErrors = true;
          }
          if (!row.type.trim()) {
            errors[
              `eventiNegliUltimi10AnniArray_${index}_type`
            ] = `La tipologia è obbligatoria per la riga attivata n° ${
              index + 1
            }`;
            hasErrors = true;
          }
        });
      }
    }
    if (
      formLocale.section2.migliorieApportate === "si" &&
      !formLocale.section2.descrizioneMigliorieApportate.trim()
    ) {
      errors.migliorieApportate =
        "Descrivere gli interventi migliorativi se si è selezionato si";
      hasErrors = true;
    }

    //SECTION 3
    if (formLocale.section3.strutture.length === 0) {
      errors.strutture = "Selezionare almeno un tipo di struttura";
      hasErrors = true;
    }

    //SECTION 4
    if (!formLocale.section4.fabbricato.trim()) {
      errors.fabbricato =
        "Somma assicurata del fabbricato non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section4.macchinari.trim()) {
      errors.macchinari =
        "Somma assicurata dei macchinari e altro non può essere vuoto";
      hasErrors = true;
    }
    if (!formLocale.section4.terreni.trim()) {
      errors.terreni = "Somma assicurata dei terreni non può essere vuoto";
      hasErrors = true;
    }

    //SECTION 5
    if (formLocale.section5.corsiAcqua === "si") {
      if (!formLocale.section5.corsiAcquaNome.trim()) {
        errors.corsiAcquaNome = "Nome corsi d'acqua non può essere vuoto";
        hasErrors = true;
      }
      if (!formLocale.section5.corsiAcquaDistanza.trim()) {
        errors.corsiAcquaDistanza =
          "Distanza corsi d'acqua non può essere vuoto";
        hasErrors = true;
      }
      if (!formLocale.section5.corsiAcquaDislivello.trim()) {
        errors.corsiAcquaDislivello =
          "Dislivello corsi d'acqua non può essere vuoto";
        hasErrors = true;
      }
    }
    setErrors(errors);

    if (hasErrors) {
      let errorMessage = "Please fix the following errors:\n\n";
      for (const key in errors) {
        if (errors[key]) {
          errorMessage += `${errors[key]}\n`;
        }
      }
      alert(errorMessage); // Show the errors in an alert
      toast.error("Ci sono errori nel form. Controlla i campi evidenziati.");
      return false;
    }

    return true;
  };

  const handleSaveUbicazione = () => {
    if (!validateForm()) {
      return; // If validation fails, do nothing
    }

    const eventiFiltrati =
      formLocale.section2.eventiNegliUltimi10AnniArray.filter(
        (row: any) => !row.disabled
      );

    const nuovoFormLocale = {
      ...formLocale,
      section2: {
        ...formLocale.section2,
        eventiNegliUltimi10AnniArray: eventiFiltrati,
      },
    };

    if (selectedUbicazione.id === formLocale.id) {
      dispatch({
        type: "UPDATE_UBICAZIONE",
        payload: { id: selectedUbicazione.id, data: nuovoFormLocale },
      });
    }

    setOpenModale(false);
    setIsNewUbicazione(false);
    setSelectedUbicazione(null);
  };
  /* console.log("Form state: ", formState.ubicazioni);
  console.log("Form locale: ", formLocale); */

  return (
    <section className="w-full items-center bg-background2 px-[5%] rounded-xl">
      <div className="flex flex-row justify-between items-center gap-4 mb-4">
        <h1 className="font-bold py-4 text-xl">Ubicazioni</h1>
        <Button onClick={handleAddUbicazione}>
          <Plus />
        </Button>
      </div>
      <div className="flex flex-col gap-16 mb-8">
        {formState.ubicazioni.map((ubicazione) => (
          <div className="flex flex-row gap-16 rounded p-4">
            <div className="italic text-md text-orange">
              {ubicazione.section2.indirizzoCompleto}
            </div>
            <div className="flex gap-4">
              <Button onClick={() => handleEditUbicazione(ubicazione)}>
                Modifica
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleDeleteUbicazione(ubicazione.id)}
              >
                Elimina
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={openModale}
        onOpenChange={(isOpen) => {
          if (!isOpen && isNewUbicazione) {
            handleDeleteUbicazione(formLocale.id); // Rimuove l'ubicazione se è nuova
          }
          setOpenModale(isOpen);
        }}
      >
        <DialogTrigger asChild></DialogTrigger>
        <DialogContent className="h-[600px] overflow-auto max-w-xxl">
          <DialogTitle>Ubicazione</DialogTitle>
          <DialogDescription>Compila i campi</DialogDescription>
          <Section2
            errors={errors}
            setFormLocale={setFormLocale}
            formLocale={formLocale}
          />
          <Section3
            errors={errors}
            setFormLocale={setFormLocale}
            formLocale={formLocale}
          />
          <Section4
            errors={errors}
            setFormLocale={setFormLocale}
            formLocale={formLocale}
          />
          <Section5
            errors={errors}
            setFormLocale={setFormLocale}
            formLocale={formLocale}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button>Chiudi</Button>
            </DialogClose>
            <Button onClick={handleSaveUbicazione}>Salva</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default Ubicazioni;
