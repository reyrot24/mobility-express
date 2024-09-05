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

const Index = () => {
  return (
    <div className="text-text">
      <Navbar logos={logos} />
      <Header />
      <Caratteristiche />
      <Image />
      <FAQs />
      <Testimonianze />
      <CTA />
      <Contattaci />
      <Footer logos={logos} />
    </div>
  );
};

export default Index;
