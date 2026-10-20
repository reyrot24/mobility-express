// Referenti noti al server. I contatti nell'email arrivano sempre da qui, mai dal browser.
// TODO: sostituire con l'API referral della piattaforma devops.
const REFERENTI = {
  "DEMO-STUDIO": {
    id: "DEMO-STUDIO",
    name: "Giulia Bianchi",
    phone: "+39 000 000 0000",
    email: "stima@polizzexpress.it",
  },
};

export const findReferente = (id) =>
  Object.hasOwn(REFERENTI, id) ? REFERENTI[id] : null;
