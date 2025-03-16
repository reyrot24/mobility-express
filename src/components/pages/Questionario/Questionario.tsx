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

const QuestionarioContent = () => {
  const { formState } = useForm();
  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

  const { idUid } = useParams();
  const navigate = useNavigate();
  console.log(idUid);

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
    if (!formState.section1.altriCodiciAteco.trim()) {
      errors.altriCodiciAteco = "Altri Codici Ateco is required";
      hasErrors = true;
    }
    if (!formState.section1.telefono.trim()) {
      errors.telefono = "Telefono is required";
      hasErrors = true;
    } else {
      const isPhoneValid = validateTelefono(formState.section1.telefono);
      if (!isPhoneValid) {
        alert("Il numero di telefono deve essere composto da 11 numeri.");
        errors.telefono =
          "Il numero di telefono deve essere composto da 11 numeri.";
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

    //SECTION 2
    if (!formState.section2.indirizzoCompleto.trim()) {
      errors.indirizzoCompleto = "Indirizzo completo non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.annoCostruzione.trim()) {
      errors.annoCostruzione =
        "Anno di costruzione del fabbricato non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.annoRistrutturazione.trim()) {
      errors.annoRistrutturazione =
        "Anno di ristrutturazione antisismica non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.superficieTotale.trim()) {
      errors.superficieTotale = "Superficie Totale non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.superficieCoperta.trim()) {
      errors.superficieCoperta =
        "Superficie Coperta in pianta non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.numeroPianiTotali.trim()) {
      errors.numeroPianiTotali = "Numero piani totali non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section2.numeroPianiAttività.trim()) {
      errors.numeroPianiAttività =
        "Numero di piani su cui si sviluppa l’attività non può essere vuoto";
      hasErrors = true;
    }
    if (
      formState.section2.eventiNegliUltimi10Anni === "si" &&
      formState.section2.eventiNegliUltimi10AnniArray.length === 0
    ) {
      errors.eventiNegliUltimi10Anni =
        "Compilare i campi nella tabella eventi passati se si è selezionato si";
      hasErrors = true;
    }
    if (
      formState.section2.migliorieApportate === "si" &&
      !formState.section2.descrizioneMigliorieApportate.trim()
    ) {
      errors.migliorieApportate =
        "Descrivere gli interventi migliorativi se si è selezionato si";
      hasErrors = true;
    }

    //SECTION 3
    if (formState.section3.strutture.length === 0) {
      errors.strutture = "Selezionare almeno un tipo di struttura";
      hasErrors = true;
    }

    //SECTION 4
    if (!formState.section4.fabbricato.trim()) {
      errors.fabbricato =
        "Somma assicurata del fabbricato non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section4.macchinari.trim()) {
      errors.macchinari =
        "Somma assicurata dei macchianri e altro non può essere vuoto";
      hasErrors = true;
    }
    if (!formState.section4.terreni.trim()) {
      errors.terreni = "Somma assicurata dei terreni non può essere vuoto";
      hasErrors = true;
    }

    //SECTION 5
    if (formState.section5.corsiAcqua === "si") {
      if (!formState.section5.corsiAcquaNome.trim()) {
        errors.corsiAcquaNome = "Nome corsi d'acqua non può essere vuoto";
        hasErrors = true;
      }
      if (!formState.section5.corsiAcquaDistanza.trim()) {
        errors.corsiAcquaDistanza =
          "Distanza corsi d'acqua non può essere vuoto";
        hasErrors = true;
      }
      if (!formState.section5.corsiAcquaDislivello.trim()) {
        errors.corsiAcquaDislivello =
          "Dislivello corsi d'acqua non può essere vuoto";
        hasErrors = true;
      }
    }

    //SECTION 6
    if (!formState.section6.checkboxTrattamentoDatiPersonali) {
      errors.checkboxTrattamentoDatiPersonali =
        "Acconsentire al trattamento dei dati personali";
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

    console.log("Saving form data:", formState);
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
          <Section2 errors={errors} />
          <Section3 errors={errors} />
          <Section4 errors={errors} />
          <Section5 errors={errors} />
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
  </FormProvider>
);

export default Questionario;

{
  /* DA FARE:
- Tabelle sotto e i campi delle tabelle con bg. V
- Input date V
- Input prezzi con €, userò number format package
- Pulsante Salva
- Anni da 1900. V
- Superfici a partire 1,00 V
- Numero piani totali a partire da 1 V 
- Sezione 4 tabella somma con la virgola V   
- La pagina verrà richiamata con un id nell'url. /questionariocatasfrofali/[id]. UseEffect che fa un controllo: se tutto ok nella chiamata api mostro la pagina, altrimenti redirect su https://polizzexpress.it.
- Autocompilazione per la partita iva con un pulsante per fare una ricerca. Se non ritorna niente allora snackbar con dati non trovati, altrimenti dati trovati e inserisco i dati nelle caselle.
- Massimo 5 eventi passati, con pulsante per inserire. Almeno uno compilato. Se selezionato la tipologia e la data posso inviare. V
- Validazione e errori
- Stati e json da mandare.

//11 caratteri si abilita il pulsante cerca. QUando si clicca si apre una popup dove appaiono i risultati e poi si cliccano sui risultati.
Miglirie apportate pulsante si no e appare la textfield
Primo checkbox sta sempre, l'altro default ma si può deselezionare

*/
}
