import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Eyebrow, Panel } from "../components/Surface";
import { PasswordForm } from "../components/PasswordForm";
import { useAuth } from "../context/AuthContext";
import { Caricamento, CenterMessage } from "./Messaggi";
import { PG_BASE } from "../utils/model";

// Pagina di arrivo del link "password dimenticata": Supabase apre la sessione dal link.
const ReimpostaPassword = () => {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return <Caricamento label="Verifica del link…" />;
  if (!session)
    return (
      <CenterMessage
        title="Questo link non è più valido."
        action={{ to: `${PG_BASE}/accesso`, label: "Richiedi un nuovo link" }}
      >
        I link per reimpostare la password scadono dopo un po’ di tempo e si
        possono usare una volta sola.
      </CenterMessage>
    );

  return (
    <Panel className="mx-auto my-8 max-w-lg">
      <Eyebrow className="mb-3">La tua area personale</Eyebrow>
      <h1 className="mb-6 text-2xl font-bold tracking-tight">
        Scegli una nuova password.
      </h1>
      <PasswordForm
        onSave={() => {
          toast.success("Password aggiornata.");
          navigate(`${PG_BASE}/area`, { replace: true });
        }}
      />
    </Panel>
  );
};

export default ReimpostaPassword;
