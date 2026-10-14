import { createContext, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { cambiaPassword } from "../utils/api";
import { PG_BASE } from "../utils/model";

type AuthState = {
  session: Session | null;
  /** true finché non sappiamo se c'è una sessione salvata */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (password: string) => Promise<void>;
  sendResetLink: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const loginError = (message: string) =>
  /invalid login credentials/i.test(message)
    ? "Email o password non corretti."
    : /rate limit|too many/i.test(message)
      ? "Troppi tentativi. Riprova tra qualche minuto."
      : "Accesso non riuscito. Riprova tra qualche minuto.";

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    loading,

    async signIn(email, password) {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw new Error(loginError(error.message));
    },

    async signOut() {
      await supabase.auth.signOut();
    },

    async changePassword(password) {
      if (!session) throw new Error("Accedi di nuovo alla tua area personale.");
      await cambiaPassword(password, session.access_token);
      // Il cambio password chiude tutte le sessioni: rientriamo con la nuova
      const { error } = await supabase.auth.signInWithPassword({
        email: session.user.email ?? "",
        password,
      });
      if (error) throw new Error("Password aggiornata. Accedi di nuovo con la nuova password.");
    },

    async sendResetLink(email) {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: `${window.location.origin}${PG_BASE}/reimposta-password` }
      );
      if (error && !/rate limit/i.test(error.message))
        throw new Error("Invio non riuscito. Riprova tra qualche minuto.");
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth deve essere usato dentro AuthProvider");
  return context;
};
