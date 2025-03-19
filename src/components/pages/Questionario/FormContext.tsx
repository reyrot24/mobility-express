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
  /* section2: {
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
  };
  section3: {
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
  }; */
  section6: {
    checkboxTrattamentoDatiPersonali: boolean;
    checkboxAutorizzazionePreventivo: boolean;
    checkboxComunicazioniCommerciali: boolean;
  };
  ubicazioni: Array<{
    id: number;
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
    };
    section3: {
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
  }>;
};

// Define action type
type ActionType =
  | "section1"
  | "section2"
  | "section3"
  | "section4"
  | "section5"
  | "section6"
  | "SET_FORM"
  | "ADD_UBICAZIONE"
  | "UPDATE_UBICAZIONE"
  | "DELETE_UBICAZIONE";
type Action = { type: ActionType; payload: any };

// Reducer function to update state
const formReducer = (state: FormState, action: Action): FormState => {
  switch (action.type) {
    case "section1":
      return { ...state, section1: { ...state.section1, ...action.payload } };
    case "section6":
      return { ...state, section6: { ...state.section6, ...action.payload } };
    case "SET_FORM": // 🔥 Imposta l'intero form con i dati dell'API
      return { ...state, ...action.payload };
    case "ADD_UBICAZIONE":
      return {
        ...state,
        ubicazioni: [...state.ubicazioni, { ...action.payload }], // Assegna un ID unico
      };
    case "UPDATE_UBICAZIONE":
      return {
        ...state,
        ubicazioni: state.ubicazioni.map((ubicazione) =>
          ubicazione.id === action.payload.id
            ? { ...ubicazione, ...action.payload.data }
            : ubicazione
        ),
      };
    case "DELETE_UBICAZIONE":
      return {
        ...state,
        ubicazioni: state.ubicazioni.filter(
          (ubicazione) => ubicazione.id !== action.payload
        ),
      };
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

const initialData = {
  section1: {
    //id: '', id vuoto alla primo salvataggio
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
  section6: {
    checkboxTrattamentoDatiPersonali: true,
    checkboxAutorizzazionePreventivo: true,
    checkboxComunicazioniCommerciali: true,
  },
  ubicazioni: [
    /* {
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
    }, */
  ],
};

// Context Provider Component
export const FormProvider = ({ children }: { children: ReactNode }) => {
  const [formState, dispatch] = useReducer(formReducer, initialData);

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
