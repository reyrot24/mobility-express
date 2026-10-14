import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { PrezzoGiustoProvider } from "./context/PrezzoGiustoContext";
import { AuthProvider } from "./context/AuthContext";
import { PgHeader } from "./components/PgHeader";
import { PgFooter } from "./components/PgFooter";
import Landing from "./pages/Landing";
import Inviata from "./pages/Inviata";
import Accesso from "./pages/Accesso";
import AreaPersonale from "./pages/AreaPersonale";
import DettaglioStima from "./pages/DettaglioStima";
import ComeFunziona from "./pages/ComeFunziona";
import ReimpostaPassword from "./pages/ReimpostaPassword";
import Attivazione from "./pages/Attivazione";
import { PaginaNonTrovata } from "./pages/Messaggi";

const titles: Record<string, string> = {
  area: "La tua area",
  accesso: "La tua area",
  "reimposta-password": "Reimposta la password",
  attiva: "Attiva la tua area",
};

// Le pagine "a tutta larghezza" gestiscono da sole i propri margini
const Contained = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[65vh] px-[5%] pb-16 pt-8">{children}</div>
);

const PrezzoGiusto = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
    const section = pathname.split("/")[2] ?? "";
    document.title = `${titles[section] ?? "Il prezzo giusto per te"} · Mobility Express`;
  }, [pathname]);

  return (
    <AuthProvider>
      <PrezzoGiustoProvider>
        <div className="bg-background1 text-sm text-text">
          <PgHeader />
          <main>
            <Routes>
              <Route index element={<Landing />} />
              <Route path="come-funziona" element={<ComeFunziona />} />
              <Route
                path="inviata"
                element={
                  <Contained>
                    <Inviata />
                  </Contained>
                }
              />
              <Route
                path="accesso"
                element={
                  <Contained>
                    <Accesso />
                  </Contained>
                }
              />
              <Route
                path="reimposta-password"
                element={
                  <Contained>
                    <ReimpostaPassword />
                  </Contained>
                }
              />
              <Route
                path="area"
                element={
                  <Contained>
                    <AreaPersonale />
                  </Contained>
                }
              />
              <Route
                path="area/stima/:id"
                element={
                  <Contained>
                    <DettaglioStima />
                  </Contained>
                }
              />
              <Route
                path="attiva"
                element={
                  <Contained>
                    <Attivazione />
                  </Contained>
                }
              />
              {/* Link di devops con il codice del referente: /prezzo-giusto/<codice> */}
              <Route path=":codice" element={<Landing />} />
              <Route
                path="*"
                element={
                  <Contained>
                    <PaginaNonTrovata />
                  </Contained>
                }
              />
            </Routes>
          </main>
          <PgFooter />
          <Toaster position="top-right" />
        </div>
      </PrezzoGiustoProvider>
    </AuthProvider>
  );
};

export default PrezzoGiusto;
