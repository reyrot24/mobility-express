import Navbar from "@/components/ui/Navbar";
import Section1 from "./sections/Section1";
import Section6 from "./sections/Section6";
import { Button } from "@/components/ui/button";
import { FormProvider, useForm } from "./FormContext";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { validatePIVA, validateTelefono } from "./utils/validationFunctions";
import { useNavigate, useParams } from "react-router-dom";
import Ubicazioni from "./sections/Ubicazioni";
import { RingSpinnerOverlay } from "react-spinner-overlay";
import SectionHelp from "./sections/SectionHelp";

const QuestionarioContent = () => {
  const { formState, dispatch } = useForm();
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

  const [numeroTelefono, setNumeroTelefono] = useState("");

  const [loadingSpinner, setLoadingSpinner] = useState(false);

  const { idUid } = useParams();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const errors: { [key: string]: string | null } = {};
    let hasErrors = false;

    //SECTION 1
    if (!formState.section1.cfPiva.trim()) {
      errors.cfPiva = "CF / PIVA è obbligatoria";
      hasErrors = true;
    } else {
      const piva = validatePIVA(formState.section1.cfPiva);
      if (!piva) {
        errors.cfPiva = "La P. IVA deve essere composto da 11 numeri.";
        hasErrors = true;
      }
    }
    if (!formState.section1.ragioneSociale.trim()) {
      errors.ragioneSociale = "Ragione Sociale è obbligatoria";
      hasErrors = true;
    }
    if (!formState.section1.sedeLegale.trim()) {
      errors.sedeLegale = "Sede Legale è obbligatoria";
      hasErrors = true;
    }
    if (!formState.section1.dataCostituzione) {
      errors.dataCostituzione = "Data Costituzione è obbligatoria";
      hasErrors = true;
    }
    if (!formState.section1.codiceAteco.trim()) {
      errors.codiceAteco = "Codice Ateco è obbligatorio";
      hasErrors = true;
    }
    if (!formState.section1.telefono.trim()) {
      errors.telefono = "Cellulare è obbligatorio";
      hasErrors = true;
    } else {
      const isPhoneValid = validateTelefono(formState.section1.telefono);
      if (!isPhoneValid) {
        errors.telefono =
          "Il numero di cellulare deve essere composto da almeno 9 numeri.";
        hasErrors = true;
      }
    }
    //Controllo che le ubicazioni sono obbligatorie
    if (!formState.section1.email.trim()) {
      errors.email = "Email è obbligatoria";
      hasErrors = true;
    }
    if (!formState.section1.nominativoRiferimento.trim()) {
      errors.nominativoRiferimento = "Nominativo Riferimento è obbligatorio";
      hasErrors = true;
    }

    if (formState.ubicazioni.length === 0) {
      errors.nominativoRiferimento = "Compilare almeno un'ubicazione";
      hasErrors = true;
    }

    //SECTION 6
    if (!formState.section6.checkboxTrattamentoDatiPersonali) {
      errors.checkboxTrattamentoDatiPersonali =
        "Acconsentire al trattamento dei dati personali";
      hasErrors = true;
    }
    if (!formState.section6.checkboxAutorizzazionePreventivo) {
      errors.checkboxAutorizzazionePreventivo =
        "Acconsentire all'autorizzazione per formulare un preventivo assicurativo";
      hasErrors = true;
    }

    setErrors(errors);

    if (hasErrors) {
      let errorMessage = "Ci sono questi errori nel form:\n\n";
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

  const handleSalva = () => {
    if (!validateForm()) {
      console.log("Saving form data:", formState);
      return; // If validation fails, do nothing
    }

    setErrors({}); // ✅ Clear errors before saving
    const data = {
      id: idUid,
      data: formState,
    };
    setLoadingSpinner(true);
    InviaForm(data);
    setLoadingSpinner(false);
    /* console.log("Saving form data:", data); */
  };

  async function InviaForm(data: any) {
    try {
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(data),
      };

      const response = await fetch(
        "https://devops.mobilityexpress.it/api/getSaveCat",
        options
      );
      const responseData = await response.json();
      console.log(responseData);
      toast.success(responseData.message + " con successo");
    } catch (err) {
      toast.error("Errore nell'invio del form");
      console.log(err);
    }
  }

  async function CheckIDuid() {
    try {
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ id: idUid }),
      };

      const response = await fetch(
        "https://devops.mobilityexpress.it/api/getQuestCat",
        options
      );
      const responseData = await response.json();
      //Controllo stringa vuota in data per vedere se inserire
      if (responseData.status === 0) {
        navigate("/");
        return;
      }

      if (responseData.data !== null) {
        dispatch({ type: "SET_FORM", payload: responseData.data.data });
      }
      if (responseData.numeroRiferimento) {
        setNumeroTelefono(responseData.numeroRiferimento);
      }

      //NUmero riferimento
    } catch (err) {
      console.log(err);
    }
  }

  useEffect(() => {
    CheckIDuid();
  }, []);

  return (
    <main>
      <Navbar />
      <RingSpinnerOverlay
        loading={loadingSpinner}
        color="#FF6B01"
        /* overlayColor="233044ea" */
      />
      <div className="px-[5%] pt-20 md:pt-42 md:pt-20 pb-18 md:pb-20 md:pb-25 bg-background1 h-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold md:mb-2 md:text-5xl lg:text-6xl">
            Questionario per Polizze Catastrofali
          </h1>
          <h2 className="mb-5 text-base md:mb-6 ">
            (Terremoto, Alluvione, Inondazione, Esondazione, Frana)
          </h2>
        </div>
        <div className="flex flex-col gap-6">
          <Section1 errors={errors} />
          <Ubicazioni />
          <Section6 errors={errors} />
          <div className="text-right">
            <Button type="submit" onClick={handleSalva}>
              Salva
            </Button>
          </div>
          <SectionHelp numeroTelefono={numeroTelefono} />
        </div>
      </div>
    </main>
  );
};

const Questionario = () => (
  <FormProvider>
    <QuestionarioContent />
  </FormProvider>
);

export default Questionario;
