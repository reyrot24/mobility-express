import "./App.css";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Index from "./components/pages/Main";
import Iscriviti from "./components/pages/Registrazione/Iscriviti";
import { ThemeProvider } from "./components/dark-mode/theme-provider";
import { ModeToggle } from "./components/dark-mode/mode-toggle";
import Questionario from "./components/pages/Questionario/Questionario";

function App() {
  return (
    <main>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/iscrizione" element={<Iscriviti />} />
            <Route
              path="/questionario-catastrofale/:idUid"
              element={<Questionario />}
            />
            <Route
              path="/questionario-catastrofale/"
              element={<Questionario />}
            />
          </Routes>
          <ModeToggle />
        </ThemeProvider>
      </Router>
    </main>
  );
}

export default App;
