import { WhatsAppButton } from "@/components/ui/FloatingWhatsApp";
import { usePrezzoGiusto } from "../context/PrezzoGiustoContext";
import { whatsappLink } from "../utils/pagina";

/** Chat con il referente del link. Senza il suo numero di WhatsApp l'icona non compare. */
export const PgWhatsApp = () => {
  const { activeRef } = usePrezzoGiusto();
  return activeRef.whatsapp ? <WhatsAppButton href={whatsappLink(activeRef.whatsapp)} /> : null;
};
