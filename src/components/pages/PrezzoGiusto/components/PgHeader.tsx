import { Link, useNavigate } from "react-router-dom";
import { Brand } from "./Brand";
import { useAuth } from "../context/AuthContext";
import { PG_BASE } from "../utils/model";

const actionClass =
  "rounded-md border border-orange bg-background2 px-4 py-2.5 hover:bg-hoverWhiteOrange dark:hover:bg-blueBgDark";

export const PgHeader = () => {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await signOut();
    navigate(PG_BASE);
  }

  return (
    <header className="flex items-center justify-between gap-4 border-b border-orange bg-background1 px-[5%] py-5">
      <Brand />
      <nav
        aria-label="Navigazione Il prezzo giusto per te"
        className="flex items-center gap-8 text-xs font-medium"
      >
        <Link
          to={`${PG_BASE}/come-funziona`}
          className="hidden hover:text-orangeHover md:block"
        >
          Come funziona
        </Link>
        {session ? (
          <button type="button" onClick={logout} className={actionClass}>
            Esci
          </button>
        ) : (
          <Link to={`${PG_BASE}/accesso`} className={actionClass}>
            Area personale
          </Link>
        )}
      </nav>
    </header>
  );
};
