import { Link } from "react-router-dom";
import { PG_BASE } from "../utils/model";

export const Brand = () => (
  <Link
    to={PG_BASE}
    className="flex items-center gap-3 whitespace-nowrap text-base font-bold leading-tight tracking-tight"
  >
    <span
      className="grid size-9 place-items-center rounded-md bg-orange text-xl text-blueText"
      aria-hidden="true"
    >
      ✓
    </span>
    <span>
      il prezzo giusto
      <span className="block text-sm font-semibold">per te.</span>
    </span>
  </Link>
);
