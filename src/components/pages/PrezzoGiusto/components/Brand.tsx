import { Link } from "react-router-dom";
import { PG_BASE } from "../utils/model";
import { NAVBAR_STANDARD } from "../utils/pagina";

type Props = {
  /** Logo del referente dalla sua pagina personalizzata: prende il posto della ✓ */
  logo?: string | null;
  logoAlt?: string;
  title?: string;
  subtitle?: string | null;
};

export const Brand = ({
  logo,
  logoAlt = "",
  title = NAVBAR_STANDARD.titolo,
  subtitle = NAVBAR_STANDARD.sottotitolo,
}: Props) => (
  <Link
    to={PG_BASE}
    className="flex min-w-0 items-center gap-3 whitespace-nowrap text-base font-bold leading-tight tracking-tight"
  >
    {logo ? (
      <img
        src={logo}
        alt={logoAlt}
        className="h-9 w-auto min-w-0 max-w-[96px] flex-none object-contain md:h-11 md:max-w-[140px]"
      />
    ) : (
      <span
        className="grid size-9 flex-none place-items-center rounded-md bg-orange text-xl text-blueText"
        aria-hidden="true"
      >
        ✓
      </span>
    )}
    <span className="min-w-0">
      <span className="block truncate">{title}</span>
      {subtitle && <span className="block truncate text-sm font-semibold">{subtitle}</span>}
    </span>
  </Link>
);
