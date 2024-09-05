import "./App.css";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Index from "./components/pages/Main";
import Iscriviti from "./components/pages/Registrazione/Iscriviti";
import { ThemeProvider } from "./components/dark-mode/theme-provider";
import { ModeToggle } from "./components/dark-mode/mode-toggle";

function App() {
  return (
    <main>
      <Router>
        <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/iscrizione" element={<Iscriviti />} />
          </Routes>
          <ModeToggle />
        </ThemeProvider>
      </Router>
    </main>
  );
}

export default App;
