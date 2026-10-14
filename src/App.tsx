import "./App.css";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Index from "./components/pages/Main";
import { ThemeProvider } from "./components/dark-mode/theme-provider";
import { FloatingWhatsApp } from "./components/ui/FloatingWhatsApp";
import Questionario from "./components/pages/Questionario/Questionario";
import PrezzoGiusto from "./components/pages/PrezzoGiusto/PrezzoGiusto";
import { ModeToggle } from "./components/dark-mode/mode-toggle";

function App() {
  return (
    <main>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Routes>
            <Route path="/" element={<Index />} />
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
          </Routes>
          <FloatingWhatsApp />
          <ModeToggle />
        </ThemeProvider>
      </Router>
    </main>
  );
}

export default App;
