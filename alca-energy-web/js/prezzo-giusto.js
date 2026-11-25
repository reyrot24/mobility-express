/* "Il prezzo giusto per te" — pagina pubblica del link referral, conferma email, area cliente, testi legali.
   Percorsi: /prezzo-giusto/<CODICE> · /prezzo-giusto/conferma#t=… · /prezzo-giusto/area · /prezzo-giusto/{privacy|condizioni|note|cookie} */
(function () {
  const CFG = window.ALCA_CONFIG || {};
  const FN = CFG.supabaseUrl + "/functions/v1/referral-v11";
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, {
    db: { schema: "energy" }, auth: { storageKey: "ae-cliente", persistSession: true, detectSessionInUrl: true, flowType: "implicit" } });
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const eur = v => v == null || isNaN(v) ? "—" : Number(v).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const data = d => d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" }) : "";
  const dataOra = d => d ? new Date(d).toLocaleString("it-IT", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", " alle ore") : "";
  const WA_SVG = n => `<svg viewBox="0 0 32 32" width="${n}" height="${n}" aria-hidden="true"><path fill="currentColor" d="M16.04 3C8.86 3 3.03 8.82 3.03 16c0 2.29.6 4.53 1.74 6.5L3 29l6.68-1.75A12.95 12.95 0 0 0 16.04 29C23.2 29 29 23.18 29 16S23.2 3 16.04 3Zm0 23.8c-1.95 0-3.86-.53-5.53-1.52l-.4-.24-3.96 1.04 1.06-3.86-.26-.4A10.77 10.77 0 0 1 5.2 16c0-5.97 4.86-10.82 10.84-10.82 5.96 0 10.8 4.85 10.8 10.82 0 5.97-4.84 10.8-10.8 10.8Zm5.93-8.1c-.33-.16-1.93-.95-2.23-1.06-.3-.11-.52-.16-.74.17-.22.32-.85 1.06-1.04 1.28-.19.22-.38.24-.71.08-.33-.16-1.38-.51-2.63-1.62-.97-.87-1.63-1.94-1.82-2.27-.19-.33-.02-.5.14-.67.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.71 0 1.6 1.17 3.15 1.33 3.37.16.22 2.3 3.5 5.56 4.91.78.34 1.39.54 1.86.69.78.25 1.49.21 2.05.13.63-.09 1.93-.79 2.2-1.55.27-.76.27-1.42.19-1.55-.08-.14-.3-.22-.63-.38Z"/></svg>`;
  const app = $("#app");
  const LEG = window.LEGALE;
  const PREDEF = { intestazione: { titolo: "il prezzo giusto per te", sottotitolo: "Alca Energy" }, colori: { accento: "#0a6b5c", barra: "#0b2e2a", sfondo: "#f2f5f5", modulo: "#ffffff", sezioni: "#ffffff" }, logo: "/assets/logo-alca.png", referente: {} };
  let CONF = PREDEF, CODICE = sessionStorage.getItem("pg.codice") || "";

  async function chiama(body, session) {
    const h = { "content-type": "application/json", apikey: CFG.supabaseKey }; if (session?.access_token) h.Authorization = "Bearer " + session.access_token;
    const r = await fetch(FN, { method: "POST", headers: h, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({ errore: "Risposta non valida" }));
    if (!r.ok || j.errore) throw new Error(j.errore || "Errore " + r.status);
    return j;
  }
  function colori(c) {
    const s = document.documentElement.style;
    for (const [k, v] of Object.entries(c || {})) if (/^#[0-9a-f]{3,8}$/i.test(v)) s.setProperty("--pg-" + k, v);
  }
  const multilinea = t => esc(t).replace(/\n/g, "<br>");
  const telLink = n => String(n || "").replace(/[^\d+]/g, "");
  // messaggio già scritto quando il cliente apre WhatsApp dal sito (lo può modificare prima di inviarlo)
  // con il codice della richiesta quando è noto (dopo l'invio, nell'area personale)
  /* suggeritore di password: 16 caratteri casuali (generatore crittografico del browser), almeno una maiuscola, minuscola, cifra e simbolo;
     esclusi i caratteri che si confondono (0/O, 1/l/I) */
  function generaPassword(n = 16) {
    const S = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?-_+="], tutti = S.join("");
    const r = m => { const x = new Uint32Array(1); crypto.getRandomValues(x); return x[0] % m; };
    const p = S.map(s => s[r(s.length)]);
    while (p.length < n) p.push(tutti[r(tutti.length)]);
    for (let i = p.length - 1; i > 0; i--) { const j = r(i + 1); [p[i], p[j]] = [p[j], p[i]]; }
    return p.join("");
  }
  // sotto il primo campo: "Suggerisci una password sicura", mostra/nascondi, copia
  function suggeritore(campi) {
    if (!campi[0]) return;
    const box = document.createElement("div"); box.className = "pg-sugg";
    box.innerHTML = `<button type="button" class="pg-sugg-btn">Suggerisci una password sicura</button><button type="button" class="pg-sugg-vedi">Mostra</button><span class="pg-sugg-ok" hidden></span>`;
    campi[0].closest("label").after(box);
    const [gen, vedi] = box.querySelectorAll("button"), ok = box.querySelector(".pg-sugg-ok");
    const mostra = si => { campi.forEach(c => c.type = si ? "text" : "password"); vedi.textContent = si ? "Nascondi" : "Mostra"; };
    vedi.onclick = () => mostra(campi[0].type === "password");
    gen.onclick = async () => {
      const p = generaPassword(); campi.forEach(c => { c.value = p; c.dispatchEvent(new Event("input")); }); mostra(true);
      let copiata = false; try { await navigator.clipboard.writeText(p); copiata = true; } catch { }
      ok.textContent = copiata ? "Copiata negli appunti: salvala nel tuo gestore di password." : "Annotala o salvala nel tuo gestore di password."; ok.hidden = false;
    };
  }

  let RICHIESTA_WA = "";
  let MSG_WA = "";
  const msgWa = cod => MSG_WA ? MSG_WA : cod ? `Salve, sono interessato alla stima n. ${cod}. Cosa serve per attivare l'offerta?` : "Salve, sono interessato alla stima. Cosa serve per attivare l'offerta?";
  // numero WhatsApp del referente; se non è impostato si usa il suo cellulare (numero italiano che inizia per 3)
  const numeroWa = r => { if (r?.whatsapp) return r.whatsapp; const d = String(r?.telefono || "").replace(/\D/g, "").replace(/^0039|^39(?=3\d{8,9}$)/, ""); return /^3\d{8,9}$/.test(d) ? d : ""; };
  const waLink = (n, cod) => { let d = String(n || "").replace(/\D/g, ""); if (d.length === 10 && d.startsWith("3")) d = "39" + d; return d ? "https://wa.me/" + d + "?text=" + encodeURIComponent(msgWa(cod ?? RICHIESTA_WA)) : ""; };

  // codice del link "di casa" (home di alcaenergia.it): i clienti diretti vanno a Team Energia
  const CODICE_SITO = (CFG.codiceSito || "ALCASITO").toUpperCase();
  const LOGO_ALCA = "/assets/logo-alca.png";
  /* pagine dei referenti: tre modelli grafici (menu Referral → Personalizza pagina; ogni link può averne uno suo). ?modello=… mostra un'anteprima */
  const MODELLI = { fiducia: { accento: "#0e3b2e", barra: "#0e3b2e", sfondo: "#f6f5f0" }, vicino: { accento: "#4a2238", barra: "#4a2238", sfondo: "#fff5ec" }, energia: { accento: "#1a2bc4", barra: "#1a2bc4", sfondo: "#f3f5ff" } };
  const daReferente = () => !!CODICE && CODICE !== CODICE_SITO;
  function modello() {
    const prova = new URLSearchParams(location.search).get("modello"), scelte = [prova, CONF?.modelli?.[CODICE], CONF?.modello];
    return scelte.find(m => typeof m === "string" && Object.hasOwn(MODELLI, m)) || "fiducia";
  }
  const VIDEO = `<figure class="sx-video"><div class="sx-video-q">
          <video id="sx-video" src="/assets/video-home.mp4" poster="/assets/video-home.jpg" muted loop playsinline preload="none" width="720" height="1280" aria-label="Una donna seduta in salotto invita a confrontare la bolletta prima di cambiare"></video>
          <a class="sx-video-link" id="sx-video-link" href="#pg-form" aria-label="Carica la bolletta" hidden></a>
          <div class="sx-video-tasti"><button type="button" id="sx-video-play" aria-label="Avvia il video">▶</button><button type="button" id="sx-video-audio">Attiva audio</button></div>
        </div><figcaption>Video illustrativo creato con l'intelligenza artificiale.</figcaption></figure>`;
  // video sul link: scelta del singolo link, altrimenti quella della pagina (di partenza spento); ?video=si|no per l'anteprima
  function conVideo() {
    const p = new URLSearchParams(location.search).get("video"), l = CONF?.videoLink?.[CODICE];
    return p === "si" ? true : p === "no" ? false : typeof l === "boolean" ? l : CONF?.sezioni?.video === true;
  }
  // foto del referente: solo un'immagine incorporata, già ridotta nel portale
  const fotoRef = r => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(r?.foto || "") ? r.foto : "";
  const inizialiDi = n => (n || "").split(/\s+/).map(x => x[0] || "").join("").slice(0, 2).toUpperCase();
  const ritratto = (r, cls) => fotoRef(r) ? `<span class="${cls} con-foto"><img src="${fotoRef(r)}" alt="${esc(r.nome)}"></span>` : `<span class="${cls}" aria-hidden="true">${esc(inizialiDi(r.nome))}</span>`;
  function guscio(corpo, opz = {}) {
    const suo = daReferente();
    if (suo) { document.documentElement.dataset.modello = modello(); colori(MODELLI[modello()]); } else delete document.documentElement.dataset.modello;
    const c = CONF, legal = CODICE ? "?l=" + encodeURIComponent(CODICE) : "";
    const bozza = LEG && ["privacy", "condizioni", "note", "cookie"].some(k => String(LEG[k]?.testo || "").includes("pg-da-completare"));
    // pagina di partenza: la home per i clienti diretti, la pagina del referente per chi arriva da un link
    const base = !CODICE || CODICE === CODICE_SITO ? "/" : "/prezzo-giusto/" + encodeURIComponent(CODICE);
    const qui = opz.ancore ? "" : base;
    app.innerHTML = `${bozza ? `<div class="pg-collaudo" role="note">Ambiente di collaudo · testi legali in bozza con campi da completare: non usare con clienti reali</div>` : ""}
      <header class="sx-top"><div class="sx-wrap sx-top-in">
        <a class="sx-brand" href="${esc(base)}"><img src="${esc(c.logo || LOGO_ALCA)}" alt="Alca Energy"><span><b>energy</b><small>il prezzo giusto per te</small></span></a>
        ${suo ? "" : `<nav class="sx-nav" aria-label="Sezioni"><a href="${esc(qui)}#come">Come funziona</a><a href="${esc(qui)}#perche">Perché Alca</a><a href="${esc(qui)}#faq">Domande frequenti</a><a href="/partner">Area partner</a></nav>`}
        ${opz.ancore && !suo ? `<a class="sx-top-cta" href="#pg-form">Richiedi la stima</a>` : ""}
        ${opz.senzaArea ? "" : `<a class="sx-area" href="/prezzo-giusto/area"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.4 0-8 2.2-8 5v2h16v-2c0-2.8-3.6-5-8-5Z"/></svg>Area personale</a>`}
      </div></header>
      <main class="${opz.pieno ? "sx-main" : "pg-largo sx-main-stretto"}">${corpo}</main>
      ${suo ? `<footer class="sx-piede rl-piede"><div class="sx-wrap">
        <nav aria-label="Documenti"><a href="/prezzo-giusto/condizioni${legal}">Condizioni</a><a href="/prezzo-giusto/privacy${legal}">Privacy</a><a href="/prezzo-giusto/cookie${legal}">Cookie</a><a href="/prezzo-giusto/note${legal}">Come confrontiamo le offerte</a><a href="/prezzo-giusto/recesso">Recedi dal servizio</a><a href="/prezzo-giusto/versioni">Versioni precedenti</a></nav>
        <p>Alca Energy è un marchio di Alca Broker S.r.l. · Via Vittoria Colonna 14, 80121 Napoli · P.IVA e C.F. 07965051217 · REA NA-922097 · <a href="mailto:energia@alcabroker.it">energia@alcabroker.it</a><br>Le stime sono orientative e non costituiscono un'offerta contrattuale.${opz.ancore && conVideo() ? " · Video illustrativo creato con l'intelligenza artificiale." : ""}</p>
      </div></footer>` : `<footer class="sx-piede"><div class="sx-wrap">
        <div class="sx-piede-alto">
          <div class="sx-piede-marchio"><img src="${LOGO_ALCA}" alt="Alca Broker" width="68" height="40"><p>Alca Energy è un marchio di Alca Broker S.r.l.<br>Via Vittoria Colonna 14, 80121 Napoli<br>P.IVA e C.F. 07965051217 · REA NA-922097</p></div>
          <nav class="sx-piede-col" aria-label="Servizio"><b>Il servizio</b><a href="${esc(base)}#come">Come funziona</a><a href="/prezzo-giusto/note${legal}">Come confrontiamo le offerte</a><a href="/prezzo-giusto/area">Area personale</a><a href="/prezzo-giusto/recesso">Recedi dal servizio</a></nav>
          <nav class="sx-piede-col" aria-label="Documenti"><b>Documenti</b><a href="/prezzo-giusto/condizioni${legal}">Condizioni del servizio</a><a href="/prezzo-giusto/privacy${legal}">Privacy</a><a href="/prezzo-giusto/cookie${legal}">Cookie</a><a href="/prezzo-giusto/versioni">Versioni precedenti</a></nav>
          <nav class="sx-piede-col" aria-label="Partner"><b>Professionisti</b><a href="/partner">Diventa partner</a><a href="/portale">Accedi al portale partner</a><a href="mailto:energia@alcabroker.it">energia@alcabroker.it</a></nav>
        </div>
        <p class="sx-piede-basso">© ${new Date().getFullYear()} Alca Broker S.r.l. · Le stime sono orientative e non costituiscono un'offerta contrattuale.${opz.ancore ? " · Immagini e video illustrativi creati con l'intelligenza artificiale." : ""}</p>
      </div></footer>`}${opz.senzaWa ? "" : pulsanteWa(c)}`;
  }
  /* pulsante WhatsApp fisso in basso a destra: resta visibile mentre la pagina scorre */
  function pulsanteWa(c) {
    const r = c?.referente || {}, url = waLink(numeroWa(r));
    if (!url) return "";
    return `<a class="pg-wa-fisso" href="${esc(url)}" target="_blank" rel="noopener" aria-label="Scrivi su WhatsApp${r.nome ? " a " + esc(r.nome) : ""}" title="Scrivi su WhatsApp${r.nome ? " a " + esc(r.nome) : ""}">
      ${WA_SVG(30)}
      <span class="pg-wa-etichetta">Scrivimi su WhatsApp</span></a>`;
  }
  function errorePagina(titolo, testo) {
    guscio(`<section class="pg-scheda pg-centro"><h1>${esc(titolo)}</h1><p>${esc(testo)}</p></section>`);
  }

  /* ------------------------------ pagina del link (e home di alcaenergia.it) ------------------------------ */
  let INFO = null;
  const ICONA = {
    file: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M12 18v-6M9 15l3-3 3 3"/></svg>',
    mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg>',
    stima: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M5 3h14v18H5zM9 8h6M9 12h6M9 16h3"/></svg>',
    luce: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8"/></svg>',
    ok: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    stella: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2c.4 4.6 2.4 7.6 7.6 8.1v1.8c-5.2.5-7.2 3.5-7.6 8.1h-1.8c-.4-4.6-2.4-7.6-7.6-8.1v-1.8c5.2-.5 7.2-3.5 7.6-8.1z"/></svg>',
    persona: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-3.9 3.6-6 8-6s8 2.1 8 6"/></svg>',
    scudo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6zM8.5 12l2.5 2.5 4.5-5"/></svg>',
    clip: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M20 11.5l-8.2 8.2a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8"/></svg>',
    campana: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4"/></svg>'
  };
  async function paginaLink(codice) {
    let info;
    try { info = await chiama({ azione: "pagina", codice }); }
    catch (e) { return errorePagina("Link non disponibile", "Il link che hai aperto non esiste o non è più attivo. Chiedi al tuo referente un nuovo link, oppure richiedi la stima dalla pagina principale di alcaenergia.it."); }
    CODICE = codice; sessionStorage.setItem("pg.codice", codice);
    INFO = info; CONF = info.config;
    if (!info.attivo) return errorePagina("Link non più attivo", "Questo link è stato disattivato. Chiedi al tuo referente un nuovo link, oppure richiedi la stima dalla pagina principale di alcaenergia.it.");
    const HOME = codice === CODICE_SITO;
    // testo predefinito aggiornato il 22/11/2026: il server restituisce ancora quello precedente a chi non l'ha personalizzato
    CONF.testata.descrizione = String(CONF.testata.descrizione || "").replace(/^(Carica una bolletta di luce o gas e ricevi gratuitamente una stima personalizzata del possibile risparmio con le offerte attivabili) tramite Alca\./, "$1.");
    const t = CONF.testata, r = CONF.referente, F = info.funzioni || {}, K = info.consensi || {};
    const legal = "?l=" + encodeURIComponent(codice);
    const team = /^team\b/i.test(r.nome || ""), nomeBreve = team ? "il " + r.nome : ((r.nome || "").split(/\s+/)[0] || ""), soggetto = team ? "Il " + r.nome : nomeBreve;
    const iniziali = (r.nome || "").split(/\s+/).map(x => x[0] || "").join("").slice(0, 2).toUpperCase();
    const canaliBox = (nome) => `<div class="pg-canali" data-per="${nome}" hidden>${["email", "telefono", "whatsapp"].map(c => `<label><input type="checkbox" name="${nome}_canali" value="${c}"> ${c === "whatsapp" ? "WhatsApp" : c[0].toUpperCase() + c.slice(1)}</label>`).join("")}</div>`;
    const piu = (titolo, corpo, cls = "") => `<details class="pg-piu ${cls}"><summary>${titolo}</summary><div class="pg-piu-c">${corpo}</div></details>`;
    const wa = numeroWa(r) ? waLink(numeroWa(r)) : "";
    const compensi = info.compensi ? esc(info.compensi) : "Alca può ricevere compensi dai fornitori o dai partner commerciali per le attivazioni effettuate tramite la propria rete: il servizio ha quindi anche una finalità commerciale.";
    const faq = [
      ["Il servizio è davvero gratuito?", `<p>Sì: la stima, l'area personale e il monitoraggio facoltativo sono gratuiti per te. ${compensi}</p>`],
      ["Caricando la bolletta cambio fornitore?", "<p>No. Il caricamento non cambia il tuo fornitore, non sottoscrive contratti e non dà mandato ad attivarne. Decidi tu se e quando chiedere assistenza per un'attivazione.</p>"],
      ["Quali offerte vengono confrontate?", `<p>Le offerte attivabili tramite Alca, presenti nel nostro catalogo alla data del calcolo e compatibili con la tua fornitura. Il confronto non copre l'intero mercato: per una panoramica completa puoi consultare il <a href="https://www.ilportaleofferte.it" target="_blank" rel="noopener">Portale Offerte</a> pubblico. Criteri e operatori sono spiegati in <a href="/prezzo-giusto/note${legal}">Come confrontiamo le offerte</a>.</p>`],
      ["Quale documento devo caricare?", "<p>Una bolletta recente e completa di luce o gas, in PDF o foto leggibile: fino a 3 file da 10 MB. Lascia leggibili offerta, consumi e dati della fornitura; puoi oscurare IBAN e informazioni non necessarie. Non inviare informazioni sanitarie.</p>"],
      ["Cosa succede dopo la richiesta?", "<p>Ti scriviamo per confermare l'email: solo dopo la conferma avviamo l'analisi. Ricevi la stima via email e la trovi nella tua area personale. Prima di qualsiasi proposta di attivazione, i dati vengono verificati da una persona.</p>"],
      ["Riceverò telefonate o messaggi pubblicitari?", "<p>Solo se lo scegli tu: il ricontatto e le comunicazioni promozionali sono facoltativi, separati dalla stima e revocabili in ogni momento dall'area personale.</p>"],
      ["Posso caricare la bolletta di un'azienda?", `<p>Sì. Se dalla bolletta risulta la partita IVA dell'intestatario, la confrontiamo con le offerte per le aziende; per le forniture domestiche usiamo quelle per i privati. Carica solo bollette per le quali sei legittimato a richiedere il servizio; per qualsiasi dubbio ${r.nome ? `scrivi a ${esc(r.nome)}` : "contatta il tuo referente"}.</p>`]
    ];
    const modulo = `<form class="sx-card" id="pg-form" novalidate>
          <div class="sx-card-testa"><span>La tua stima personalizzata</span><b class="sx-gratis">Gratis</b></div>
          <h2>Iniziamo dalla tua bolletta.</h2>
          <p class="sx-card-sotto">Carica la bolletta e lascia la tua email: l'analisi parte dopo la tua conferma.</p>
            <label class="pg-drop sx-drop" id="pg-drop" tabindex="0">
              <input type="file" id="pg-file" accept="application/pdf,image/jpeg,image/png" multiple hidden>
              <span class="sx-drop-ico">${ICONA.file}</span>
              <span class="sx-drop-testo"><b>Carica la bolletta</b><span>Trascina qui il file o sceglilo dal dispositivo</span><small>PDF, JPG o PNG · fino a 3 file da 10 MB</small></span>
            </label>
            <ul class="pg-file" id="pg-lista"></ul>
            ${piu("Consigli sul file", `<p>Lascia leggibili offerta, consumi e dati indispensabili della fornitura. Oscura IBAN e altre informazioni non necessarie. Non inviare informazioni sanitarie: se presenti nel documento, oscurale prima di caricarlo. I file vengono inviati solo quando premi «Ricevi la stima gratuita»; l'analisi inizia dopo la conferma dell'email.</p>`)}
            <label class="pg-campo"><span>Email <span class="pg-obb">*</span></span><input type="email" id="pg-email" autocomplete="email" required placeholder="nome@esempio.it"><small>Qui ricevi la conferma e la stima.</small></label>
            <label class="pg-campo"><span>Cellulare <span class="pg-fac">facoltativo</span></span><input type="tel" id="pg-tel" autocomplete="tel"><small>Serve solo se vuoi essere contattato per telefono o WhatsApp; inserirlo non equivale a chiedere telefonate o ad accettare pubblicità.</small></label>
            ${F.terzi ? `<fieldset class="pg-scelta"><legend>La bolletta <span class="pg-obb">*</span></legend>
              <label><input type="radio" name="legittimazione" value="intestatario"> È intestata a me</label>
              <label><input type="radio" name="legittimazione" value="azienda"> Agisco per l'azienda intestataria</label>
              <label><input type="radio" name="legittimazione" value="altro"> Agisco per un altro intestatario</label>
            </fieldset>` : ""}
            <fieldset class="pg-consensi sx-obblig"><legend>Da accettare <span class="pg-obb">*</span></legend>
              <label><input type="checkbox" id="pg-privacy"> <span>${esc(K.privacy)} <a href="/prezzo-giusto/privacy${legal}" target="_blank">Informativa</a></span></label>
              <label><input type="checkbox" id="pg-condizioni"> <span>${esc(K.condizioni)} <a href="/prezzo-giusto/condizioni${legal}" target="_blank">Condizioni</a> · <a href="/prezzo-giusto/note${legal}" target="_blank">Note</a></span></label>
              <label><input type="checkbox" id="pg-legit"> <span>${esc(K.legittimazione)}</span></label>
              ${piu("Informativa breve sul trattamento dei dati", `<p>Alca Broker S.r.l. tratta i dati necessari a gestire la richiesta, verificare l'email e produrre la stima. Utilizza fornitori tecnici e, dopo la conferma, strumenti di lettura automatica. Monitoraggio, ricontatto e marketing dipendono dalle tue scelte. Il referente accede soltanto nei casi e con i limiti descritti nell'<a href="/prezzo-giusto/privacy${legal}" target="_blank">informativa completa</a>, dove trovi destinatari, conservazione e diritti. Contatto privacy: energia@alcabroker.it.</p>`)}
            </fieldset>
            <details class="sx-allegato" id="sx-consensi">
              <summary><span class="sx-alleg-ico">${ICONA.campana}</span><span class="sx-alleg-tit"><b>Scelte facoltative</b><small id="sx-cons-stato"></small></span><span class="sx-alleg-freccia" aria-hidden="true"></span></summary>
              <div class="sx-alleg-c">
            <fieldset class="pg-consensi pg-facolt"><legend>Facoltativo</legend>
              ${F.monitoraggio ? `<div class="pg-sc">
                <label><input type="checkbox" id="pg-mon"> <span><b>Monitoraggio per 12 mesi.</b> ${esc(K.monitoraggio)}</span></label>
                ${piu("Come funziona il monitoraggio", `<p>Controlli programmati ogni 3 giorni; avvisi sulle offerte solo in presenza di un miglioramento verificato e distanziati di almeno 7 giorni, salvo una tua nuova richiesta. Il servizio non garantisce aggiornamenti in tempo reale. Scade dopo 12 mesi, salvo tuo rinnovo espresso. Le comunicazioni necessarie al funzionamento restano distinte dagli avvisi promozionali. Non sono comprese promozioni generiche o assicurative.</p>`)}</div>` : ""}
              <div class="pg-sc">
                <label><input type="checkbox" id="pg-ric"> <span><b>Ricontatto.</b> ${esc(K.ricontatto)}</span></label>
                <div class="pg-canali" id="pg-ric-canali" hidden>${["email", "telefono", "whatsapp"].map(c => `<label><input type="radio" name="ricontatto_canale" value="${c}"> ${c === "whatsapp" ? "WhatsApp" : c[0].toUpperCase() + c.slice(1)}</label>`).join("")}</div>
                ${piu("Come funziona il ricontatto", `<p>La richiesta riguarda questa pratica. Sono previsti al massimo 3 tentativi ragionevoli entro 30 giorni; non autorizza campagne successive. Non è necessario accettare il marketing.</p>`)}</div>
              ${F.marketing ? `<div class="pg-sc">
                <label><input type="checkbox" id="pg-mke"> <span><b>Promozioni luce e gas.</b> ${esc(K.mkt_energia)}</span></label>${canaliBox("mkt_energia")}
                <label><input type="checkbox" id="pg-mka"> <span><b>Promozioni assicurative.</b> ${esc(K.mkt_assic)}</span></label>${canaliBox("mkt_assic")}
                ${piu("Come funzionano le promozioni", `<p>Consensi facoltativi, validi per massimo 12 mesi salvo revoca anticipata o rinnovo espresso. Il rifiuto non condiziona stima e ricontatto. Nessuna comunicazione dei dati ai partner per loro marketing autonomo è prevista in questo percorso. Puoi modificare settori e canali dall'area personale o dai link nelle comunicazioni.</p>`)}</div>` : ""}
            </fieldset>
              </div>
            </details>
          <p class="pg-errore" id="pg-err" role="alert" hidden></p>
          <button class="sx-btn sx-avanti" id="pg-invia" type="submit">Ricevi la stima gratuita</button>
          <p class="sx-card-nota">${ICONA.scudo}Caricare la bolletta non attiva alcun contratto.</p>
        </form>`;
    // pagina del referente: essenziale, con la persona in primo piano (niente area partner né presentazione della società)
    if (!HOME) {
      const ciao = team ? `Siamo ${esc(nomeBreve)}.` : nomeBreve ? `Ciao, sono ${esc(nomeBreve)}.` : "Benvenuto.";
      const breve = (r.presentazione || "").length <= 180;
      const faqRef = [faq[0], faq[1], faq[2], faq[4], faq[6]];
      guscio(`
      <section class="rl-eroe"><div class="sx-wrap rl-griglia">
        ${r.nome ? `<div class="rl-ref" id="referente">
          ${ritratto(r, "rl-foto")}
          <div class="rl-ref-testo">
            <p class="rl-ciao">${ciao}</p>
            <p class="rl-ruolo">${esc(r.nome)} · ${esc(r.ruolo || "Il tuo referente")}</p>
            ${r.presentazione && breve ? `<p class="rl-pres">${multilinea(r.presentazione)}</p>` : `<p class="rl-pres">${team ? "Per qualsiasi dubbio sulla bolletta o sulla stima puoi scriverci." : "Per qualsiasi dubbio sulla bolletta o sulla stima, ci sono io."}</p>`}
            <div class="rl-contatti">${wa ? `<a class="rl-wa" href="${esc(wa)}" target="_blank" rel="noopener">${WA_SVG(18)}WhatsApp</a>` : ""}${r.telefono ? `<a href="tel:${esc(telLink(r.telefono))}">Chiama</a>` : ""}${r.email ? `<a href="mailto:${esc(r.email)}">Email</a>` : ""}</div>
            ${piu(team ? "Chi siamo" : "Conosciamoci meglio", `${r.presentazione && !breve ? `<p>${multilinea(r.presentazione)}</p>` : ""}<p>Il ruolo del referente e l'eventuale accesso ai dati sono spiegati nell'<a href="/prezzo-giusto/privacy${legal}" target="_blank">informativa privacy</a>.</p>`, "rl-piu")}
          </div>
        </div>` : ""}
        <div class="rl-testo">
          <p class="sx-occhiello">${esc(t.etichetta)}</p>
          <h1>${multilinea(t.titolo)} <em>${esc(t.evidenziato)}</em></h1>
          <p class="rl-descr">${multilinea(t.descrizione)}</p>
          ${CONF.sezioni?.fiducia !== false ? `<ul class="sx-spunte"><li>${ICONA.ok}Gratis, senza impegno</li><li>${ICONA.ok}Nessun cambio automatico</li></ul>` : ""}
          <a class="rl-vai" href="#pg-form">Carica la bolletta</a>
        </div>
        ${modulo}
      </div>
      </section>
      ${conVideo() ? `<section class="rl-video"><div class="sx-wrap rl-video-in">${VIDEO}
        <div><h2>Prima di cambiare,<br>confronta.</h2><p>Parti dalla tua bolletta: ricevi una stima orientativa, gratis. Poi decidi tu.</p><a class="sx-btn" href="#pg-form">Carica la bolletta</a></div></div></section>` : ""}
      ${CONF.sezioni?.trePassi !== false ? `<section class="rl-passi" id="come"><div class="sx-wrap"><h2>Come funziona</h2>
        <ol><li><b>Carichi la bolletta</b><small>Un PDF o una foto leggibile.</small></li><li><b>Confermi l'email</b><small>Solo dopo avviamo l'analisi.</small></li><li><b>Ricevi la stima</b><small>Via email e nella tua area personale.</small></li></ol></div></section>` : ""}
      <section class="rl-faq" id="faq"><div class="sx-wrap"><h2>Prima di iniziare</h2>
        <div class="sx-faq-lista">${faqRef.map(([d, rsp]) => `<details><summary>${esc(d)}</summary><div>${rsp}</div></details>`).join("")}</div></div></section>`, { pieno: true, ancore: true });
      videoHome();
      return moduloEventi(codice);
    }
    guscio(`
      <section class="sx-eroe"><div class="sx-wrap sx-eroe-in">
        <div class="sx-eroe-testo">
          <p class="sx-occhiello">${esc(t.etichetta || "Luce e gas, con più chiarezza")}</p>
          <h1>${multilinea(t.titolo)} <em>${esc(t.evidenziato)}</em></h1>
          <p class="sx-sotto">La bolletta può essere più leggera.<br>Scopriamolo insieme.</p>
          <p class="sx-descr">${multilinea(t.descrizione)}</p>
          <ul class="sx-spunte"><li>${ICONA.ok}Gratis, senza impegno</li><li>${ICONA.ok}Nessun cambio automatico</li></ul>
          ${r.nome ? `<a class="sx-ref-mini" href="#referente"><span class="sx-avatar">${esc(iniziali)}</span><span><small>Un servizio, una persona.</small><b>Con te c'è ${team ? "il " : ""}${esc(r.nome)}.</b></span><span class="sx-sottolineato">Il tuo referente</span></a>` : ""}
        </div>
        ${modulo}
      </div>
      </section>

      <section class="sx-sez sx-sez-video"><div class="sx-wrap sx-video-in">
        ${VIDEO}
        <div><p class="sx-occhiello">Meno dubbi. Più chiarezza.</p><h2>Prima di cambiare,<br>confronta.</h2>
          <p class="sx-lead">Tra costi, consumi e offerte, orientarsi non è sempre semplice. Partiamo dalla tua bolletta per aiutarti a scegliere.</p>
          <ul class="sx-elenco">
            <li><span class="sx-ico">${ICONA.file}</span><div><b>Un confronto che parte da te</b><small>I dati della tua fornitura sono il punto di partenza per la stima.</small></div></li>
            <li><span class="sx-ico">${ICONA.luce}</span><div><b>Le alternative, più comprensibili</b><small>Valutiamo le offerte del catalogo Alca compatibili con la tua fornitura.</small></div></li>
            <li><span class="sx-ico">${ICONA.ok}</span><div><b>L'ultima parola è sempre tua</b><small>Ricevi una stima orientativa. Decidi tu se chiedere assistenza per un'attivazione.</small></div></li></ul>
          <a class="sx-btn sx-video-cta" href="#pg-form">Carica la bolletta</a></div>
      </div></section>
      <section class="sx-passi" id="come"><div class="sx-wrap sx-passi-in">
        <div><p class="sx-occhiello">Semplice, dall'inizio.</p><h2>Tre passi.<br>Una scelta più chiara.</h2></div>
        <ol><li><span class="sx-ico">${ICONA.file}</span><b>Carichi la bolletta</b><small>Un PDF o una foto leggibile.</small></li>
          <li><span class="sx-ico">${ICONA.mail}</span><b>Confermi l'email</b><small>Solo dopo avviamo l'analisi.</small></li>
          <li><span class="sx-ico">${ICONA.stima}</span><b>Ricevi la stima</b><small>La trovi nella tua area personale.</small></li></ol>
      </div></section>



      <section class="sx-sez sx-chiara"><div class="sx-wrap sx-tre">
        <div><p class="sx-occhiello">Senza sorprese</p><h2>Prima la chiarezza.<br>Poi la scelta.</h2><a class="sx-sottolineato" href="/prezzo-giusto/note${legal}">Come confrontiamo le offerte</a></div>
        <div><b class="sx-tit-col">Una stima, nessun vincolo.</b><p>Il caricamento non cambia il tuo fornitore e non dà mandato ad attivare contratti.</p></div>
        <div><b class="sx-tit-col">Un confronto trasparente.</b><p>Consideriamo le offerte attivabili tramite Alca, presenti nel catalogo e compatibili con la tua fornitura. Il confronto non copre l'intero mercato.</p></div>
      </div></section>

      ${r.nome ? `<section class="sx-sez" id="referente"><div class="sx-wrap"><div class="sx-ref">
        <div class="sx-ref-testo"><p class="sx-occhiello">Il tuo referente Alca Energy</p><h2>Il digitale è comodo.<br>Una persona fa la differenza.</h2>
          <p>Un dubbio sulla bolletta? Una domanda sulla stima?<br>${esc(soggetto)} ti aiuta a capire il prossimo passo.</p>
          <div class="sx-ref-azioni">${wa ? `<a class="sx-btn-lime" href="${esc(wa)}" target="_blank" rel="noopener">${WA_SVG(18)}${team ? "Scrivi al " + esc(r.nome) : "Scrivi a " + esc(nomeBreve)}</a>` : ""}${r.email ? `<a class="sx-sottolineato chiaro" href="mailto:${esc(r.email)}">${wa ? "Preferisco un'email" : "Scrivi un'email"}</a>` : ""}${r.telefono ? `<a class="sx-sottolineato chiaro" href="tel:${esc(telLink(r.telefono))}">${esc(r.telefono)}</a>` : ""}</div>
          ${r.presentazione ? piu("Chi è il tuo referente", `<p>${multilinea(r.presentazione)}</p><p>Il ruolo del referente e l'eventuale accesso ai dati sono spiegati nell'<a href="/prezzo-giusto/privacy${legal}" target="_blank">informativa privacy</a>.</p>`, "chiaro") : ""}</div>
        <div class="sx-ref-scheda"><span class="sx-avatar grande">${esc(iniziali)}<i>${ICONA.stella}</i></span><b>${esc(r.nome)}</b><small>${esc(r.ruolo || "Il tuo referente")}</small>${r.email ? `<a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ""}</div>
      </div></div></section>` : ""}

      ${F.monitoraggio ? `<section class="sx-sez"><div class="sx-wrap sx-due">
        <div class="sx-mon" aria-hidden="true"><div class="sx-mon-carta"><b>12</b><span>mesi al tuo fianco</span><small>${ICONA.ok}Monitoraggio facoltativo</small></div><span class="sx-mon-ico">${ICONA.campana}</span></div>
        <div><p class="sx-occhiello">Il vantaggio di pensarci nel tempo</p><h2>Le offerte cambiano.<br>Puoi tenerle d'occhio.</h2>
          <p class="sx-lead">Se lo desideri, alla stima puoi aggiungere il monitoraggio gratuito della tua fornitura per 12 mesi.</p>
          <p>Ricevi via email gli avvisi sulle offerte confrontate da Alca, anche quando hanno natura promozionale. Puoi disattivare il servizio e revocare il consenso in qualsiasi momento.</p>
          <p class="sx-check">${ICONA.ok}Lo scegli tu. La stima resta gratuita anche senza.</p></div>
      </div></section>` : ""}

      <section class="sx-sez sx-chiara" id="perche"><div class="sx-wrap">
        <p class="sx-occhiello">Perché Alca</p><h2>Una società vera.<br>Persone che ci mettono la faccia.</h2>
        <div class="sx-griglia">
          <div class="sx-box"><span class="sx-ico">${ICONA.scudo}</span><b>Chi siamo</b><p>Alca Energy è il marchio di Alca Broker S.r.l., con sede a Napoli in Via Vittoria Colonna 14 (P.IVA 07965051217, REA NA-922097). Tutti i dati sono nelle <a href="/prezzo-giusto/condizioni${legal}">condizioni del servizio</a>.</p></div>
          <div class="sx-box"><span class="sx-ico">${ICONA.persona}</span><b>Un referente, non un call center</b><p>Ogni richiesta ha una persona di riferimento con nome, email e telefono, che verifica i dati prima di qualsiasi proposta.</p></div>
          <div class="sx-box"><span class="sx-ico">${ICONA.stima}</span><b>Criteri dichiarati</b><p>Spieghiamo quali offerte confrontiamo, come calcoliamo la stima e quali limiti ha. Le versioni dei documenti restano consultabili.</p></div>
          <div class="sx-box"><span class="sx-ico">${ICONA.campana}</span><b>Al tuo fianco nel tempo</b><p>Nella tua area personale trovi stime, preferenze e documenti. Il monitoraggio facoltativo ti avvisa se trova un miglioramento.</p></div>
        </div>
      </div></section>

      <section class="sx-sez" id="faq"><div class="sx-wrap sx-faq">
        <div><p class="sx-occhiello">Tutto chiaro?</p><h2>Le risposte,<br>senza giri di parole.</h2><p class="sx-lead">Le cose da sapere prima<br>di caricare la tua bolletta.</p></div>
        <div class="sx-faq-lista">${faq.map(([d, rsp]) => `<details><summary>${esc(d)}</summary><div>${rsp}</div></details>`).join("")}</div>
      </div></section>

      ${HOME ? `<section class="sx-sez sx-partner-banda"><div class="sx-wrap sx-partner-in">
        <div><p class="sx-occhiello">Per i professionisti dell'energia</p><h2>Lavori nel settore luce e gas?</h2><p>Agenti, subagenti, segnalatori e agenzie: lavora con il portale Alca, i suoi preventivi e il catalogo delle offerte.</p></div>
        <div class="sx-partner-azioni"><a class="sx-btn-lime" href="/partner">Diventa partner</a><a class="sx-sottolineato chiaro" href="/portale">Sei già partner? Accedi</a></div>
      </div></section>` : ""}

      <section class="sx-finale sx-finale-foto"><div class="sx-wrap"><img src="/assets/casa-alca.jpg" alt="" width="1600" height="1067" loading="lazy">
        <p class="sx-occhiello">Il prezzo giusto per te</p><h2>Partiamo dalla<br>tua bolletta.</h2>
        <a class="sx-btn-lime" href="#pg-form" id="sx-vai-modulo">Richiedi la stima gratuita</a><small>Gratis. Senza obbligo di attivazione.</small>
      </div></section>`, { pieno: true, ancore: true });
    videoHome();
    moduloEventi(codice);
  }
  /* video (home e link che lo hanno attivo): parte senza audio quando è in vista, si può fermare e sentire; niente avvio automatico con «riduci animazioni» o risparmio dati */
  function videoHome() {
    const v = $("#sx-video"); if (!v) return;
    const play = $("#sx-video-play"), audio = $("#sx-video-audio"), link = $("#sx-video-link");
    let fermato = matchMedia("(prefers-reduced-motion: reduce)").matches || !!navigator.connection?.saveData;
    v.muted = true;
    const aggiorna = () => { play.textContent = v.paused ? "▶" : "❚❚"; play.setAttribute("aria-label", v.paused ? "Avvia il video" : "Ferma il video"); audio.textContent = v.muted ? "Attiva audio" : "Togli audio"; };
    const avvia = () => v.play().catch(() => { });
    ["play", "pause", "volumechange"].forEach(e => v.addEventListener(e, aggiorna));
    v.addEventListener("timeupdate", () => { link.hidden = v.currentTime < 6.3; }); // nella parte finale il video mostra il pulsante «Carica la bolletta»
    const alterna = () => { fermato = !v.paused; fermato ? v.pause() : avvia(); };
    play.onclick = alterna; v.onclick = alterna;
    audio.onclick = () => { v.muted = !v.muted; if (!v.muted) { v.currentTime = 0; fermato = false; avvia(); } };
    new IntersectionObserver(([x]) => { if (!x.isIntersecting) v.pause(); else if (!fermato) avvia(); }, { threshold: .4 }).observe(v);
    aggiorna();
  }

  function moduloEventi(codice) {
    let files = [];
    const lista = $("#pg-lista"), input = $("#pg-file"), drop = $("#pg-drop"), err = $("#pg-err");
    const OK = ["application/pdf", "image/jpeg", "image/png"];
    const avviso = m => { err.textContent = m; err.hidden = !m; if (m) err.scrollIntoView({ block: "nearest" }); };
    const ERR_FILE = "Il file non è stato acquisito. Usa PDF, JPG o PNG entro 10 MB; sono consentiti al massimo 3 file.";
    const mostra = () => { lista.innerHTML = files.map((f, i) => `<li>${esc(f.name)} <small>${(f.size / 1048576).toFixed(1)} MB</small> <button type="button" data-i="${i}" aria-label="Rimuovi">×</button></li>`).join(""); };
    const aggiungi = fl => { avviso(""); for (const f of fl) { if (!OK.includes(f.type) || f.size > 10 * 1048576 || files.length >= 3) { avviso(ERR_FILE); continue; } files.push(f); } mostra(); };
    input.onchange = () => { aggiungi(input.files); input.value = ""; };
    drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("pg-sopra"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("pg-sopra"); }));
    drop.addEventListener("drop", e => aggiungi(e.dataTransfer.files));
    lista.onclick = e => { const b = e.target.closest("button[data-i]"); if (b) { files.splice(+b.dataset.i, 1); mostra(); } };
    // i canali compaiono solo quando la relativa scelta è attiva
    const legaCanali = (box, sel) => { const c = $(box); if (!c) return; c.onchange = () => { $(sel).hidden = !c.checked; }; };
    legaCanali("#pg-ric", "#pg-ric-canali");
    legaCanali("#pg-mke", '[data-per="mkt_energia"]');
    legaCanali("#pg-mka", '[data-per="mkt_assic"]');
    const valori = n => [...document.querySelectorAll(`input[name="${n}"]:checked`)].map(i => i.value);
    // le tre accettazioni sono sempre visibili; le scelte facoltative stanno nella tendina chiusa
    const tendina = $("#sx-consensi"), stato = $("#sx-cons-stato"), OBB = ["#pg-privacy", "#pg-condizioni", "#pg-legit"];
    const FAC = ["#pg-mon", "#pg-ric", "#pg-mke", "#pg-mka"].filter(s => $(s));
    const aggiornaStato = () => {
      const n = FAC.filter(s => $(s).checked).length;
      stato.textContent = n ? (n === 1 ? "1 scelta attiva" : n + " scelte attive") : [$("#pg-mon") && "Monitoraggio gratuito", "ricontatto", $("#pg-mke") && "promozioni"].filter(Boolean).join(" · ").replace(/^./, c => c.toUpperCase());
      tendina.classList.toggle("completa", n > 0);
    };
    FAC.forEach(s => $(s).addEventListener("change", aggiornaStato)); aggiornaStato();
    const segna = s => $(s).closest("label").classList.toggle("manca", !$(s).checked);
    OBB.forEach(s => $(s).addEventListener("change", () => { if ($(s).checked) segna(s); }));
    const apriConsensi = () => { tendina.open = true; tendina.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const controllaPasso = () => {
      if (!files.length) { drop.scrollIntoView({ behavior: "smooth", block: "center" }); avviso("Carica la bolletta (PDF, JPG o PNG)."); return false; }
      const email = $("#pg-email").value.trim(), tel = $("#pg-tel").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { $("#pg-email").focus(); avviso("Inserisci un'email valida."); return false; }
      if (tel && tel.replace(/\D/g, "").length < 6) { $("#pg-tel").focus(); avviso("Il numero di cellulare non sembra valido."); return false; }
      if (INFO?.funzioni?.terzi && !valori("legittimazione")[0]) { avviso("Indica il tuo rapporto con l'intestatario della bolletta."); return false; }
      return true;
    };
    $("#pg-form").onsubmit = async e => {
      e.preventDefault(); avviso("");
      const email = $("#pg-email").value.trim(), tel = $("#pg-tel").value.trim();
      const legit = INFO?.funzioni?.terzi ? valori("legittimazione")[0] : "intestatario"; // categoria del percorso: azienda o privato si riconosce dalla bolletta (partita IVA), non da una scelta del cliente
      if (!controllaPasso()) return;
      if (!$("#pg-privacy").checked || !$("#pg-condizioni").checked || !$("#pg-legit").checked) return OBB.forEach(segna), avviso("Per continuare servono la presa visione dell'informativa, l'accettazione delle condizioni e la dichiarazione su età e legittimazione.");
      const ric = $("#pg-ric")?.checked, ricC = valori("ricontatto_canale")[0];
      if (ric && !ricC) return apriConsensi(), avviso("Scegli come vuoi essere ricontattato: email, telefono o WhatsApp.");
      const mkE = $("#pg-mke")?.checked ? valori("mkt_energia_canali") : [], mkA = $("#pg-mka")?.checked ? valori("mkt_assic_canali") : [];
      if (($("#pg-mke")?.checked && !mkE.length) || ($("#pg-mka")?.checked && !mkA.length)) return apriConsensi(), avviso("Per le comunicazioni promozionali scegli almeno un canale.");
      if ([ricC, ...mkE, ...mkA].some(c => c === "telefono" || c === "whatsapp") && !tel) return avviso("Per essere contattato per telefono o WhatsApp inserisci il cellulare.");
      const fd = new FormData();
      fd.append("azione", "invia"); fd.append("versione", INFO?.versioni?.condizioni || ""); fd.append("codice", codice); fd.append("email", email); fd.append("telefono", tel);
      fd.append("legittimazione", legit); fd.append("privacy", "si"); fd.append("condizioni", "si"); fd.append("legittimazione_dich", "si");
      fd.append("monitoraggio", $("#pg-mon")?.checked ? "si" : "no");
      if (ric) { fd.append("ricontatto", "si"); fd.append("ricontatto_canale", ricC); }
      if (mkE.length) { fd.append("mkt_energia", "si"); mkE.forEach(c => fd.append("mkt_energia_canali", c)); }
      if (mkA.length) { fd.append("mkt_assic", "si"); mkA.forEach(c => fd.append("mkt_assic_canali", c)); }
      files.forEach(f => fd.append("file", f, f.name));
      const btn = $("#pg-invia"); btn.disabled = true; btn.textContent = "Invio in corso…";
      try {
        const r = await fetch(FN, { method: "POST", headers: { apikey: CFG.supabaseKey }, body: fd });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.errore) throw new Error(j.errore || "Non abbiamo conferma che la richiesta sia stata completata. Attendi l'email di conferma prima di riprovare.");
        RICHIESTA_WA = j.codice || "";
        guscio(`<section class="pg-scheda pg-centro"><div class="pg-icona">✉</div><h1>Controlla la tua email</h1>
          <p>Ti abbiamo scritto a <b>${esc(email)}</b>. Il collegamento di conferma dura 24 ore. I file non confermati vengono eliminati entro 7 giorni dal caricamento. Puoi richiedere un nuovo collegamento entro questo termine, senza prorogare la conservazione dei file.</p>
          ${j.avviso ? `<p class="pg-avviso">${esc(j.avviso)}</p>` : ""}
          <p class="pg-nota">Richiesta ${esc(j.codice)} · Non trovi l'email? Guarda nella posta indesiderata.</p></section>`);
        scrollTo(0, 0);
      } catch (x) { avviso(x.message); btn.disabled = false; btn.textContent = "Ricevi la stima gratuita"; }
    };
  }

  /* ------------------------------ conferma email ------------------------------ */
  async function paginaConferma() {
    const t = new URLSearchParams(location.hash.slice(1)).get("t") || new URLSearchParams(location.search).get("t");
    history.replaceState(null, "", location.pathname);
    if (!t) return errorePagina("Link incompleto", "Apri il link direttamente dall'email che ti abbiamo mandato.");
    guscio(`<section class="pg-scheda pg-centro"><h1>Confermo la richiesta…</h1></section>`);
    try {
      const r = await chiama({ azione: "conferma", token: t });
      if (r.gia) return guscio(`<section class="pg-scheda pg-centro"><h1>Richiesta già confermata</h1><p>La richiesta ${esc(r.codice)} è già attiva. Trovi la stima nella tua area personale.</p><a class="pg-invia" href="/prezzo-giusto/area">Vai all'area personale</a></section>`);
      guscio(`<section class="pg-scheda pg-centro"><div class="pg-icona">✓</div><h1>Email confermata</h1>
        <p>Stiamo analizzando la tua bolletta: tra pochi minuti ricevi la stima via email e la trovi nella tua area personale.</p>
        ${r.area ? `<p>Crea ora la password della tua area personale: ti servirà per vedere le stime e gestire il servizio.</p><a class="pg-invia" href="${esc(r.area)}">Crea la password</a>`
          : `<a class="pg-invia" href="/prezzo-giusto/area">Vai all'area personale</a>`}
        <p class="pg-nota">Richiesta ${esc(r.codice)} · Ti abbiamo inviato via email la conferma del servizio con le copie dei documenti accettati: conservala. Le scelte facoltative si gestiscono dall'area personale.</p></section>`);
    } catch (e) { errorePagina("Conferma non riuscita", e.message); }
  }

  /* ------------------------------ "non sono stato io" ------------------------------ */
  async function paginaSegnala() {
    const t = new URLSearchParams(location.hash.slice(1)).get("t");
    history.replaceState(null, "", location.pathname);
    if (!t) return errorePagina("Link incompleto", "Apri il link direttamente dall'email che hai ricevuto.");
    guscio(`<section class="pg-scheda pg-centro"><h1>Non hai fatto tu questa richiesta?</h1>
      <p>Se confermi, eliminiamo subito la richiesta e i file caricati. Nessuna analisi è stata avviata.</p>
      <button class="pg-invia" id="pg-segn">Elimina la richiesta</button><p class="pg-errore" id="pg-err" hidden></p></section>`);
    $("#pg-segn").onclick = async () => {
      try { await chiama({ azione: "segnala", token: t }); guscio(`<section class="pg-scheda pg-centro"><div class="pg-icona">✓</div><h1>Richiesta eliminata</h1><p>Abbiamo eliminato la richiesta e i file. Grazie per la segnalazione.</p></section>`); }
      catch (e) { const er = $("#pg-err"); er.textContent = e.message; er.hidden = false; }
    };
  }

  /* ------------------------------ stop del monitoraggio dall'avviso ------------------------------ */
  async function paginaStop() {
    const h = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, "", location.pathname);
    guscio(`<section class="pg-scheda pg-centro"><h1>Disattiva il monitoraggio</h1>
      <p>Interrompiamo subito controlli e avvisi per questa fornitura. La stima resta consultabile nella tua area personale.</p>
      <button class="pg-invia" id="pg-stop">Disattiva</button><p class="pg-errore" id="pg-err" hidden></p></section>`);
    $("#pg-stop").onclick = async () => {
      try { const r = await chiama({ azione: "stop_monitoraggio", r: h.get("r"), k: h.get("k") });
        guscio(`<section class="pg-scheda pg-centro"><div class="pg-icona">✓</div><h1>Monitoraggio disattivato</h1><p>Non riceverai più gli avvisi per la richiesta ${esc(r.codice)}. Ti abbiamo inviato una conferma via email.</p><a class="pg-invia" href="/prezzo-giusto/area">Area personale</a></section>`); }
      catch (e) { const er = $("#pg-err"); er.textContent = e.message; er.hidden = false; }
    };
  }

  /* ------------------------------ recesso dal servizio (anche senza password) ------------------------------ */
  async function paginaRecesso() {
    const t = new URLSearchParams(location.hash.slice(1)).get("t");
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    if (t) {
      guscio(`<section class="pg-scheda pg-centro"><h1>Confermo il recesso…</h1></section>`);
      try { const r = await chiama({ azione: "recesso_conferma", token: t });
        return guscio(`<section class="pg-scheda pg-centro"><div class="pg-icona">✓</div><h1>Recesso applicato</h1><p>La dichiarazione ricevuta il ${esc(dataOra(r.ricevuto_il))} è stata applicata: le attività interessate sono interrotte.</p></section>`); }
      catch (e) { return errorePagina("Conferma non riuscita", e.message); }
    }
    const { data: { session } } = await sb.auth.getSession();
    let pre = { email: "", nome: "" };
    if (session) { try { const { data: A } = await sb.rpc("cliente_area"); if (A?.cliente) pre = { email: A.cliente.email, nome: [A.cliente.nome, A.cliente.cognome].filter(Boolean).join(" ") }; } catch { } }
    guscio(`<section class="pg-scheda pg-stretta pg-recesso">
      <h1>Recedi dal servizio</h1>
      <p>Puoi cessare gratuitamente il servizio Alca Energy in qualsiasi momento, senza indicare un motivo. Ti inviamo una ricevuta via email con il contenuto, la data e l'ora della dichiarazione.</p>
      <form id="pg-rec" class="pg-colonna">
        <fieldset class="pg-scelta"><legend>Servizio interessato</legend>
          <label><input type="radio" name="servizi" value="tutto" checked> Tutto il servizio (stima, area personale e monitoraggio)</label>
          <label><input type="radio" name="servizi" value="monitoraggio"> Solo il monitoraggio delle offerte</label></fieldset>
        <label class="pg-campo">Nome e cognome<input id="pg-rn" value="${esc(pre.nome)}" autocomplete="name"></label>
        <label class="pg-campo">Numero della richiesta (facoltativo)<input id="pg-rr" placeholder="es. ST-1A2B3C4D"><small>Se lo indichi insieme all'email usata per la richiesta, il recesso si applica subito; altrimenti ti chiediamo una conferma via email.</small></label>
        <label class="pg-campo"><span>Email per la ricevuta <span class="pg-obb">*</span></span><input type="email" id="pg-re" value="${esc(pre.email)}" autocomplete="email" required></label>
        <p class="pg-errore" id="pg-err" hidden></p>
        <button class="pg-invia" type="submit">Continua</button>
      </form>
      <p class="pg-nota">Questa richiesta riguarda Alca e non esercita il ripensamento su contratti di fornitura già sottoscritti con un venditore. Revoca del marketing e cancellazione dei dati sono operazioni distinte, disponibili nell'area personale o scrivendo a energia@alcabroker.it.</p>
    </section>`, { senzaArea: !!session });
    $("#pg-rec").onsubmit = e => {
      e.preventDefault();
      const d = { servizi: document.querySelector('input[name="servizi"]:checked').value, nome: $("#pg-rn").value.trim(), riferimento: $("#pg-rr").value.trim(), email: $("#pg-re").value.trim() };
      const er = $("#pg-err");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) { er.textContent = "Indica l'email a cui inviare la ricevuta."; er.hidden = false; return; }
      const cosa = d.servizi === "tutto" ? "l'intero servizio Alca Energy (stima, area personale e monitoraggio)" : "il solo monitoraggio delle offerte";
      guscio(`<section class="pg-scheda pg-stretta pg-recesso"><h1>Riepilogo</h1>
        <p>Stai chiedendo la cessazione di <b>${esc(cosa)}</b>. Si interromperanno le relative attività, compreso l'eventuale monitoraggio.</p>
        <dl class="pg-dati"><div><dt>Nome</dt><dd>${esc(d.nome || "—")}</dd></div><div><dt>Richiesta</dt><dd>${esc(d.riferimento || "—")}</dd></div><div><dt>Ricevuta a</dt><dd>${esc(d.email)}</dd></div></dl>
        <p class="pg-nota">Questa richiesta riguarda Alca e non esercita il ripensamento su contratti di fornitura già sottoscritti con un venditore. Puoi inoltre scegliere di revocare il marketing o richiedere la cancellazione dei dati: sono operazioni distinte.</p>
        <p class="pg-errore" id="pg-err" hidden></p>
        <button class="pg-invia" id="pg-conf">Conferma recesso</button> <button class="pg-link" id="pg-ind">Modifica</button></section>`, { senzaArea: !!session });
      $("#pg-ind").onclick = () => paginaRecesso();
      $("#pg-conf").onclick = async () => {
        const b = $("#pg-conf"); b.disabled = true; b.textContent = "Invio in corso…";
        try {
          const r = await chiama({ azione: "recesso", ...d }, session);
          guscio(`<section class="pg-scheda pg-centro"><div class="pg-icona">✓</div><h1>Richiesta ricevuta</h1>
            <p>Richiesta ricevuta il <b>${esc(dataOra(r.ricevuto_il))}</b>. ${r.ricevuta ? `Ti abbiamo inviato una ricevuta a <b>${esc(r.email)}</b>.` : "Non siamo riusciti a inviare la ricevuta via email: conserva questa pagina e scrivici a energia@alcabroker.it."}</p>
            ${r.applicato ? "<p>Le attività interessate sono state interrotte.</p>" : "<p>Per applicare il recesso conferma dal pulsante nell'email: la data del recesso resta quella indicata qui.</p>"}</section>`, { senzaArea: !!session });
        } catch (x) { const er = $("#pg-err"); er.textContent = x.message; er.hidden = false; b.disabled = false; b.textContent = "Conferma recesso"; }
      };
    };
  }

  /* ------------------------------ archivio delle versioni dei testi legali ------------------------------ */
  async function paginaVersioni() {
    await new Promise(ok => { const s = document.createElement("script"); s.src = "/js/prezzo-giusto-legale-archivio.js"; s.onload = s.onerror = ok; document.head.appendChild(s); });
    const A = window.LEGALE_ARCHIVIO || {}, q = new URLSearchParams(location.search), v = q.get("v"), d = q.get("d");
    const NOMI = { condizioni: "Condizioni del servizio", privacy: "Informativa privacy", note: "Note sulla stima", cookie: "Informativa cookie" };
    document.title = "Archivio delle versioni · Alca Energy";
    if (v && d && A[v]?.[d]) {
      const T = A[v][d];
      return guscio(`<article class="pg-scheda pg-legale"><p class="pg-avviso">Versione ${esc(v)} non più in vigore (${esc(A[v].periodo || "")}). La versione attuale è in <a href="/prezzo-giusto/${esc(d)}">${esc(NOMI[d] || d)}</a>.</p>
        <h1>${esc(T.titolo)}</h1><p class="pg-nota">Versione ${esc(v)}</p>${T.testo}<p><a href="/prezzo-giusto/versioni">← Archivio delle versioni</a></p></article>`);
    }
    const riga = (ver, att, info, link) => `<tr><td><b>${esc(ver)}</b>${att ? ' <span class="pg-stato pg-ok">in vigore</span>' : ""}</td><td>${esc(info)}</td><td>${link}</td></tr>`;
    const doc = (base) => Object.keys(NOMI).filter(k => base(k)).map(k => `<a href="${base(k)}">${NOMI[k]}</a>`).join(" · ");
    guscio(`<article class="pg-scheda pg-legale"><h1>Archivio delle versioni</h1>
      <p>Qui trovi la versione in vigore e le versioni precedenti dei documenti del servizio, con le date. Ogni richiesta registra la versione che hai accettato; la copia completa ti è stata inviata via email alla conferma del servizio.</p>
      <table class="pg-tab-leg"><thead><tr><th>Versione</th><th>Periodo</th><th>Documenti</th></tr></thead><tbody>
        ${riga(LEG.versioni?.condizioni || "", true, LEG.efficacia ? "in vigore dal " + LEG.efficacia : "in vigore", doc(k => LEG[k] ? "/prezzo-giusto/" + k : ""))}
        ${Object.keys(A).sort().reverse().map(ver => riga(ver, false, A[ver].periodo || "", doc(k => A[ver][k] ? `/prezzo-giusto/versioni?v=${encodeURIComponent(ver)}&d=${k}` : ""))).join("")}
      </tbody></table></article>`);
  }

  /* ------------------------------ testi legali ------------------------------ */
  async function paginaLegale(chiave) {
    const l = new URLSearchParams(location.search).get("l");
    if (l) { try { const info = await chiama({ azione: "pagina", codice: l }); CONF = info.config; CODICE = l; colori(CONF.colori); } catch { } }
    const T = LEG[chiave];
    document.title = T.titolo + " · Alca Energy";
    guscio(`<article class="pg-scheda pg-legale"><h1>${esc(T.titolo)}</h1><p class="pg-nota">Versione ${esc(LEG.versioni[chiave] || "1.0")} · aggiornata al ${esc(LEG.aggiornato)}</p>${T.testo}</article>`);
  }

  /* ------------------------------ area cliente ------------------------------ */
  const STATI = { in_attesa_conferma: ["Da confermare", "attesa"], confermata: ["Confermata", "lavoro"], in_elaborazione: ["In analisi", "lavoro"], stima_pronta: ["Stima pronta", "ok"],
    non_disponibile: ["Stima pronta", "ok"], errore: ["In verifica", "attesa"], scaduta: ["Scaduta", "spento"],
    verifica_documento: ["Verifica del documento", "lavoro"], oscuramento_richiesto: ["Serve una versione oscurata", "attesa"], integrazione_richiesta: ["Servono altri dati", "attesa"], chiusa: ["Chiusa", "spento"] };
  let CLIENTE = null;   // dati del cliente nell'area personale (cellulare per il «Mi interessa»)
  const STATI_CONTR = { richiesta: "Richiesto", in_valutazione: "In valutazione", cliente_contattato: "In lavorazione", contratto_firmato: "Firmato" };

  async function paginaArea() {
    const hash = new URLSearchParams(location.hash.slice(1));
    const tipo = hash.get("type");
    const errHash = hash.get("error_description");
    const { data: { session } } = await sb.auth.getSession();
    if (location.hash) history.replaceState(null, "", location.pathname);
    if (!session) return accesso(errHash ? (hash.get("error_code") === "otp_expired" || /expired|invalid/i.test(errHash)
      ? "Questo link non vale più: è scaduto (dura un'ora) oppure ne hai chiesto uno più recente, che annulla i precedenti. Scrivi la tua email qui sotto e premi «Password dimenticata» una sola volta, poi apri l'ultima email ricevuta (in Gmail è l'ultimo messaggio della conversazione)."
      : "Il link non è più valido: accedi con email e password o chiedi un nuovo link.") : "");
    if (tipo === "invite" || tipo === "recovery" || sessionStorage.getItem("pg.nuovapw")) return nuovaPassword(tipo === "invite");
    return area();
  }

  function accesso(msg) {
    guscio(`<section class="pg-scheda pg-stretta"><h1>Area personale</h1>
      <form id="pg-login" class="pg-colonna">
        <label class="pg-campo">Email<input type="email" id="pg-le" autocomplete="username" required></label>
        <label class="pg-campo">Password<input type="password" id="pg-lp" autocomplete="current-password" required></label>
        <p class="pg-errore" id="pg-lerr" role="alert" ${msg ? "" : "hidden"}>${esc(msg)}</p>
        <button class="pg-invia" type="submit">Entra</button>
        <button class="pg-link" type="button" id="pg-dimenticata">Password dimenticata o mai creata?</button>
      </form></section>`, { senzaArea: true });
    const err = $("#pg-lerr"), avv = m => { err.textContent = m; err.hidden = !m; };
    $("#pg-login").onsubmit = async e => {
      e.preventDefault(); avv("");
      const { error } = await sb.auth.signInWithPassword({ email: $("#pg-le").value.trim(), password: $("#pg-lp").value });
      if (error) return avv("Email o password non corretti.");
      area();
    };
    const btn = $("#pg-dimenticata");
    if (msg) setTimeout(() => $("#pg-le").focus(), 0);
    btn.onclick = async () => {
      const email = $("#pg-le").value.trim();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return avv("Scrivi prima la tua email qui sopra.");
      // una richiesta alla volta: ogni nuovo link annulla quelli inviati prima
      btn.disabled = true;
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + "/prezzo-giusto/area" });
      if (error && /rate|seconds|secondi/i.test(error.message)) avv("Hai appena chiesto un link: aspetta l'email già inviata (controlla anche la posta indesiderata).");
      else avv("Se l'email è registrata ti arriva un link per scegliere la password. Usa solo quest'ultima email, entro un'ora: i link inviati prima non valgono più. In Gmail le email possono essere raggruppate: apri l'ultimo messaggio della conversazione.");
      let s = 60; btn.textContent = `Puoi chiedere un altro link tra ${s} s`;
      const t = setInterval(() => { s--; if (s > 0) btn.textContent = `Puoi chiedere un altro link tra ${s} s`; else { clearInterval(t); btn.disabled = false; btn.textContent = "Password dimenticata o mai creata?"; } }, 1000);
    };
  }

  function nuovaPassword(primaVolta) {
    sessionStorage.setItem("pg.nuovapw", "1");
    guscio(`<section class="pg-scheda pg-stretta"><h1>${primaVolta ? "Crea la tua password" : "Scegli una nuova password"}</h1>
      <p>Almeno 10 caratteri. Ti servirà per entrare nell'area personale.</p>
      <form id="pg-pw" class="pg-colonna">
        <label class="pg-campo">Password<input type="password" id="pg-p1" autocomplete="new-password" minlength="10" required></label>
        <label class="pg-campo">Ripeti la password<input type="password" id="pg-p2" autocomplete="new-password" required></label>
        <p class="pg-errore" id="pg-perr" role="alert" hidden></p>
        <button class="pg-invia" type="submit">Salva e continua</button></form></section>`);
    suggeritore([$("#pg-p1"), $("#pg-p2")]);
    $("#pg-pw").onsubmit = async e => {
      e.preventDefault();
      const p1 = $("#pg-p1").value, p2 = $("#pg-p2").value, err = $("#pg-perr");
      const avv = m => { err.textContent = m; err.hidden = !m; };
      if (p1.length < 10) return avv("La password deve avere almeno 10 caratteri.");
      if (p1 !== p2) return avv("Le due password non coincidono.");
      const { error } = await sb.auth.updateUser({ password: p1 });
      if (error) return avv(/same|different/i.test(error.message) ? "Scegli una password diversa da quella attuale." : "Password non salvata: " + error.message);
      sessionStorage.removeItem("pg.nuovapw");
      area();
    };
  }

  async function area(scheda) {
    const [{ data: A, error }, { data: R }] = await Promise.all([sb.rpc("cliente_area"),
      sb.from("richieste_referral").select("id, codice, created_at, stato, segmento, stima, file, confermata_il, privacy_versione, condizioni_versione, note_versione, monitoraggio, monitoraggio_dal, monitoraggio_scade, monitoraggio_fine, ricontatto, ricontatto_canale, ricontatto_scade, ricontatto_chiuso_il, stima_inviata_il, file_eliminati_il, proroga_il, dati_mancanti, documenti_inviati_il, interesse, interesse_il").order("created_at", { ascending: false })]);
    if (error || !A) {
      guscio(`<section class="pg-scheda pg-centro"><h1>Area non trovata</h1><p>Questo accesso non è collegato a un'area personale del servizio. Se hai appena fatto la richiesta, confermala dal link nell'email.</p><button class="pg-invia" id="pg-esci">Esci</button></section>`, { senzaArea: true });
      $("#pg-esci").onclick = esci; return;
    }
    if (A.link_codice && CODICE !== A.link_codice) { CODICE = A.link_codice; try { const info = await chiama({ azione: "pagina", codice: A.link_codice }); INFO = info; CONF = info.config; colori(CONF.colori); } catch { } }
    const C = A.cliente, RR = R || [], sch = scheda || sessionStorage.getItem("pg.scheda") || "richieste";
    CLIENTE = C;
    RICHIESTA_WA = RR[0]?.codice || "";
    sessionStorage.setItem("pg.scheda", sch);
    // sempre il referente configurato sul link (nome, email, telefono, WhatsApp); i campi vuoti restano quelli dell'utente
    const ref = Object.assign({}, A.referente || {});
    if (CONF?.referente) for (const k of ["nome", "email", "telefono", "whatsapp", "presentazione"]) if (String(CONF.referente[k] || "").trim()) ref[k] = CONF.referente[k];
    const wa = waLink(numeroWa(ref));
    const TAB = [["richieste", `Le mie richieste${RR.length ? ` (${RR.length})` : ""}`], ["nuova", "Nuova richiesta"], ["servizio", "Il servizio"], ["dati", "I miei dati"], ["contratti", "I miei contratti"]];
    guscio(`<section class="pg-area">
      <div class="pg-area-testa">
        <div><p class="pg-occhiello">La tua area personale</p><h1>${C.nome ? `Ciao ${esc(C.nome)}, ecco` : "Ecco"} le tue bollette sotto controllo.</h1><p class="pg-area-mail">${esc(C.email)} · <button class="pg-link" id="pg-esci">Esci</button></p></div>
        ${C.cessato_il ? "" : `<button class="pg-btn-primario" data-t="nuova">+ Nuova richiesta</button>`}
      </div>
      ${C.cessato_il ? `<p class="pg-avviso">Hai receduto dal servizio il ${data(C.cessato_il)}: le stime restano consultabili nei termini dell'informativa, ma non sono attivi monitoraggio né ricontatti.</p>` : ""}
      <div class="pg-tab-riga">
        <nav class="pg-tab" role="tablist">${TAB.map(([k, t]) => `<button role="tab" aria-selected="${k === sch}" data-t="${k}">${t}</button>`).join("")}</nav>
        ${ref.nome ? `<div class="pg-ref-chip">${fotoRef(CONF?.referente) ? ritratto(CONF.referente, "pg-ref-foto") : ""}<span>Il tuo referente: <b>${esc(ref.nome)}</b></span>${wa ? `<a href="${esc(wa)}" target="_blank" rel="noopener" aria-label="Scrivi su WhatsApp a ${esc(ref.nome)}" class="pg-wa-mini">${WA_SVG(18)}</a>` : ""}</div>` : ""}
      </div>
      <div id="pg-scheda">${schedaHtml(sch, A, RR, ref)}</div></section>`, { senzaArea: true });
    $("#pg-esci").onclick = esci;
    app.querySelectorAll("[data-t]").forEach(b => b.onclick = () => area(b.dataset.t));
    eventiScheda(sch, A, RR);
  }
  async function esci() { await sb.auth.signOut(); sessionStorage.removeItem("pg.scheda"); accesso(""); }

  const COMM = { luce: ["Luce", "⚡"], gas: ["Gas", "🔥"] };
  const NOME_CANALE = { email: "email", telefono: "telefono", whatsapp: "WhatsApp" };
  const dataBreve = d => d ? new Date(d).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
  const mesiIt = m => (m || []).map(x => { const [y, mm] = String(x).split("-"); return new Date(+y, +mm - 1, 1).toLocaleDateString("it-IT", { month: "short", year: "numeric" }); }).join(", ");
  const offRiga = (o, i) => `<li><span class="pg-off-n">${i + 1}</span><span class="pg-off-nome"><b>${esc(o.azienda)}</b> · ${esc(o.nome)}${o.tipologia ? ` <span class="pg-pill">${esc(o.tipologia === "Variabile" ? "prezzo variabile" : o.tipologia === "Fissa" ? "prezzo fisso" : o.tipologia)}</span>` : ""}</span>
    <span class="pg-off-v"><small>spesa stimata</small><b>${eur(o.nuovaSpesaAnnua)}/anno</b></span><span class="pg-off-v ${o.risparmioAnnuo > 0 ? "pg-verde" : ""}"><small>differenza</small><b>${o.risparmioAnnuo > 0 ? "−" : o.risparmioAnnuo < 0 ? "+" : ""}${eur(Math.abs(o.risparmioAnnuo))}</b></span></li>`;

  /* risultato: perimetro, base di confronto, ipotesi e i due gruppi di offerte (Alca / pubbliche esterne) */
  /* «Mi interessa, voglio essere contattato» sull'offerta migliore: arriva al referente (Referral → Preventivi) e nella pratica del CRM */
  function interesseHtml(r, c, b) {
    if (!r || !b || r.stato !== "stima_pronta" || CLIENTE?.cessato_il) return "";
    const mio = r.interesse && r.interesse.commodity === c && r.interesse.offerta_id === b.id ? r.interesse : null;
    if (mio) return `<div class="pg-interesse pg-interesse-ok" role="status"><div><b>✓ Richiesta inviata il ${data(mio.il)}</b>
      <span>Ti contatteremo al <b>${esc(mio.telefono)}</b> per l'offerta ${esc(mio.azienda)} · ${esc(mio.nome)}.</span></div></div>`;
    return `<div class="pg-interesse" data-int="${esc(r.id)}" data-c="${esc(c)}" data-off="${esc(b.id || "")}">
      <div class="pg-int-riga">
        <input type="tel" autocomplete="tel" inputmode="tel" value="${esc(CLIENTE?.telefono || "")}" placeholder="Il tuo numero di telefono" aria-label="Il tuo numero di telefono">
        <button class="pg-btn-primario pg-int-ok" type="button">Contattatemi</button>
      </div>
      <p class="pg-errore" role="alert" hidden></p>
      <p class="pg-nota">Ti interessa questa offerta? Lascia il numero: ti chiama il tuo referente. Non sottoscrivi nessun contratto.</p></div>`;
  }
  function fornituraHtml(c, f, stima, r) {
    const [nome, ic] = COMM[c] || [c, ""];
    const testa = `<div class="pg-forn-testa"><span class="pg-forn-ic pg-${c}" aria-hidden="true">${ic}</span><b>${nome}</b><span class="pg-nota">consumo annuo ${Number(f.consumoAnnuo || 0).toLocaleString("it-IT")} ${esc(f.unita || "")} · ${f.metodoConsumo === "bolletta" ? "dalla bolletta" : "stimato: " + esc(f.notaConsumo || "")}</span></div>`;
    if (f.errore) return `<div class="pg-forn">${testa}<p class="pg-forn-msg"><b>Non è stato calcolato un risparmio numerico.</b> ${esc(f.errore)}${f.mancanti?.length ? ": " + f.mancanti.map(esc).join("; ") : ""}.</p></div>`;
    const b = f.offerte?.[0];
    const base = b?.base || {};
    const attuale = b ? b.nuovaSpesaAnnua + b.risparmioAnnuo : null;
    const perimetro = `<details class="pg-dettagli" open><summary>Come abbiamo calcolato</summary><dl class="pg-dati">
      <div><dt>Periodo della bolletta</dt><dd>${dataBreve(f.periodo?.da)} – ${dataBreve(f.periodo?.a)}</dd></div>
      <div><dt>Consumo annuo usato</dt><dd>${Number(f.consumoAnnuo).toLocaleString("it-IT")} ${esc(f.unita)} · ${f.metodoConsumo === "bolletta" ? "riportato in bolletta" : esc(f.notaConsumo || "stimato")}${f.incertezza ? ` (±${Math.round(f.incertezza * 100)}%)` : ""}</dd></div>
      <div><dt>Orizzonte</dt><dd>12 mesi, stessi consumi per tutte le offerte</dd></div>
      <div><dt>Base di confronto</dt><dd>${f.metodoBase === "materia" ? `spesa per la materia ${c === "luce" ? "energia" : "gas"} della tua tariffa attuale, ricavata dalla bolletta${base.nota ? " (" + esc(base.nota) + ")" : ""}` : "totale della bolletta, perché la spesa per la materia non è leggibile"}</dd></div>
      <div><dt>Voci comprese nella differenza</dt><dd>${c === "luce" ? "energia, dispacciamento e capacità" : "gas"}, commercializzazione e quote fisse del venditore, con IVA</dd></div>
      <div><dt>Voci escluse</dt><dd>trasporto, oneri di sistema e imposte (uguali per tutte le offerte sullo stesso profilo), canone TV, arretrati, conguagli e depositi. Gli importi esclusi non rientrano nella differenza indicata.</dd></div>
      <div><dt>Spesa annua complessiva</dt><dd>comprende anche trasporto, oneri, accise e IVA, stimati con le tariffe regolate in vigore</dd></div>
      <div><dt>Prezzi variabili</dt><dd>indice ${esc(f.indice?.nome || "")}: media ${esc(mesiIt(f.indice?.mesi)) || "del periodo"}${f.indice?.valore != null ? ` (${Number(f.indice.valore).toLocaleString("it-IT", { maximumFractionDigits: 4 })} €/${esc(f.unita)})` : ""}. È una media storica, non una previsione del prezzo futuro.</dd></div>
      <div><dt>Sconti</dt><dd>non inclusi: gli sconti con requisiti (domiciliazione, nuovo cliente…) vanno verificati prima dell'adesione</dd></div>
      <div><dt>Fonte delle offerte</dt><dd>catalogo delle offerte attivabili tramite Alca, aggiornato al ${dataBreve(stima.fonti?.catalogoAlca)}</dd></div>
      ${f.ipotesi?.length ? `<div><dt>Dati da verificare</dt><dd>${f.ipotesi.map(esc).join("; ")}</dd></div>` : ""}
    </dl></details>`;
    const gruppo = (tit, lista, n, nota) => `<div class="pg-gruppo"><h4>${tit} <small>${n ? `${n} confrontabili · le più economiche per spesa stimata` : "nessuna disponibile"}</small></h4>
      ${lista?.length ? `<ol class="pg-offerte">${lista.map(offRiga).join("")}</ol>` : `<p class="pg-nota">${nota}</p>`}</div>`;
    const top = b && b.risparmioAnnuo > 0 ? `<div class="pg-risp">
        <div class="pg-risp-testo"><small>Differenza stimata su 12 mesi</small><strong>${eur(b.risparmioAnnuo)} <span>all'anno</span></strong>
          <p>con <b>${esc(b.azienda)} · ${esc(b.nome)}</b>, l'offerta attivabile tramite Alca con la spesa stimata più bassa tra le ${f.nAlca} confrontate</p>
          <p class="pg-nota">Rispetto alla tua tariffa attuale, limitatamente alle voci indicate sotto. Non rappresenta un prezzo futuro garantito.${b.min != null && b.max != null ? ` Intervallo: tra ${eur(Math.max(0, b.min))} e ${eur(b.max)}.` : ""}</p></div>
        <dl class="pg-confronto">
          <div><dt>Spesa annua stimata con la tariffa attuale</dt><dd>${eur(attuale)}</dd></div>
          <div><dt>Con ${esc(b.azienda)}</dt><dd>${eur(b.nuovaSpesaAnnua)}</dd></div>
          <div class="pg-conf-ok"><dt>Differenza al mese</dt><dd>circa ${eur(b.risparmioAnnuo / 12)}</dd></div>
        </dl></div>${interesseHtml(r, c, b)}`
      : `<p class="pg-forn-msg"><b>Tra le ${f.nAlca || 0} offerte attivabili tramite Alca confrontate, nessuna ha una spesa stimata inferiore alla tua tariffa attuale.</b></p>`;
    return `<div class="pg-forn">${testa}${top}
      ${gruppo("Attivabili tramite Alca", f.offerte, f.nAlca, "Nessuna offerta del catalogo Alca è compatibile con questa fornitura.")}
      <p class="pg-solo-alca"><b>Il confronto riguarda solo le offerte attivabili tramite Alca, non tutto il mercato:</b> un'offerta di un altro venditore potrebbe costare meno. Per un confronto con tutto il mercato puoi consultare il <a href="https://www.ilportaleofferte.it" target="_blank" rel="noopener">Portale Offerte pubblico</a>.</p>
      <p class="pg-nota">${INFO?.compensi ? esc(INFO.compensi) : "Alca può ricevere compensi dai fornitori per le attivazioni tramite la propria rete; i compensi non entrano nell'ordine delle offerte, che segue la spesa stimata."} <a href="/prezzo-giusto/note${CODICE ? "?l=" + esc(CODICE) : ""}" target="_blank">Come confrontiamo le offerte</a></p>
      ${perimetro}</div>`;
  }
  function caricaHtml(id, testo) {
    return `<form class="pg-integra" data-rid="${esc(id)}"><label class="pg-drop pg-drop-pic" tabindex="0"><input type="file" accept="application/pdf,image/jpeg,image/png" multiple hidden><b>${testo}</b><span>PDF, JPG o PNG · massimo 3 file da 10 MB</span></label>
      <ul class="pg-file"></ul><p class="pg-errore" hidden></p><button class="pg-btn-primario" type="submit">Invia</button></form>`;
  }
  function richiestaHtml(r, ref) {
    const [et, cl] = STATI[r.stato] || [r.stato, ""];
    const forn = r.stima?.forniture ? Object.entries(r.stima.forniture) : [];
    const scad = r.confermata_il ? new Date(new Date(r.proroga_il || r.confermata_il).getTime() + 30 * 864e5) : null;
    let corpo;
    if (r.stato === "stima_pronta" || r.stato === "non_disponibile") corpo = forn.map(([c, f]) => fornituraHtml(c, f, r.stima, r)).join("");
    else if (r.stato === "integrazione_richiesta") corpo = `<div class="pg-forn-msg"><p><b>Non possiamo ancora produrre una stima attendibile.</b> Non è stato calcolato un risparmio numerico. Occorre integrare:</p>
      <ul>${(r.dati_mancanti || []).map(m => `<li>${esc(m)}</li>`).join("")}</ul>
      <p>Invia i dati utili entro il <b>${data(scad)}</b>. ${r.proroga_il ? "Hai già usato l'unica proroga disponibile." : "Una tua integrazione utile consente una sola proroga, fino a 30 giorni dalla sua ricezione."} Alla scadenza, se la stima non è completata, elimineremo i documenti e occorrerà una nuova richiesta.</p></div>${caricaHtml(r.id, "Carica l'integrazione (altre pagine o un'altra bolletta)")}`;
    else if (r.stato === "oscuramento_richiesto") corpo = `<div class="pg-forn-msg"><p><b>Documento da oscurare.</b> Il documento contiene o può contenere informazioni non necessarie che non possiamo escludere con sicurezza dalla lettura esterna. L'invio al servizio AI è sospeso.</p><p>Carica una versione oscurata entro il <b>${data(scad)}</b>: copri le indicazioni sanitarie (ad esempio disagio fisico o apparecchiature elettromedicali).</p></div>${caricaHtml(r.id, "Carica la versione oscurata")}`;
    else if (r.stato === "verifica_documento") corpo = `<p class="pg-forn-msg pg-in-corso"><span class="pg-spin" aria-hidden="true"></span>Una persona incaricata sta verificando il documento prima dell'analisi automatica (le foto non si possono controllare in modo automatico).</p>`;
    else if (r.stato === "in_attesa_conferma") corpo = "<p class=\"pg-forn-msg\">Conferma la richiesta dal link nell'email che ti abbiamo mandato.</p>";
    else if (r.stato === "scaduta") corpo = "<p class=\"pg-forn-msg\">Il collegamento è scaduto o è già stato utilizzato. Se sono trascorsi 7 giorni dal caricamento, presenta una nuova richiesta.</p>";
    else if (r.stato === "chiusa") corpo = "<p class=\"pg-forn-msg\">La lavorazione non si è conclusa entro i termini e i documenti sono stati eliminati. Per proseguire presenta una nuova richiesta.</p>";
    else if (r.stato === "errore") corpo = "<p class=\"pg-forn-msg\">L'analisi non è riuscita: la stiamo verificando e ti scriveremo. Non è stato calcolato un risparmio numerico.</p>";
    else corpo = `<p class="pg-forn-msg pg-in-corso"><span class="pg-spin" aria-hidden="true"></span>Stiamo analizzando la bolletta: tra pochi minuti trovi qui la stima e ricevi un'email.</p>`;
    const totale = r.stima?.risparmioTotale > 0 && forn.filter(([, f]) => f.offerte?.[0]?.risparmioAnnuo > 0).length > 1 ? `<p class="pg-totale">Differenza stimata totale luce + gas: <b>${eur(r.stima.risparmioTotale)} all'anno</b>, sulle voci indicate</p>` : "";
    const ricAttivo = r.ricontatto && !r.ricontatto_chiuso_il && r.ricontatto_scade && new Date(r.ricontatto_scade) > new Date();
    const piede = r.stato === "stima_pronta" ? `<div class="pg-rich-piede">
        <p class="pg-nota">Stima orientativa ${esc(r.codice)} · elaborata il ${data(r.stima?.calcolata_il || r.created_at)} · non sottoscrive una fornitura${r.file_eliminati_il ? " · bolletta originale eliminata il " + data(r.file_eliminati_il) : ""}</p>
        <div class="pg-rich-azioni">${waLink(numeroWa(ref), r.codice) ? `<a class="pg-btn-wa" href="${esc(waLink(numeroWa(ref), r.codice))}" target="_blank" rel="noopener">${WA_SVG(16)} Scrivi su WhatsApp</a>` : ""}${ricAttivo ? `<span class="pg-stato pg-lavoro">Ricontatto richiesto via ${esc(NOME_CANALE[r.ricontatto_canale] || "")} fino al ${data(r.ricontatto_scade)}</span>`
          : `<button class="pg-btn-sec" data-ric="${esc(r.id)}">Chiedi chiarimenti</button>`}</div>
        <div class="pg-ric-form" id="ric-${esc(r.id)}" hidden><p class="pg-nota">${esc(INFO?.consensi?.ricontatto || "Chiedo di essere ricontattato per chiarimenti sulla stima.")}</p>
          <div class="pg-canali">${["email", "telefono", "whatsapp"].map(c => `<label><input type="radio" name="rc-${esc(r.id)}" value="${c}"> ${NOME_CANALE[c][0].toUpperCase() + NOME_CANALE[c].slice(1)}</label>`).join("")}</div>
          <p class="pg-nota">Massimo 3 tentativi entro 30 giorni; non autorizza campagne successive. Questi pulsanti non sottoscrivono una fornitura.</p>
          <button class="pg-btn-primario" data-ric-ok="${esc(r.id)}">Invia la richiesta</button></div></div>` : "";
    return `<article class="pg-scheda pg-rich">
      <header><div><b>Richiesta ${esc(r.codice)}</b><p class="pg-nota">${data(r.created_at)} · ${(r.file || []).length} file${r.segmento ? " · " + (r.segmento === "privati" ? "uso domestico" : "uso non domestico") : ""}</p></div><span class="pg-stato pg-${cl}">${esc(et)}</span></header>
      ${corpo}${totale}${piede}
    </article>`;
  }

  function schedaHtml(sch, A, R, ref) {
    const C = A.cliente, F = A.funzioni || {};
    if (sch === "richieste") return R.length ? R.map(r => richiestaHtml(r, ref)).join("")
      : `<div class="pg-scheda pg-centro"><p>Non hai ancora richieste.</p><button class="pg-btn-primario" data-t="nuova">Carica la prima bolletta</button></div>`;
    if (sch === "nuova") return C.cessato_il ? `<div class="pg-scheda"><h2>Nuova bolletta</h2><p>Hai receduto dal servizio: per una nuova stima usa il link del tuo referente.</p></div>`
      : (A.link_codice || R.length) ? `<form class="pg-scheda pg-nuova" id="pg-nuova" novalidate>
        <h2>Carica una nuova bolletta</h2>
        <p>Hai cambiato fornitore, hai un'altra utenza o vuoi aggiornare la stima? Carica la bolletta: valgono i dati e le condizioni che hai già accettato (versione ${esc(R[0]?.condizioni_versione || "1.1")}).</p>
        <label class="pg-drop" id="pg-drop" tabindex="0">
          <input type="file" id="pg-file" accept="application/pdf,image/jpeg,image/png" multiple hidden>
          <b>Carica la bolletta</b><span>PDF, JPG o PNG · massimo 3 file da 10 MB ciascuno</span>
        </label>
        <p class="pg-aiuto">Oscura IBAN e informazioni non necessarie. Non inviare informazioni sanitarie: se presenti, oscurale prima di caricare il documento.</p>
        <ul class="pg-file" id="pg-lista"></ul>
        ${F.monitoraggio ? `<label class="pg-check"><input type="checkbox" id="pg-mon"> <span>${esc(INFO?.consensi?.monitoraggio || "Chiedo di attivare il monitoraggio gratuito per 12 mesi per questa fornitura e acconsento a ricevere via email i relativi avvisi sulle offerte.")}</span></label>` : ""}
        <p class="pg-errore" id="pg-err" role="alert" hidden></p>
        <button class="pg-invia" id="pg-invia" type="submit">Analizza la bolletta</button>
        <p class="pg-nota">La stima arriva a <b>${esc(C.email)}</b> e la trovi in <b>Le mie richieste</b>. Nessun contratto di fornitura viene sottoscritto.</p></form>`
      : `<div class="pg-scheda"><h2>Nuova bolletta</h2><p>Per una nuova stima contatta il tuo referente${ref.email ? `: <a href="mailto:${esc(ref.email)}">${esc(ref.email)}</a>` : ""}.</p></div>`;
    if (sch === "servizio") {
      const conStima = R.filter(r => r.stato === "stima_pronta" || r.stato === "non_disponibile");
      const riga = (k, v) => `<div><dt>${k}</dt><dd>${v}</dd></div>`;
      const monit = conStima.map(r => {
        const forn = Object.entries(r.stima?.forniture || {}).filter(([, f]) => !f.errore);
        const titolo = forn.map(([c, f]) => `${COMM[c][0]} · ${esc(f.fornitoreAttuale || "fornitore attuale")}`).join(" + ") || "Fornitura";
        const attivo = r.monitoraggio, inScad = attivo && r.monitoraggio_scade && new Date(r.monitoraggio_scade) < new Date(Date.now() + 30 * 864e5);
        return `<article class="pg-scheda pg-monit">
          <header><b>${titolo}</b>${attivo ? `<span class="pg-stato pg-ok">Monitoraggio attivo</span>` : `<span class="pg-stato">Monitoraggio non attivo</span>`}</header>
          <dl class="pg-dati">${riga("Richiesta", esc(r.codice))}${riga("Adesione confermata", r.confermata_il ? dataOra(r.confermata_il) : "—")}
            ${attivo ? riga("Attivo fino al", `<b>${data(r.monitoraggio_scade)}</b>${inScad ? " · in scadenza" : ""}`) : r.monitoraggio_fine ? riga("Fermato il", data(r.monitoraggio_fine)) : ""}
            ${riga("Documenti accettati", `condizioni-${esc(r.condizioni_versione || "")} · note-${esc(r.note_versione || r.condizioni_versione || "")} · privacy-${esc(r.privacy_versione || "")}`)}</dl>
          <div class="pg-monit-az">
            ${attivo ? `<button class="pg-btn-sec" data-mon="${esc(r.id)}" data-v="0">Interrompi monitoraggio</button>` : ""}
            ${F.monitoraggio && !C.cessato_il && (!attivo || inScad) ? `<button class="pg-btn-primario" data-mon="${esc(r.id)}" data-v="1">${attivo ? "Rinnova per 12 mesi" : "Attiva per 12 mesi"}</button>` : ""}
          </div>
          ${F.monitoraggio && (!attivo || inScad) ? `<p class="pg-nota">Attivando o rinnovando: ${esc(INFO?.consensi?.monitoraggio || "")} Controlli ogni 3 giorni; avvisi solo con un miglioramento verificato, almeno 7 giorni l'uno dall'altro.</p>` : ""}
        </article>`;
      }).join("");
      const mktSett = [["energia", "Luce e gas", C.mkt_energia || [], C.mkt_energia_scade, INFO?.consensi?.mkt_energia], ["assicurazioni", "Prodotti assicurativi", C.mkt_assic || [], C.mkt_assic_scade, INFO?.consensi?.mkt_assic]];
      const mktAttivo = mktSett.some(s => s[2].length);
      return `<div class="pg-serv">
        <div class="pg-serv-sx">
          <h2 class="pg-serv-tit">Le tue forniture e il monitoraggio</h2>
          ${monit || `<div class="pg-scheda"><p>Appena una bolletta è analizzata, qui puoi attivare o fermare il monitoraggio di quella fornitura.</p></div>`}
          <div class="pg-scheda pg-monit-cmd"><div><b>Recesso e cancellazione</b>
            <p>Puoi cessare gratuitamente il servizio in qualsiasi momento; la cancellazione dei dati è una richiesta distinta.</p></div>
            <div class="pg-monit-az"><a class="pg-btn-sec" href="/prezzo-giusto/recesso">Recedi dal servizio</a><button class="pg-btn-sec pg-btn-perico" id="pg-canc">Elimina i miei dati</button></div></div>
        </div>
        <aside class="pg-serv-dx">
          <div class="pg-scheda">
            <h3>Comunicazioni promozionali</h3>
            ${F.marketing || mktAttivo ? mktSett.map(([k, nome, can, scade, testo]) => `<div class="pg-mkt" data-sett="${k}">
              <p><b>${nome}</b> · ${can.length ? `attivo via ${can.map(c => NOME_CANALE[c]).join(", ")} fino al ${data(scade)}` : "nessun consenso"}</p>
              ${F.marketing ? `<p class="pg-nota">${esc(testo || "")}</p><div class="pg-canali">${["email", "telefono", "whatsapp"].map(c => `<label><input type="checkbox" value="${c}" ${can.includes(c) ? "checked" : ""}> ${NOME_CANALE[c][0].toUpperCase() + NOME_CANALE[c].slice(1)}</label>`).join("")}</div>` : ""}
              <div class="pg-monit-az">${F.marketing ? `<button class="pg-btn-sec" data-mkt-salva="${k}">Salva le scelte</button>` : ""}${can.length ? `<button class="pg-btn-sec" data-mkt-revoca="${k}">Revoca</button>` : ""}</div></div>`).join("")
              : `<p>In questo servizio non inviamo comunicazioni promozionali: non è attivo alcun consenso.</p>`}
            <p class="pg-nota">Consensi facoltativi, separati dal servizio: cambiarli non interrompe la stima né il monitoraggio. Validità massima 12 mesi.</p>
          </div>
          <div class="pg-scheda">
            <h3>Documenti e privacy</h3>
            <p><a href="/prezzo-giusto/condizioni${CODICE ? "?l=" + esc(CODICE) : ""}">Condizioni del servizio</a> · <a href="/prezzo-giusto/note${CODICE ? "?l=" + esc(CODICE) : ""}">Note sulla stima</a> · <a href="/prezzo-giusto/privacy${CODICE ? "?l=" + esc(CODICE) : ""}">Informativa privacy</a> · <a href="/prezzo-giusto/cookie${CODICE ? "?l=" + esc(CODICE) : ""}">Cookie</a></p>
            <p class="pg-nota">Le copie delle versioni che hai accettato sono allegate all'email di conferma del servizio. Per accesso, rettifica, cancellazione, limitazione, portabilità o opposizione scrivi a <a href="mailto:energia@alcabroker.it">energia@alcabroker.it</a>: rispondiamo entro un mese dal ricevimento.</p>
          </div>
          ${ref.nome ? `<div class="pg-scheda"><h3>Il tuo referente</h3><p><b>${esc(ref.nome)}</b></p><div class="pg-ref-azioni">
            ${waLink(numeroWa(ref)) ? `<a class="pg-btn-wa" href="${esc(waLink(numeroWa(ref)))}" target="_blank" rel="noopener">${WA_SVG(16)} WhatsApp</a>` : ""}
            ${ref.telefono ? `<a href="tel:${esc(telLink(ref.telefono))}">${esc(ref.telefono)}</a>` : ""}${ref.email ? `<a href="mailto:${esc(ref.email)}">${esc(ref.email)}</a>` : ""}</div>
            <p class="pg-nota">Scrivere al referente è una tua iniziativa; per essere ricontattato usa «Chiedi chiarimenti» sulla richiesta.</p></div>` : ""}
        </aside></div>`;
    }
    if (sch === "dati") return `<div class="pg-scheda"><h2>I miei dati</h2><form id="pg-dati" class="pg-griglia">
      <label class="pg-campo">Nome<input id="pg-dn" value="${esc(C.nome || "")}" autocomplete="given-name"></label>
      <label class="pg-campo">Cognome<input id="pg-dc" value="${esc(C.cognome || "")}" autocomplete="family-name"></label>
      <label class="pg-campo">Cellulare<input id="pg-dt" value="${esc(C.telefono || "")}" type="tel" autocomplete="tel"><small>Inserirlo non equivale a chiedere telefonate o ad accettare pubblicità.</small></label>
      <label class="pg-campo">Email<input value="${esc(C.email)}" disabled></label>
      <button class="pg-invia" type="submit">Salva</button><p class="pg-nota" id="pg-dok" hidden>Dati salvati.</p></form>
      <h2>Password</h2><form id="pg-cpw" class="pg-griglia">
      <label class="pg-campo">Nuova password<input type="password" id="pg-np" minlength="10" autocomplete="new-password"></label>
      <button class="pg-invia" type="submit">Cambia password</button><p class="pg-nota" id="pg-pok" hidden></p></form>
      <p class="pg-nota">Impostare una password non equivale a prestare consenso al marketing. Per cancellare i tuoi dati usa «Elimina i miei dati» in Il servizio o scrivi a <a href="mailto:energia@alcabroker.it">energia@alcabroker.it</a>.</p></div>`;
    if (sch === "contratti") return A.contratti.length ? A.contratti.map(c => `<article class="pg-scheda pg-rich"><header><b>${esc(c.offerta || "Contratto")}</b><span class="pg-stato ${c.stato === "contratto_firmato" ? "pg-ok" : "pg-lavoro"}">${esc(STATI_CONTR[c.stato] || c.stato)}</span></header>
      <p class="pg-nota">${esc(c.numero || "")} · ${c.commodity === "gas" ? "Gas" : c.commodity === "luce" ? "Luce" : esc(c.commodity || "")} · ${c.contratto_il ? "firmato il " + data(c.contratto_il) : "richiesto il " + data(c.richiesto_il)}</p>
      ${c.risparmio_annuo ? `<p>Differenza stimata al momento della richiesta: <b>${eur(c.risparmio_annuo)} all'anno</b></p>` : ""}
      <p class="pg-nota">Il contratto di fornitura è con il venditore: recesso e reclami sulla fornitura seguono i suoi documenti.</p></article>`).join("")
      : `<div class="pg-scheda pg-centro"><p>Non ci sono contratti attivati tramite Alca.</p></div>`;
    return "";
  }

  // caricamento file riutilizzabile (nuova richiesta, integrazione, versione oscurata)
  function zonaFile(drop, lista, avviso) {
    const input = drop.querySelector("input[type=file]"), files = [];
    const OK = ["application/pdf", "image/jpeg", "image/png"];
    const mostra = () => { lista.innerHTML = files.map((f, i) => `<li>${esc(f.name)} <small>${(f.size / 1048576).toFixed(1)} MB</small> <button type="button" data-i="${i}" aria-label="Rimuovi">×</button></li>`).join(""); };
    const aggiungi = fl => { for (const f of fl) { if (!OK.includes(f.type) || f.size > 10 * 1048576 || files.length >= 3) { avviso("Il file non è stato acquisito. Usa PDF, JPG o PNG entro 10 MB; sono consentiti al massimo 3 file."); continue; } files.push(f); } mostra(); };
    input.onchange = () => { aggiungi(input.files); input.value = ""; };
    drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } };
    ["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("pg-sopra"); }));
    ["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("pg-sopra"); }));
    drop.addEventListener("drop", e => aggiungi(e.dataTransfer.files));
    lista.onclick = e => { const b = e.target.closest("button[data-i]"); if (b) { files.splice(+b.dataset.i, 1); mostra(); } };
    return files;
  }
  async function inviaFileArea(fd) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { accesso("Accesso scaduto: entra di nuovo."); throw new Error("Accesso scaduto"); }
    const r = await fetch(FN, { method: "POST", headers: { apikey: CFG.supabaseKey, Authorization: "Bearer " + session.access_token }, body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errore) throw new Error(j.errore || "Non abbiamo conferma che l'invio sia stato completato: controlla Le mie richieste prima di riprovare.");
    return j;
  }

  function eventiScheda(sch, A, R) {
    const errore = m => alert(m);
    if (sch === "servizio") {
      app.querySelectorAll("[data-mon]").forEach(b => b.onclick = async () => {
        const v = b.dataset.v === "1";
        if (!v && !confirm("Interrompere il monitoraggio di questa fornitura? Controlli e avvisi si fermano subito.")) return;
        const { error } = await sb.rpc("cliente_monitoraggio", { p_richiesta: b.dataset.mon, p_attivo: v, p_testo: v ? INFO?.consensi?.monitoraggio || null : null });
        if (error) return errore("Non salvato: " + error.message);
        area("servizio");
      });
      app.querySelectorAll("[data-mkt-salva],[data-mkt-revoca]").forEach(b => b.onclick = async () => {
        const sett = b.dataset.mktSalva || b.dataset.mktRevoca, box = b.closest(".pg-mkt");
        const can = b.dataset.mktRevoca ? [] : [...box.querySelectorAll("input:checked")].map(i => i.value);
        const testo = sett === "energia" ? INFO?.consensi?.mkt_energia : INFO?.consensi?.mkt_assic;
        const { error } = await sb.rpc("cliente_marketing", { p_settore: sett, p_canali: can, p_testo: can.length ? testo || null : null });
        if (error) return errore("Non salvato: " + error.message);
        area("servizio");
      });
      $("#pg-canc").onclick = async () => {
        if (!confirm("Eliminare i tuoi dati? Chiudiamo l'area personale ed eliminiamo richieste, bollette, stime e pratiche collegate. Restano solo le prove minime delle tue scelte privacy, senza dati di contatto. L'operazione non si può annullare.")) return;
        const { data: { session } } = await sb.auth.getSession();
        try { await chiama({ azione: "cancellazione" }, session); } catch (e) { return errore(e.message); }
        await sb.auth.signOut(); sessionStorage.clear();
        guscio(`<section class="pg-scheda pg-centro"><div class="pg-icona">✓</div><h1>Dati eliminati</h1><p>Abbiamo eseguito la richiesta e ti abbiamo inviato il riepilogo via email, con le sole informazioni conservate e il motivo.</p></section>`, { senzaArea: true });
      };
    }
    if (sch === "richieste") {
      app.querySelectorAll("[data-ric]").forEach(b => b.onclick = () => { const f = $("#ric-" + b.dataset.ric); f.hidden = !f.hidden; });
      app.querySelectorAll("[data-ric-ok]").forEach(b => b.onclick = async () => {
        const id = b.dataset.ricOk, c = document.querySelector(`input[name="rc-${id}"]:checked`)?.value;
        if (!c) return errore("Scegli il canale: email, telefono o WhatsApp.");
        const { error } = await sb.rpc("cliente_ricontatto", { p_richiesta: id, p_canale: c, p_testo: INFO?.consensi?.ricontatto || null });
        if (error) return errore(error.message);
        area("richieste");
      });
      app.querySelectorAll(".pg-interesse[data-int]").forEach(box => {
        const inp = box.querySelector("input"), err = box.querySelector(".pg-errore");
        const avv = m => { err.textContent = m; err.hidden = !m; };
        const invia = async (tel, btn) => {
          avv(""); btn.disabled = true; const t0 = btn.textContent; btn.textContent = "Invio…";
          const { error } = await sb.rpc("cliente_interesse", { p_richiesta: box.dataset.int, p_commodity: box.dataset.c, p_offerta: box.dataset.off || null, p_telefono: tel || null,
            p_testo: "Mi interessa questa offerta: chiedo di essere contattato per telefono per valutarla." });
          if (error) { btn.disabled = false; btn.textContent = t0; inp.focus(); return avv(error.message); }
          area("richieste");
        };
        const ok = box.querySelector(".pg-int-ok");
        ok.onclick = () => {
          const tel = inp.value.trim();
          if (tel.replace(/\D/g, "").length < 6) { inp.focus(); return avv("Inserisci un numero di telefono valido."); }
          invia(tel, ok);
        };
        inp.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); ok.click(); } };
      });
      app.querySelectorAll(".pg-integra").forEach(form => {
        const err = form.querySelector(".pg-errore"), avv = m => { err.textContent = m; err.hidden = !m; };
        const files = zonaFile(form.querySelector(".pg-drop"), form.querySelector(".pg-file"), avv);
        form.onsubmit = async e => {
          e.preventDefault(); avv("");
          if (!files.length) return avv("Carica almeno un file.");
          const fd = new FormData(); fd.append("azione", "invia_area"); fd.append("richiesta_id", form.dataset.rid); files.forEach(f => fd.append("file", f, f.name));
          const btn = form.querySelector("button[type=submit]"); btn.disabled = true; btn.textContent = "Invio…";
          try { await inviaFileArea(fd); area("richieste"); } catch (x) { avv(x.message); btn.disabled = false; btn.textContent = "Invia"; }
        };
      });
      if (R.some(r => ["confermata", "in_elaborazione"].includes(r.stato))) { clearTimeout(area._t); area._t = setTimeout(() => { if (sessionStorage.getItem("pg.scheda") === "richieste") area("richieste"); }, 20000); }
    }
    if (sch === "nuova" && $("#pg-nuova")) {
      const err = $("#pg-err"), avv = m => { err.textContent = m; err.hidden = !m; };
      const files = zonaFile($("#pg-drop"), $("#pg-lista"), avv);
      $("#pg-nuova").onsubmit = async e => {
        e.preventDefault(); avv("");
        if (!files.length) return avv("Carica la bolletta (PDF, JPG o PNG).");
        const fd = new FormData(); fd.append("azione", "invia_area"); fd.append("monitoraggio", $("#pg-mon")?.checked ? "si" : "no"); files.forEach(f => fd.append("file", f, f.name));
        const btn = $("#pg-invia"); btn.disabled = true; btn.textContent = "Invio in corso…";
        try { await inviaFileArea(fd); await area("richieste"); scrollTo(0, 0); } catch (x) { avv(x.message); btn.disabled = false; btn.textContent = "Analizza la bolletta"; }
      };
    }
    if (sch === "dati") {
      $("#pg-dati").onsubmit = async e => {
        e.preventDefault();
        const tel = $("#pg-dt").value.trim();
        if (tel && tel.replace(/\D/g, "").length < 6) return errore("Il numero di cellulare non sembra valido.");
        const { error } = await sb.rpc("cliente_dati", { p_nome: $("#pg-dn").value, p_cognome: $("#pg-dc").value, p_telefono: tel });
        $("#pg-dok").hidden = false; $("#pg-dok").textContent = error ? "Non salvato: " + error.message : "Dati salvati.";
      };
      suggeritore([$("#pg-np")]);
      $("#pg-cpw").onsubmit = async e => {
        e.preventDefault();
        const p = $("#pg-np").value, ok = $("#pg-pok"); ok.hidden = false;
        if (p.length < 10) { ok.textContent = "Almeno 10 caratteri."; return; }
        const { error } = await sb.auth.updateUser({ password: p });
        ok.textContent = error ? "Non cambiata: " + error.message : "Password cambiata.";
        if (!error) $("#pg-np").value = "";
      };
    }
  }

  /* ------------------------------ area partner: candidature di agenti, subagenti, segnalatori, agenzie ------------------------------ */
  async function paginaPartner() {
    document.title = "Diventa partner · Alca Energy";
    // tasto WhatsApp del Team Energia, con un messaggio per chi vuole collaborare
    try { const i = await chiama({ azione: "pagina", codice: CODICE_SITO }); CONF = i.config; MSG_WA = "Salve, vorrei informazioni per collaborare con Alca Energy come partner."; } catch (e) { }
    CODICE = ""; sessionStorage.removeItem("pg.codice");
    const TIPI = [["agente", "Agente"], ["subagente", "Subagente"], ["produttore", "Produttore / segnalatore"], ["agenzia", "Agenzia o struttura"], ["altro", "Altro"]];
    guscio(`
      <section class="sx-eroe sx-eroe-partner"><div class="sx-wrap sx-eroe-in">
        <div class="sx-eroe-testo">
          <p class="sx-occhiello">Area partner · per i professionisti dell'energia</p>
          <h1>Il tuo lavoro. <em>Più strumenti.</em></h1>
          <p class="sx-descr">Agenti, subagenti, segnalatori e agenzie del settore luce e gas: lavora con Alca Energy e con il portale che usiamo ogni giorno per preventivi, clienti e offerte.</p>
          <ul class="sx-vantaggi">
            <li>${ICONA.stima}<div><b>Preventivi per aziende e privati</b><small>Carichi la bolletta, l'analisi legge i dati e il confronto con il catalogo è pronto in pochi minuti.</small></div></li>
            <li>${ICONA.luce}<div><b>Catalogo offerte aggiornato</b><small>Le offerte attivabili, con prezzi, condizioni e scadenze in un unico posto.</small></div></li>
            <li>${ICONA.persona}<div><b>Il tuo link personale</b><small>Una pagina con il tuo nome per i clienti: caricano la bolletta, ricevono la stima e tu segui la pratica.</small></div></li>
            <li>${ICONA.scudo}<div><b>Back office al tuo fianco</b><small>Verifica dei dati, contratti e assistenza dall'ufficio Alca.</small></div></li>
          </ul>
          <p class="sx-gia">Sei già partner? <a class="sx-sottolineato chiaro" href="/portale">Accedi al portale</a></p>
        </div>
        <form class="sx-card" id="pt-form" novalidate>
          <div class="sx-card-testa"><span>Candidatura</span><b class="sx-gratis">Ti ricontattiamo noi</b></div>
          <h2>Lavoriamo<br>insieme?</h2>
          <p class="sx-card-sotto">Lasciaci i tuoi dati: ti contattiamo per conoscerci. Se la collaborazione parte, ricevi l'invito personale al portale.</p>
          <fieldset class="sx-chips"><legend>Chi sei <span class="pg-obb">*</span></legend>${TIPI.map(([v, l]) => `<label><input type="radio" name="pt-tipo" value="${v}"><span>${l}</span></label>`).join("")}</fieldset>
          <label class="pg-campo" id="pt-altro-c" hidden><span>Specifica</span><input id="pt-altro" maxlength="80" placeholder="es. consulente, installatore…"></label>
          <div class="sx-campi2"><label class="pg-campo"><span>Nome <span class="pg-obb">*</span></span><input id="pt-nome" autocomplete="given-name" maxlength="80"></label>
            <label class="pg-campo"><span>Cognome <span class="pg-obb">*</span></span><input id="pt-cognome" autocomplete="family-name" maxlength="80"></label></div>
          <div class="sx-campi2"><label class="pg-campo"><span>Ragione sociale <span class="pg-fac">facoltativo</span></span><input id="pt-rs" autocomplete="organization" maxlength="120"></label>
            <label class="pg-campo"><span>Partita IVA <span class="pg-fac">facoltativo</span></span><input id="pt-piva" inputmode="numeric" maxlength="13"></label></div>
          <div class="sx-campi2"><label class="pg-campo"><span>Email <span class="pg-obb">*</span></span><input id="pt-email" type="email" autocomplete="email" maxlength="160"></label>
            <label class="pg-campo"><span>Telefono <span class="pg-obb">*</span></span><input id="pt-tel" type="tel" autocomplete="tel" maxlength="30"></label></div>
          <label class="pg-campo"><span>Zona in cui operi <span class="pg-fac">facoltativo</span></span><input id="pt-zona" maxlength="120" placeholder="es. Napoli e provincia"></label>
          <label class="pg-campo"><span>Esperienza nel settore <span class="pg-fac">facoltativo</span></span><textarea id="pt-esp" rows="2" maxlength="600" placeholder="es. 5 anni con mandati luce e gas, clienti business"></textarea></label>
          <label class="pg-campo"><span>Messaggio <span class="pg-fac">facoltativo</span></span><textarea id="pt-msg" rows="3" maxlength="1500"></textarea></label>
          <label class="sx-trappola" aria-hidden="true">Sito web<input id="pt-sito" tabindex="-1" autocomplete="off"></label>
          <fieldset class="pg-consensi"><legend>Privacy</legend>
            <label><input type="checkbox" id="pt-privacy"> <span>Ho letto l'informativa sul trattamento dei dati della candidatura (versione 1.0).</span></label>
            <details class="pg-piu"><summary>Informativa sul trattamento dei dati della candidatura</summary><div class="pg-piu-c">
              <p><b>Titolare:</b> Alca Broker S.r.l., Via Vittoria Colonna 14, 80121 Napoli, P.IVA 07965051217 · contatto: <a href="mailto:energia@alcabroker.it">energia@alcabroker.it</a> · responsabile della protezione dei dati: <a href="mailto:dpo@alcabroker.it">dpo@alcabroker.it</a>.</p>
              <p><b>Finalità e base giuridica:</b> valutare la tua candidatura e ricontattarti per una possibile collaborazione commerciale (misure precontrattuali richieste da te, art. 6.1.b GDPR); sicurezza del servizio contro invii abusivi (legittimo interesse, art. 6.1.f).</p>
              <p><b>Dati:</b> quelli che inserisci nel modulo, oltre a indirizzo IP e dati tecnici del browser al momento dell'invio. Non inserire dati che non riguardano la collaborazione.</p>
              <p><b>Destinatari:</b> personale Alca incaricato e fornitori tecnici che ospitano il servizio e la posta (Supabase, con dati nell'UE; Netlify; Google Workspace), nominati responsabili del trattamento.</p>
              <p><b>Conservazione:</b> se la collaborazione non parte, eliminiamo la candidatura entro 12 mesi dall'invio; se parte, i dati confluiscono nel rapporto di collaborazione e nella relativa informativa.</p>
              <p><b>Diritti:</b> accesso, rettifica, cancellazione, limitazione, opposizione e portabilità scrivendo a energia@alcabroker.it; puoi proporre reclamo al Garante per la protezione dei dati personali.</p></div></details>
          </fieldset>
          <p class="pg-errore" id="pt-err" role="alert" hidden></p>
          <button class="sx-btn" id="pt-invia" type="submit">Invia la candidatura</button>
          <p class="sx-card-nota">${ICONA.scudo}Nessun impegno: la collaborazione parte solo dopo un colloquio e un accordo scritto.</p>
        </form>
      </div></section>
      <section class="sx-passi"><div class="sx-wrap sx-passi-in">
        <div><p class="sx-occhiello">Come funziona</p><h2>Dalla candidatura<br>al portale.</h2></div>
        <ol><li><span class="sx-ico">${ICONA.mail}</span><b>Ti candidi</b><small>Bastano pochi dati: chi sei e come contattarti.</small></li>
          <li><span class="sx-ico">${ICONA.persona}</span><b>Ci conosciamo</b><small>Ti chiamiamo per capire come lavori e definire l'accordo.</small></li>
          <li><span class="sx-ico">${ICONA.ok}</span><b>Ti attiviamo</b><small>Ricevi l'invito personale al portale e il tuo link per i clienti.</small></li></ol>
      </div></section>`, { pieno: true });
    const err = $("#pt-err"), avv = m => { err.textContent = m; err.hidden = !m; if (m) err.scrollIntoView({ block: "nearest" }); };
    document.querySelectorAll('input[name="pt-tipo"]').forEach(r => r.onchange = () => { $("#pt-altro-c").hidden = r.value !== "altro" || !r.checked; });
    $("#pt-form").onsubmit = async e => {
      e.preventDefault(); avv("");
      const v = id => $(id).value.trim();
      const d = { tipo: document.querySelector('input[name="pt-tipo"]:checked')?.value || "", tipo_altro: v("#pt-altro"), nome: v("#pt-nome"), cognome: v("#pt-cognome"),
        ragione_sociale: v("#pt-rs"), piva: v("#pt-piva"), email: v("#pt-email"), telefono: v("#pt-tel"), zona: v("#pt-zona"), esperienza: v("#pt-esp"), messaggio: v("#pt-msg"),
        sito_web: v("#pt-sito"), privacy: $("#pt-privacy").checked ? "si" : "" };
      if (!d.tipo) return avv("Indica chi sei: agente, subagente, produttore, agenzia o altro.");
      if (!d.nome || !d.cognome) return avv("Nome e cognome sono obbligatori.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return avv("Inserisci un'email valida.");
      if (d.telefono.replace(/\D/g, "").length < 6) return avv("Inserisci un numero di telefono valido.");
      if (d.piva && !/^(IT)?\d{11}$/i.test(d.piva.replace(/\s+/g, ""))) return avv("La partita IVA deve avere 11 cifre.");
      if (!d.privacy) return avv("Per inviare la candidatura serve la presa visione dell'informativa.");
      const b = $("#pt-invia"); b.disabled = true; b.textContent = "Invio in corso…";
      try {
        const r = await fetch(CFG.supabaseUrl + "/functions/v1/partner-candidatura", { method: "POST", headers: { "content-type": "application/json", apikey: CFG.supabaseKey }, body: JSON.stringify(d) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.errore) throw new Error(j.errore || "Invio non riuscito. Riprova tra poco.");
        $("#pt-form").innerHTML = `<div class="sx-fatto"><span class="sx-ico grande">${ICONA.ok}</span><h2>Candidatura inviata.</h2><p>Grazie, ${esc(d.nome)}. Ti abbiamo mandato una conferma a <b>${esc(d.email)}</b> e ti contatteremo presto ai recapiti che ci hai lasciato.</p><a class="sx-sottolineato" href="/">Torna alla pagina principale</a></div>`;
      } catch (x) { avv(x.message); b.disabled = false; b.textContent = "Invia la candidatura"; }
    };
  }

  /* ------------------------------ avvio ------------------------------ */
  colori(PREDEF.colori);
  const parti = location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
  // inviti e recuperi password del portale partner arrivati sulla vecchia pagina principale: si proseguono su /portale
  if (!parti.length && /access_token=|type=(invite|recovery|magiclink|signup)|error_code=/.test(location.hash) && !sessionStorage.getItem("pg.nuovapw")) {
    location.replace("/portale" + location.search + location.hash);
    return;
  }
  const seg = (parti[0] === "prezzo-giusto" ? parti[1] : new URLSearchParams(location.search).get("p")) || "";
  if (parti[0] === "partner") paginaPartner();
  else if (!parti.length && !seg) paginaLink(CODICE_SITO);
  else if (seg === "conferma") paginaConferma();
  else if (seg === "segnala") paginaSegnala();
  else if (seg === "recesso") paginaRecesso();
  else if (seg === "stop") paginaStop();
  else if (seg === "versioni") paginaVersioni();
  else if (seg === "area") paginaArea();
  else if (LEG[seg] && seg !== "versioni" && seg !== "aggiornato") paginaLegale(seg);
  else if (/^[A-Z0-9]{6,16}$/i.test(seg)) paginaLink(seg.toUpperCase());
  else errorePagina("Il prezzo giusto per te", "Per richiedere la stima apri il link che ti ha mandato il tuo referente Alca.");
})();
