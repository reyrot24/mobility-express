import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { selectClassName } from "./Field";

// Comuni italiani con sigla della provincia e CAP: public/comuni.json, generato da
// scripts/aggiorna-comuni.mjs con i dati ISTAT di github.com/matteocontrini/comuni-json
type Comune = { nome: string; sigla: string; cap: string[]; chiave: string };

const normalizza = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[’`]/g, "'")
    .toLowerCase()
    .trim();

// Caricato una sola volta, alla prima digitazione nel campo comune
let comuniPromise: Promise<Comune[]> | null = null;
function caricaComuni() {
  comuniPromise ??= fetch("/comuni.json")
    .then((response) => {
      if (!response.ok) throw new Error(String(response.status));
      return response.json() as Promise<[string, string, string[]][]>;
    })
    .then((righe) =>
      righe.map(([nome, sigla, cap]) => ({ nome, sigla, cap, chiave: normalizza(nome) }))
    )
    .catch((err) => {
      comuniPromise = null;
      throw err;
    });
  return comuniPromise;
}

const MAX_SUGGERIMENTI = 8;

// Prima i comuni che iniziano con il testo, poi quelli che lo contengono
function cerca(comuni: Comune[], testo: string) {
  const q = normalizza(testo);
  if (!q) return [];
  const inizio = comuni.filter((c) => c.chiave.startsWith(q));
  const contiene = comuni.filter((c) => !c.chiave.startsWith(q) && c.chiave.includes(q));
  return [...inizio, ...contiene].slice(0, MAX_SUGGERIMENTI);
}

const residenceLabel = "mb-1 block text-[11px] font-medium opacity-80";

/**
 * Comune con suggerimenti e CAP scelto tra quelli del comune.
 * Nel form arrivano come "city" e "zip". onChange avvisa il form quando cambia la validità.
 */
export const ComuneCap = ({ onChange }: { onChange?: () => void }) => {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [comuni, setComuni] = useState<Comune[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [testo, setTesto] = useState("");
  const [scelto, setScelto] = useState<Comune | null>(null);
  const [cap, setCap] = useState("");
  const [aperto, setAperto] = useState(false);
  const [attivo, setAttivo] = useState(0);

  const suggerimenti = comuni && !scelto ? cerca(comuni, testo) : [];
  const mostraElenco = aperto && suggerimenti.length > 0;

  function carica() {
    if (comuni) return;
    caricaComuni()
      .then((lista) => {
        setComuni(lista);
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }

  // Il comune è valido solo se scelto dall'elenco. Se l'elenco non si carica, il testo libero è accettato.
  useEffect(() => {
    inputRef.current?.setCustomValidity(
      scelto || loadError || !testo ? "" : "Seleziona il comune dall’elenco."
    );
    onChange?.();
  }, [scelto, cap, testo, loadError, onChange]);

  function scegli(comune: Comune) {
    setScelto(comune);
    setTesto(comune.nome);
    setCap(comune.cap.length === 1 ? comune.cap[0] : "");
    setAperto(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!mostraElenco) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const passo = event.key === "ArrowDown" ? 1 : -1;
      setAttivo((i) => (i + passo + suggerimenti.length) % suggerimenti.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      scegli(suggerimenti[attivo]);
    } else if (event.key === "Escape") {
      setAperto(false);
    }
  }

  const listId = `${id}-comuni`;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_96px] gap-2">
      <div className="relative">
        <label htmlFor={`${id}-comune`} className={residenceLabel}>
          Comune
        </label>
        <Input
          ref={inputRef}
          id={`${id}-comune`}
          name="city"
          value={testo}
          placeholder="Es. Milano"
          maxLength={80}
          required
          autoComplete="off"
          role="combobox"
          aria-expanded={mostraElenco}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={mostraElenco ? `${listId}-${attivo}` : undefined}
          onFocus={() => {
            carica();
            setAperto(true);
          }}
          onBlur={() => setAperto(false)}
          onKeyDown={onKeyDown}
          onChange={(event) => {
            carica();
            setTesto(event.target.value);
            setScelto(null);
            setCap("");
            setAperto(true);
            setAttivo(0);
          }}
        />
        {scelto && (
          <span
            className="pointer-events-none absolute bottom-0 right-3 flex h-10 items-center text-xs font-semibold text-blueText opacity-70"
            aria-hidden="true"
          >
            {scelto.sigla}
          </span>
        )}
        {mostraElenco && (
          <ul
            id={listId}
            role="listbox"
            className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-auto rounded-md border border-blueText bg-white py-1 text-sm text-blueText shadow-lg"
          >
            {suggerimenti.map((comune, i) => (
              <li
                key={`${comune.nome}-${comune.sigla}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === attivo}
                className={cn(
                  "flex cursor-pointer justify-between gap-2 px-3 py-2",
                  i === attivo && "bg-[#fff0e3]"
                )}
                // mousedown: arriva prima del blur dell'input, che chiuderebbe l'elenco
                onMouseDown={(event) => {
                  event.preventDefault();
                  scegli(comune);
                }}
                onMouseEnter={() => setAttivo(i)}
              >
                <span className="truncate">{comune.nome}</span>
                <span className="shrink-0 text-xs opacity-70">{comune.sigla}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-cap`} className={residenceLabel}>
          CAP
        </label>
        {loadError ? (
          <Input
            id={`${id}-cap`}
            name="zip"
            value={cap}
            onChange={(event) => setCap(event.target.value)}
            placeholder="20100"
            maxLength={5}
            inputMode="numeric"
            required
            autoComplete="postal-code"
          />
        ) : (
          <select
            id={`${id}-cap`}
            name="zip"
            value={cap}
            onChange={(event) => setCap(event.target.value)}
            required
            disabled={!scelto}
            className={cn(selectClassName, "disabled:cursor-not-allowed disabled:opacity-50")}
          >
            <option value="" disabled>
              {scelto ? "Scegli" : "—"}
            </option>
            {scelto?.cap.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
};
