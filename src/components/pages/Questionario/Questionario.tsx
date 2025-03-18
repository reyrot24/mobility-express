import Navbar from "@/components/ui/Navbar";
import Section1 from "./sections/Section1";
import Section2 from "./sections/Section2";
import Section3 from "./sections/Section3";
import Section4 from "./sections/Section4";
import Section5 from "./sections/Section5";
import Section6 from "./sections/Section6";
import { Button } from "@/components/ui/button";
import { FormProvider, useForm } from "./FormContext";
import toast from "react-hot-toast";
import { useEffect, useState } from "react";
import { validatePIVA, validateTelefono } from "./utils/validationFunctions";
import { useNavigate, useParams } from "react-router-dom";
import HelpButton from "./utils/helpButton";
import Ubicazioni from "./sections/Ubicazioni";

const QuestionarioContent = () => {
  const { formState } = useForm();
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

  const [ubicazioni, setUbicazioni] = useState<any[]>([]);
  const [openModal, setOpenModal] = useState(false);
  const [selectedUbicazione, setSelectedUbicazione] = useState<any | null>(
    null
  );

  const { idUid } = useParams();
  const navigate = useNavigate();

  const validateForm = (): boolean => {
    const errors: { [key: string]: string | null } = {};
    let hasErrors = false;

    //SECTION 1
    if (!formState.section1.cfPiva.trim()) {
      errors.cfPiva = "CF / PIVA is required";
      hasErrors = true;
    } else {
      const piva = validatePIVA(formState.section1.cfPiva);
      if (!piva) {
        errors.cfPiva = "La P. IVA deve essere composto da 11 numeri.";
        hasErrors = true;
      }
    }
    if (!formState.section1.ragioneSociale.trim()) {
      errors.ragioneSociale = "Ragione Sociale is required";
      hasErrors = true;
    }
    if (!formState.section1.sedeLegale.trim()) {
      errors.sedeLegale = "Sede Legale is required";
      hasErrors = true;
    }
    if (!formState.section1.dataCostituzione) {
      errors.dataCostituzione = "Data Costituzione is required";
      hasErrors = true;
    }
    if (!formState.section1.codiceAteco.trim()) {
      errors.codiceAteco = "Codice Ateco is required";
      hasErrors = true;
    }
    if (!formState.section1.telefono.trim()) {
      errors.telefono = "Telefono is required";
      hasErrors = true;
    } else {
      const isPhoneValid = validateTelefono(formState.section1.telefono);
      if (!isPhoneValid) {
        errors.telefono =
          "Il numero di telefono deve essere composto da almeno 9 numeri.";
        hasErrors = true;
      }
    }
    if (!formState.section1.email.trim()) {
      errors.email = "Email is required";
      hasErrors = true;
    }
    if (!formState.section1.nominativoRiferimento.trim()) {
      errors.nominativoRiferimento = "Nominativo Riferimento is required";
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

  const handleSalva = () => {
    if (!validateForm()) {
      console.log("Saving form data:", formState);
      return; // If validation fails, do nothing
    }

    // If no errors, clear them and proceed with saving
    setErrors({}); // ✅ Clear errors before saving
    const data = {
      data: formState,
    };
    console.log("Saving form data:", data);
  };

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
      if (responseData.status === 0) {
        navigate("/");
        return;
      }
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
        </div>
      </div>
    </main>
  );
};

const Questionario = () => (
  <FormProvider>
    <QuestionarioContent />
    <HelpButton />
  </FormProvider>
);

export default Questionario;
