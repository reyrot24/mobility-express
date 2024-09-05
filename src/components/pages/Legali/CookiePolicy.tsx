const CookiePolicy = () => {
  return (
    <div>
      <h1 className="mb-5 text-3xl font-bold md:mb-6 md:text-4xl lg:text-5xl">
        Cookie Policy di www.alcabroker.it
      </h1>
      <div className="my-4">
        <h1 className="text-md font-semibold mb-2">INTRODUZIONE</h1>
        <p>
          Benvenuto su www.alcabroker.it (di seguito, il "Sito"). Questa Cookie
          Policy descrive l'uso dei cookie sul nostro Sito. Utilizziamo i cookie
          per migliorare la tua esperienza di navigazione e per offrire servizi
          in linea con le tue preferenze. Continuando a navigare o utilizzando i
          nostri servizi, accetti l'uso dei cookie secondo quanto descritto in
          questa policy.
        </p>
      </div>
      <div className="my-4">
        <h1 className="text-md font-semibold mb-2">COSA SONO I COOKIE</h1>
        <p>
          I cookie sono piccoli file di testo che i siti web visitati
          dall'utente inviano al suo dispositivo (solitamente al browser), dove
          vengono memorizzati per poi essere ritrasmessi agli stessi siti alla
          visita successiva. I cookie consentono al sito di riconoscere il
          dispositivo dell'utente e di memorizzare alcune informazioni sulle sue
          preferenze o azioni passate.
        </p>
      </div>
      <div className="my-4">
        <h1 className="text-md font-semibold mb-2">
          TIPOLOGIE DI COOKIE UTILIZZATI
        </h1>
        <p>
          <h2 className="text-base font-semibold my-4">Cookie Tecnici</h2>{" "}
          Questi cookie sono essenziali per il funzionamento del Sito e non
          richiedono il consenso dell'utente. Senza questi cookie, il Sito
          potrebbe non funzionare correttamente.
          <ul className="list-disc ml-8">
            <li>
              Cookie di Navigazione: Necessari per il corretto funzionamento del
              Sito.
            </li>
            <li>
              Cookie di Funzionalità: Permettono al Sito di ricordare le scelte
              effettuate dall'utente (come la lingua o la regione).
            </li>
          </ul>
          <h2 className="text-base font-semibold my-4">
            Cookie di Performance
          </h2>
          Questi cookie raccolgono informazioni sull'uso del Sito da parte degli
          utenti, come le pagine più visitate o eventuali messaggi di errore, e
          vengono utilizzati per migliorare le prestazioni del Sito. I dati
          raccolti da questi cookie sono aggregati e anonimi.
          <h2 className="text-base font-semibold my-4">
            Cookie di Profilazione
          </h2>
          Il Sito non utilizza cookie di profilazione per inviare messaggi
          pubblicitari personalizzati.
          <h2 className="text-base font-semibold my-4">
            Cookie di Terze Parti
          </h2>
          Il Sito può contenere collegamenti ad altri siti Web che dispongono di
          una propria informativa sulla privacy e cookie policy che possono
          essere diverse da quelle adottate da www.alcabroker.it, e di cui non
          siamo responsabili. Tali cookie possono includere:
          <ul className="list-disc ml-8">
            <li>
              <span className="font-semibold">Google Analytics</span>:
              Utilizzato per raccogliere informazioni sull'uso del Sito. Le
              informazioni generate da questi cookie verranno trasmesse e
              depositate presso i server di Google negli Stati Uniti.
            </li>
            <li>
              <span className="font-semibold">Plugin Social</span>: I cookie di
              terze parti relativi ai plugin di social network consentono di
              interagire con i contenuti dei diversi social network (ad esempio,
              il "Like" di Facebook).
            </li>
          </ul>
        </p>
      </div>
      <div className="my-4">
        <h1 className="text-md font-semibold  mb-2">COME GESTIRE I COOKIE</h1>
        <p>
          Puoi decidere di consentire o meno l'impostazione dei cookie
          modificando le impostazioni del tuo browser. La maggior parte dei
          browser consente di controllare i cookie attraverso le proprie
          impostazioni. Tuttavia, disabilitare i cookie potrebbe influenzare
          negativamente l'esperienza di navigazione sul Sito. Ecco i link alle
          guide per la gestione dei cookie nei principali browser:{" "}
          <ul className="list-disc ml-8">
            <li>Google Chrome</li>
            <li>Mozilla Firefox</li>
            <li>Safari</li>
            <li>Internet Explorer</li>
          </ul>
        </p>
      </div>
      <div className="my-4">
        <h1 className="text-md font-semibold  mb-2">
          MODIFICHE ALLA COOKIE POLICY
        </h1>
        <p>
          Ci riserviamo il diritto di modificare questa Cookie Policy in
          qualsiasi momento. Ogni modifica sarà pubblicata su questa pagina. Ti
          consigliamo di verificare periodicamente questa pagina per eventuali
          aggiornamenti.
        </p>
      </div>
      <div className="my-4">
        <h1 className="text-md font-semibold  mb-2">CONTATTI</h1>
        <p>
          Per ulteriori informazioni su questa Cookie Policy o per esercitare i
          tuoi diritti relativi alla privacy, puoi contattarci ai seguenti
          recapiti:{" "}
          <ul className="list-disc ml-8">
            <li>Email: info@alcabroker.it</li>
            <li>Indirizzo: Via Vittoria Colonna 14 Napoli</li>
          </ul>
        </p>
      </div>
    </div>
  );
};

export default CookiePolicy;
