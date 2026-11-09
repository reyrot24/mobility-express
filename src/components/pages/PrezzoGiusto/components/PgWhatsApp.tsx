import { WhatsAppButton } from "@/components/ui/FloatingWhatsApp";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { whatsappLink } from "../utils/pagina";

const TARGA = /^[A-Z]{2}\d{3}[A-Z]{2}$/;

/**
 * Chat con il referente del link. Senza il suo numero di WhatsApp l'icona non compare.
 * Il messaggio cita la targa scritta nel form (o quella dell'ultima richiesta inviata) solo se è
 * completa; altrimenti dice "sulla mia targa".
 */
export const PgWhatsApp = () => {
  const { activeRef, targaForm, current } = usePrezzoGiusto();
  if (!activeRef.whatsapp) return null;
  const targa = [targaForm, current?.plate].find((t) => t && TARGA.test(t)) ?? null;
  return <WhatsAppButton href={whatsappLink(activeRef.whatsapp, targa)} />;
};
