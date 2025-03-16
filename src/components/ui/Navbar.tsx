import { ArrowLeftIcon } from "lucide-react";
import { useTheme } from "../dark-mode/theme-provider";
import { logos } from "@/constants/images";

const Navbar = () => {
  const { theme } = useTheme();
  return (
    <nav className="w-full grid grid-cols-3 border-b border-orange bg-background1 top-0 fixed z-50 min-h-16 ">
      <div className="flex justify-start items-center">
        <a href="/" className="ml-4">
          <ArrowLeftIcon className="text-text hover:text-orangeHover" />
        </a>
      </div>
      <a href="/" className="flex justify-center items-center">
        {theme === "light" ? (
          <img
            src={logos.logoLight.src}
            alt={logos.logoLight.alt}
            className="w-28"
          />
        ) : (
          <img
            src={logos.logoDark.src}
            alt={logos.logoDark.alt}
            className="w-24"
          />
        )}
      </a>
    </nav>
  );
};

export default Navbar;
