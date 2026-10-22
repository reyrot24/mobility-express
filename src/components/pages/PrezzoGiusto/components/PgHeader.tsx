import { Link } from "react-router-dom";
import { Brand } from "./Brand";
import { useAuth } from "../context/AuthContext";
import { PG_BASE } from "../utils/model";

const actionClass =
  "rounded-md border border-orange bg-background2 px-4 py-2.5 hover:bg-hoverWhiteOrange dark:hover:bg-blueBgDark";

export const PgHeader = () => {
  const { session } = useAuth();

  return (
    <header className="flex items-center justify-between gap-4 border-b border-orange bg-background1 px-[5%] py-5">
      <Brand />
      <nav
        aria-label="Navigazione Il prezzo giusto per te"
        className="flex items-center gap-4 text-xs font-medium md:gap-8"
      >
        {/* Torna al form mantenendo il referente attivo; da loggato si usa "Nuova richiesta" nell'area */}
        {!session && (
          <Link to={PG_BASE} className="hover:text-orangeHover">
            Richiedi una stima
          </Link>
        )}
        <Link
          to={`${PG_BASE}/come-funziona`}
          className="hidden hover:text-orangeHover md:block"
        >
          Come funziona
        </Link>
        <Link to={`${PG_BASE}/${session ? "area" : "accesso"}`} className={actionClass}>
          Area personale
        </Link>
      </nav>
    </header>
  );
};
