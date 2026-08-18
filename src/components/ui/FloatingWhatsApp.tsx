import React from "react";
import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_LINK =
  "https://wa.me/393773937469?text=Ciao%2C%20sono%20un%20subagente%2C%20vorrei%20vedere%20la%20piattaforma";

export const FloatingWhatsApp: React.FC = () => {
  return (
    <a
      href={WHATSAPP_LINK}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Apri WhatsApp"
      className="fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 shadow-lg transition-colors hover:bg-green-700"
    >
      <FaWhatsapp size={36} color="white" />
    </a>
  );
};

export default FloatingWhatsApp;
