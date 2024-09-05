import { FaXTwitter } from "react-icons/fa6";
import {
  BiLogoFacebookCircle,
  BiLogoInstagram,
  BiLogoLinkedinSquare,
  BiLogoYoutube,
} from "react-icons/bi";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "../../../ui/dialog";
import { Button } from "../../../ui/button";
import Privacy from "../../Legali/Privacy";
import TerminiDiServizio from "../../Legali/TerminiDiServizio";
import CookiePolicy from "../../Legali/CookiePolicy";
import { useTheme } from "../../../dark-mode/theme-provider";

type ImageProps = {
  url?: string;
  src: string;
  alt?: string;
};

type logosType = {
  logoDark: ImageProps;
  logoLight: ImageProps;
};

type SocialMediaLinks = {
  url: string;
  icon: React.ReactNode;
};

type FooterLink = {
  page: any;
  title: string;
};

type Props = {
  logos: logosType;
  socialMediaLinks: SocialMediaLinks[];
  footerText: string;
  footerLinks: FooterLink[];
};

export type Footer4Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Footer = (props: Footer4Props) => {
  const { logos, footerText, footerLinks, socialMediaLinks } = {
    ...Footer4Defaults,
    ...props,
  } as Props;
  const { theme } = useTheme();
  return (
    <footer className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-10 bg-background1">
      <div className="container">
        <div className="grid grid-cols-1 items-center justify-center justify-items-center gap-x-[4vw] gap-y-12 pb-12 md:pb-18 lg:flex lg:justify-between lg:gap-y-4 lg:pb-20">
          <a href="/" className="lg:justify-self-start">
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
                className="w-28"
              />
            )}
          </a>

          <div className="flex items-start justify-start justify-items-center gap-x-3 lg:justify-self-end">
            {socialMediaLinks.map((link, index) => (
              <a key={index} href={link.url}>
                {link.icon}
              </a>
            ))}
          </div>
        </div>
        <div className="flex mb-8 items-center justify-center text-xs md:gap-x-6 md:pt-4">
          <p>
            Mobility Express è un marchio di Alca Broker srl. Il servizio di
            intermediazione assicurativa è offerto da Alca Broker srl, broker
            assicurativo regolamentato dall'IVASS ed iscritto al RUI con numero
            B000514026, P.IVA 07965051217, Indirizzo: VIA VITTORIA COLONNA 14 -
            80121 NAPOLI (NA)- PEC: alcabrokersrl@legalmail.it - Telefono: +39
            081 529 70 45.
          </p>
        </div>
        <ul className="pb-4 flex items-center justify-center gap-x-8 gap-y-4 text-sm md:grid-flow-col md:gap-x-6 md:gap-y-0">
          {footerLinks.map((link, index) => (
            <Dialog key={index}>
              <DialogTrigger asChild>
                <li className="underline cursor-pointer hover:decoration-orangeHover underline-offset-1 hover:text-orangeHover ">
                  {link.title}
                </li>
              </DialogTrigger>
              <DialogContent className="h-[500px] overflow-auto no-scrollbar">
                {link.page}
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="default">
                      Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
        </ul>

        <div className="h-px w-full bg-whiteHover" />
        <div className="flex items-center justify-center text-sm md:flex-row md:gap-x-6 md:pb-0 md:pt-8">
          <p className="mt-8 md:mt-0">{footerText}</p>
        </div>
      </div>
    </footer>
  );
};

export const Footer4Defaults: Footer4Props = {
  socialMediaLinks: [
    { url: "#", icon: <BiLogoFacebookCircle className="size-6" /> },
    { url: "#", icon: <BiLogoInstagram className="size-6" /> },
    { url: "#", icon: <FaXTwitter className="size-6 p-0.5" /> },
    { url: "#", icon: <BiLogoLinkedinSquare className="size-6" /> },
    { url: "#", icon: <BiLogoYoutube className="size-6" /> },
  ],
  footerText: "© 2024 Alca Broker Srl. Tutti i diritti riservati.",
  footerLinks: [
    { page: <Privacy />, title: "Privacy Policy" },
    { page: <TerminiDiServizio />, title: "Termini di Servizio" },
    { page: <CookiePolicy />, title: "Cookie Policy" },
  ],
};
