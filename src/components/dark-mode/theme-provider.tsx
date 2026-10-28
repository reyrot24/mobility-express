import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

type ThemeProviderStateExtended = ThemeProviderState & {
  effectiveTheme: "light" | "dark";
  /** Tema imposto da una pagina (es. pagina personalizzata del referente): ignora la scelta dell'utente */
  forcedTheme: "light" | "dark" | null;
  setForcedTheme: (theme: "light" | "dark" | null) => void;
};

const initialState: ThemeProviderStateExtended = {
  theme: "system",
  setTheme: () => null,
  effectiveTheme: "light",
  forcedTheme: null,
  setForcedTheme: () => null,
};

const ThemeProviderContext =
  createContext<ThemeProviderStateExtended>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme,
  );
  const [forcedTheme, setForcedTheme] = useState<"light" | "dark" | null>(null);

  const getEffectiveTheme = (): "light" | "dark" => {
    if (forcedTheme) return forcedTheme;
    if (theme === "system") {
      if (typeof window === "undefined") return "light";
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return theme;
  };

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    const applied = getEffectiveTheme();
    root.classList.add(applied);

    // If theme is 'system', listen for changes and update root class accordingly
    let mql: MediaQueryList | null = null;
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === "system" && !forcedTheme) {
        const newApplied = e.matches ? "dark" : "light";
        root.classList.remove("light", "dark");
        root.classList.add(newApplied);
      }
    };

    if (theme === "system" && !forcedTheme && typeof window !== "undefined") {
      mql = window.matchMedia("(prefers-color-scheme: dark)");
      if (mql.addEventListener) mql.addEventListener("change", handleChange);
      else if (mql.addListener) mql.addListener(handleChange as any);
    }

    return () => {
      if (mql) {
        if (mql.removeEventListener)
          mql.removeEventListener("change", handleChange);
        else if (mql.removeListener) mql.removeListener(handleChange as any);
      }
    };
  }, [theme, forcedTheme]);

  const value: ThemeProviderStateExtended = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    effectiveTheme: getEffectiveTheme(),
    forcedTheme,
    setForcedTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
