import "./App.css";
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Index from "./components/pages/Main";
import { ThemeProvider } from "./components/dark-mode/theme-provider";
import { FloatingWhatsApp } from "./components/ui/FloatingWhatsApp";
import Questionario from "./components/pages/Questionario/Questionario";
import PrezzoGiusto from "./components/pages/PrezzoGiusto/PrezzoGiusto";
import { ModeToggle } from "./components/dark-mode/mode-toggle";
import RiskRadar from "./components/pages/RiskRadar/RiskRadar";
import RiskRadarAdmin from "./components/pages/RiskRadar/RiskRadarAdmin";
import RiskRadarConfirm from "./components/pages/RiskRadar/RiskRadarConfirm";

function App() {
  return (
    <main>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Routes>
            <Route path="*" element={<Index />} />
            {/*  <Route path="/iscrizione" element={<Iscriviti />} /> */}{" "}
            {/* // ! Change when iscriviti api is online */}
            <Route
              path="/questionario-catastrofale/:idUid"
              element={<Questionario />}
            />
            <Route
              path="/questionario-catastrofale/"
              element={<Questionario />}
            />
            <Route path="/prezzo-giusto/*" element={<PrezzoGiusto />} />
            {/* Percorsi proposti da Alca per i documenti del servizio */}
            <Route
              path="/il-prezzo-giusto/condizioni"
              element={<Navigate to="/prezzo-giusto/condizioni" replace />}
            />
            <Route
              path="/il-prezzo-giusto/privacy"
              element={<Navigate to="/prezzo-giusto/privacy" replace />}
            />
            {/* Risk Radar Aziende (ALCA Broker): pagina per le aziende e dashboard commerciale */}
            <Route path="/risk-radar" element={<RiskRadar />} />
            <Route path="/risk-radar/admin" element={<RiskRadarAdmin />} />
            <Route path="/risk-radar/conferma" element={<RiskRadarConfirm />} />
          </Routes>
          <FloatingWhatsApp />
          <ModeToggle />
        </ThemeProvider>
      </Router>
    </main>
  );
}

export default App;
