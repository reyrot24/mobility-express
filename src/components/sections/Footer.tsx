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
} from "../ui/dialog";
import { Button } from "../ui/button";
import Privacy from "../pages/Privacy";

type ImageProps = {
  url?: string;
  src: string;
  alt?: string;
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
  logo: ImageProps;
  socialMediaLinks: SocialMediaLinks[];
  footerText: string;
  footerLinks: FooterLink[];
};

export type Footer4Props = React.ComponentPropsWithoutRef<"section"> &
  Partial<Props>;

export const Footer = (props: Footer4Props) => {
  const { logo, footerText, footerLinks, socialMediaLinks } = {
    ...Footer4Defaults,
    ...props,
  } as Props;
  return (
    <footer className="px-[5%] pt-18 md:pt-20 md:pt-25 pb-10 bg-background1">
      <div className="container">
        <div className="grid grid-cols-1 items-center justify-center justify-items-center gap-x-[4vw] gap-y-12 pb-12 md:pb-18 lg:flex lg:justify-between lg:gap-y-4 lg:pb-20">
          <a href={logo.url} className="lg:justify-self-start">
            <img src={logo.src} alt={logo.alt} className="inline-block w-28" />
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
            Il servizio di intermediazione assicurativa è offerto da Alca Broker
            Srl, broker assicurativo regolamentato dall'IVASS ed iscritto al RUI
            con numero B000514026, P.IVA 07965051217, Indirizzo: VIA VITTORIA
            COLONNA 14 - 80121 NAPOLI (NA)- PEC: alcabrokersrl@legalmail.it -
            Telefono: +39 081 529 70 45.
          </p>
        </div>
        <ul className="pb-4 flex items-center justify-center gap-x-8 gap-y-4 text-sm md:grid-flow-col md:gap-x-6 md:gap-y-0">
          {footerLinks.map((link, index) => (
            <Dialog>
              <DialogTrigger asChild>
                <li
                  key={index}
                  className="underline decoration-text cursor-pointer hover:decoration-whiteHover underline-offset-1 hover:text-whiteHover "
                >
                  {link.title}
                </li>
              </DialogTrigger>
              <DialogContent className="h-[500px] overflow-auto">
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
  footerText: "© 2024 Alca Broker srl. Tutti i diritti riservati.",
  footerLinks: [
    { page: <Privacy />, title: "Privacy Policy" },
    { page: "", title: "Termini di Servizio" },
    { page: "", title: "Cookie Policy" },
  ],
};
