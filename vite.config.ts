import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync, writeFileSync } from "fs";
import path from "path";

// Anteprima dei link (WhatsApp, Facebook, LinkedIn…): i crawler leggono solo l'HTML statico, senza
// eseguire JavaScript. Dopo la build creiamo dist/prezzo-giusto.html, copia di index.html con titolo
// e descrizione del Prezzo Giusto; vercel.json la serve per /prezzo-giusto e /prezzo-giusto/*.
const PREZZO_GIUSTO = {
  titolo: "Il Prezzo Giusto per Te!",
  descrizione: "Il Prezzo Giusto per Te!",
  url: "https://polizzexpress.it/prezzo-giusto",
  // public/og-prezzo-giusto.jpg
  immagine: { url: "https://polizzexpress.it/og-prezzo-giusto.jpg", larghezza: 1200, altezza: 563 },
};

function htmlPrezzoGiusto(): Plugin {
  let outDir = "dist";
  return {
    name: "html-prezzo-giusto",
    apply: "build",
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
      const sostituzioni: [RegExp, string][] = [
        [/<title>[^<]*<\/title>/, `<title>${attr(PREZZO_GIUSTO.titolo)}</title>`],
        [/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${attr(PREZZO_GIUSTO.descrizione)}$2`],
        [/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${attr(PREZZO_GIUSTO.url)}$2`],
        [/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${attr(PREZZO_GIUSTO.titolo)}$2`],
        [/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${attr(PREZZO_GIUSTO.descrizione)}$2`],
        [/(<meta\s+property="og:image"\s+content=")[^"]*(")/, `$1${attr(PREZZO_GIUSTO.immagine.url)}$2`],
        [/(<meta\s+property="og:image:width"\s+content=")[^"]*(")/, `$1${PREZZO_GIUSTO.immagine.larghezza}$2`],
        [/(<meta\s+property="og:image:height"\s+content=")[^"]*(")/, `$1${PREZZO_GIUSTO.immagine.altezza}$2`],
      ];
      let html = readFileSync(path.join(outDir, "index.html"), "utf8");
      for (const [regex, valore] of sostituzioni) {
        // Se index.html cambia e un tag non si trova più, la build si ferma invece di pubblicare meta sbagliati
        if (!regex.test(html)) throw new Error(`[html-prezzo-giusto] tag non trovato in index.html: ${regex}`);
        html = html.replace(regex, valore);
      }
      writeFileSync(path.join(outDir, "prezzo-giusto.html"), html);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react(), htmlPrezzoGiusto()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Edge Function "api" in locale (npm run api:dev) per "Il prezzo giusto per te"
    proxy: {
      "/api": {
        target: "http://localhost:54321",
        rewrite: (path) => `/functions/v1${path}`,
      },
    },
  },
});
