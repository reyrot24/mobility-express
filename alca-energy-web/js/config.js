/* Configurazione pubblica della versione con accessi personali (Alca Energy su Supabase).
   Contiene SOLO l'indirizzo del progetto e la chiave pubblicabile: non è un segreto, i permessi li applica il database.
   Le chiavi segrete (service role, Anthropic) restano sul server. Per tornare alla versione locale senza server: cancella i due valori. */
window.ALCA_CONFIG = {
  supabaseUrl: "https://cbuypaehnqvdsgonkewo.supabase.co",
  supabaseKey: "sb_publishable_ybEIOV7X-KndOEyDDe3AwA_nZXGEt1W",
  appUrl: "https://alcaenergia.it"   // indirizzo pubblicato: usato nei link di invito e recupero password
};
