import { createContext, useContext, useReducer, ReactNode } from "react";
import { RowData } from "./utils/datagrid";

// Define the form state structure
type FormState = {
  section1: {
    cfPiva: string;
    ragioneSociale: string;
    sedeLegale: string;
    dataCostituzione: string;
    codiceAteco: string;
    altriCodiciAteco: string;
    telefono: string;
    email: string;
    nominativoRiferimento: string;
  };
  section2: {
    indirizzoCompleto: string;
    annoCostruzione: string;
    annoRistrutturazione: string;
    fabbricato: string;
    superficieTotale: string;
    superficieCoperta: string;
    numeroPianiTotali: string;
    pianiSeminterrati: string;
    pianoPiuBasso: string;
    numeroPianiAttività: string;
    fabbricatoAssicurato: string;
    strutturaAntisismica: string;
    eventiNegliUltimi10Anni: string;
    eventiNegliUltimi10AnniArray: RowData[];
    migliorieApportate: string;
    descrizioneMigliorieApportate: string;
  }; //Aggiornare qui
  section3: {
    /* struttureCalcestruzzoGettato: boolean;
    struttureCalcestruzzoPrefabbricato: boolean;
    struttureAcciaioLegno: boolean;
    struttureMuraturaAltro: boolean; */
    strutture: string[];
  };
  section4: { fabbricato: string; macchinari: string; terreni: string };
  section5: {
    corsiAcqua: string;
    corsiAcquaNome: string;
    corsiAcquaDistanza: string;
    corsiAcquaDislivello: string;
    scaffaliSuolo: string;
    scaffalatureControventate: string;
    superA11Mil: string;
  };
  section6: {
    checkboxTrattamentoDatiPersonali: boolean;
    checkboxComunicazioniCommerciali: boolean;
  };
};

// Define action type
type ActionType =
  | "section1"
  | "section2"
  | "section3"
  | "section4"
  | "section5"
  | "section6";
type Action = { type: ActionType; payload: any };

// Reducer function to update state
const formReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case "section1":
      return { ...state, section1: { ...state.section1, ...action.payload } };
    case "section2":
      return { ...state, section2: { ...state.section2, ...action.payload } };
    case "section3":
      return { ...state, section3: { ...state.section3, ...action.payload } };
    case "section4":
      return { ...state, section4: { ...state.section4, ...action.payload } };
    case "section5":
      return { ...state, section5: { ...state.section5, ...action.payload } };
    case "section6":
      return { ...state, section6: { ...state.section6, ...action.payload } };
    //AGGIUNGERE QUI LE ALTRE SEZIONI
    default:
      return state;
  }
};

// Create Context
const FormContext = createContext<{
  formState: FormState;
  dispatch: React.Dispatch<Action>;
} | null>(null);

// Context Provider Component
export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [formState, dispatch] = useReducer(formReducer, {
    section1: {
      cfPiva: "",
      ragioneSociale: "",
      sedeLegale: "",
      dataCostituzione: "",
      codiceAteco: "",
      altriCodiciAteco: "",
      telefono: "",
      email: "",
      nominativoRiferimento: "",
    },
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
    }, //Aggiornare qui
    section3: {
      strutture: [],
    },
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
    section6: {
      checkboxTrattamentoDatiPersonali: true,
      checkboxComunicazioniCommerciali: true,
    },
  });

  return (
    <FormContext.Provider value={{ formState, dispatch }}>
      {children}
    </FormContext.Provider>
  );
};

// Hook to use form context
export const useForm = () => {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error("useForm must be used within a FormProvider");
  }
  return context;
};
