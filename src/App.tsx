import "./App.css";
import { Caratteristiche } from "./components/sections/Caratteristiche";
import { Contattaci } from "./components/sections/Contattaci";
import { CTA } from "./components/sections/CTA";
import { FAQs } from "./components/sections/FAQs";
import { Footer } from "./components/sections/Footer";
import { Header } from "./components/sections/Header";
import { Image } from "./components/sections/Image";
import { Navbar } from "./components/sections/Navbar";
import Testimonianze from "./components/sections/Testimonianze";
import { ThemeProvider } from "./components/dark-mode/theme-provider";
import { logo } from "./constants/images";
import { ModeToggle } from "./components/dark-mode/mode-toggle";

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="text-text">
        <Navbar logo={logo} />
        <Header />
        <Caratteristiche />
        <Image />
        <FAQs />
        <Testimonianze />
        <CTA />
        <Contattaci />
        <Footer logo={logo} />
        <ModeToggle />
      </div>
    </ThemeProvider>
  );
}

export default App;
