// Rigenera public/comuni.json (comune, sigla provincia, CAP) dai dati ISTAT di
// https://github.com/matteocontrini/comuni-json. Uso: node scripts/aggiorna-comuni.mjs
import { writeFile } from "node:fs/promises";

const SORGENTE = "https://raw.githubusercontent.com/matteocontrini/comuni-json/master/comuni.json";

const response = await fetch(SORGENTE);
if (!response.ok) throw new Error(`Download non riuscito: ${response.status}`);
const comuni = await response.json();

// Formato compatto: [nome, sigla, [cap...]]
const righe = comuni
  .map((c) => [c.nome, c.sigla, [...c.cap].sort()])
  .sort((a, b) => a[0].localeCompare(b[0], "it"));

await writeFile(new URL("../public/comuni.json", import.meta.url), JSON.stringify(righe));
console.log(`public/comuni.json: ${righe.length} comuni`);
