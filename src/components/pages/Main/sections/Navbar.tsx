import { useState } from "react";
import type { ButtonProps } from "@relume_io/relume-ui";
import { motion } from "framer-motion";
import { Button } from "../../../ui/button";
import { useTheme } from "../../../dark-mode/theme-provider";
import { Link } from "react-router-dom";

type ImageProps = {
  url?: string;
  src: string;
  alt?: string;
};

type logosType = {
  logoDark: ImageProps;
  logoLight: ImageProps;
};

type NavLink = {
  url: string;
  title: string;
};

type Props = {
  logos: logosType;
  navLinks: NavLink[];
  buttons: ButtonProps[];
};

export type Navbar1Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Navbar = (props: Navbar1Props) => {
  const { logos, navLinks } = {
    ...Navbar1Defaults,
    ...props,
  } as Props;

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  return (
    <nav className="flex w-full items-center border-b border-orange bg-background1 lg:min-h-18 lg:px-[5%] top-0 fixed z-50">
      <div className="size-full lg:flex lg:items-center lg:justify-between">
        <div className="lg:flex">
          <div className="flex min-h-16 items-center justify-between px-[5%] md:min-h-18 lg:min-h-full lg:px-0">
            <a href="/">
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
            <button
              className="-mr-2 flex size-12 flex-col items-center justify-center lg:hidden"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <motion.span
                className="my-[3px] h-0.5 w-6 bg-text"
                animate={isMobileMenuOpen ? ["open", "rotatePhase"] : "closed"}
                variants={topLineVariants}
              />
              <motion.span
                className="my-[3px] h-0.5 w-6 bg-text"
                animate={isMobileMenuOpen ? "open" : "closed"}
                variants={middleLineVariants}
              />
              <motion.span
                className="my-[3px] h-0.5 w-6 bg-text"
                animate={isMobileMenuOpen ? ["open", "rotatePhase"] : "closed"}
                variants={bottomLineVariants}
              />
            </button>
          </div>
          <motion.div
            variants={{
              open: {
                height: "var(--height-open, 100dvh)",
              },
              close: {
                height: "var(--height-closed, 0)",
              },
            }}
            initial="close"
            exit="close"
            animate={isMobileMenuOpen ? "open" : "close"}
            transition={{ duration: 0.4 }}
            className="overflow-hidden px-[5%] lg:flex lg:items-center lg:px-0 lg:[--height-closed:auto] lg:[--height-open:auto]"
          >
            {navLinks.map((navLink, index) => (
              <div key={index} className="first:pt-4 lg:first:pt-0 ">
                <a
                  href={navLink.url}
                  className="block py-3 text-md lg:px-4 lg:py-2 lg:text-base hover:text-orangeHover"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                >
                  {navLink.title}
                </a>
              </div>
            ))}
            <div className="mt-6 flex w-full flex-col gap-y-4 pb-24 lg:hidden lg:pb-0">
              <Link to="/iscrizione">
                <Button className="w-full" variant="outlineToggle">
                  Iscriviti
                </Button>
              </Link>

              <a
                href="https://tidycal.com/sviluppo/introduzione-mobility-express"
                rel="noopener noreferrer"
                target="_blank"
              >
                <Button className="w-full">Prenota</Button>
              </a>
            </div>
          </motion.div>
        </div>
        <div className="hidden lg:flex lg:gap-4">
          <Link to="/iscrizione">
            <Button className="w-full" variant="outlineToggle">
              Iscriviti
            </Button>
          </Link>

          <a
            href="https://tidycal.com/sviluppo/introduzione-mobility-express"
            rel="noopener noreferrer"
            target="_blank"
          >
            <Button className="w-full">Prenota</Button>
          </a>
        </div>
      </div>
    </nav>
  );
};

export const Navbar1Defaults: Navbar1Props = {
  navLinks: [
    { title: "Home", url: "#Home" },
    { title: "Caratteristiche", url: "#Caratteristiche" },
    { title: "FAQs", url: "#FAQs" },
    {
      title: "Testimonianze",
      url: "#Testimonianze",
    },
    {
      title: "Contattaci",
      url: "#Contattaci",
    },
  ],
  buttons: [
    {
      title: "Button",
      variant: "secondary",
      size: "sm",
    },
    {
      title: "Button",
      size: "sm",
    },
  ],
};

const topLineVariants = {
  open: {
    translateY: 8,
    transition: { delay: 0.1 },
  },
  rotatePhase: {
    rotate: -45,
    transition: { delay: 0.2 },
  },
  closed: {
    translateY: 0,
    rotate: 0,
    transition: { duration: 0.2 },
  },
};

const middleLineVariants = {
  open: {
    width: 0,
    transition: { duration: 0.1 },
  },
  closed: {
    width: "1.5rem",
    transition: { delay: 0.3, duration: 0.2 },
  },
};

const bottomLineVariants = {
  open: {
    translateY: -8,
    transition: { delay: 0.1 },
  },
  rotatePhase: {
    rotate: 45,
    transition: { delay: 0.2 },
  },
  closed: {
    translateY: 0,
    rotate: 0,
    transition: { duration: 0.2 },
  },
};
