import { Link, useLocation } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Brand } from "./Brand";
import { useAuth } from "../context/AuthContext";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { PG_BASE } from "../utils/model";
import { navbarTitles, surfaceStyle } from "../utils/pagina";

const actionClass =
  "rounded-md border border-orange bg-background2 px-4 py-2.5 hover:bg-hoverWhiteOrange dark:hover:bg-blueBgDark";

export const PgHeader = () => {
  const { session } = useAuth();
  const { pathname } = useLocation();
  // Da loggato, fuori dall'elenco dell'area personale (come funziona, documenti, dettaglio stima…)
  const fuoriDallArea = Boolean(session) && pathname !== `${PG_BASE}/area`;
  const { activePage, linkPath } = usePrezzoGiusto();
  const navbar = navbarTitles(activePage);
  const logoAlt =
    activePage?.navbar?.titolo ?? activePage?.referente.nome ?? "Il tuo referente";

  return (
    <header
      className="flex items-center justify-between gap-4 border-b border-orange bg-background1 px-[5%] py-5"
      style={surfaceStyle(activePage?.colori?.navbar)}
    >
      <Brand
        logo={activePage?.logo}
        logoAlt={logoAlt}
        title={navbar.titolo}
        subtitle={navbar.sottotitolo}
      />
      <nav
        aria-label="Navigazione Il prezzo giusto per te"
        className="flex items-center gap-4 text-xs font-medium md:gap-8"
      >
        {/* Torna al form mantenendo il referente attivo; da loggato si usa "Nuova richiesta" nell'area */}
        {!session && (
          <Link to={linkPath} className="hover:text-orangeHover">
            Richiedi una stima
          </Link>
        )}
        {fuoriDallArea && (
          <Link
            to={`${PG_BASE}/area`}
            className="inline-flex items-center gap-0.5 font-semibold hover:text-orangeHover"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Torna all’area personale</span>
            <span className="sm:hidden">La mia area</span>
          </Link>
        )}
        <Link
          to={`${PG_BASE}/come-funziona`}
          className="hidden hover:text-orangeHover md:block"
        >
          Come funziona
        </Link>
        {/* Da loggato: di chi è l'area personale, solo testo */}
        {session ? (
          <span
            className="max-w-[45vw] truncate rounded-md border border-orange bg-background2 px-4 py-2.5 md:max-w-xs"
            title={session.user.email}
          >
            {session.user.email}
          </span>
        ) : (
          <Link to={`${PG_BASE}/accesso`} className={actionClass}>
            Area personale
          </Link>
        )}
      </nav>
    </header>
  );
};
