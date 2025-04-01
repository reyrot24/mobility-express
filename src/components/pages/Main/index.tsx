import { Header } from "./sections/Header";
import { Navbar } from "./sections/Navbar";
import { Caratteristiche } from "./sections/Caratteristiche";
import { Image } from "./sections/Image";
import { FAQs } from "./sections/FAQs";
import Testimonianze from "./sections/Testimonianze";
import { CTA } from "./sections/CTA";
import { Contattaci } from "./sections/Contattaci";
import { Footer } from "./sections/Footer";
import { logos } from "@/constants/images";
import {
  IubendaCookieSolutionBannerConfigInterface,
  IubendaProvider,
} from "@/lib/iubenda";

export const iubendaBannerConfig: IubendaCookieSolutionBannerConfigInterface = {
  siteId: 3983567, // Your site ID
  cookiePolicyId: 42238510, // Your cookie policy ID
  lang: "it",
  floatingPreferencesButtonDisplay: "bottom-left",

  // See https://www.iubenda.com/en/help/1205-how-to-configure-your-cookie-solution-advanced-guide
};
const Index = () => {
  return (
    <div className="text-text">
      <IubendaProvider bannerConfig={iubendaBannerConfig}>
        <Navbar logos={logos} />
        <Header />
        <Caratteristiche />
        <Image />
        <FAQs />
        <Testimonianze />
        <CTA />
        <Contattaci />
        <Footer logos={logos} />
      </IubendaProvider>
    </div>
  );
};

export default Index;
