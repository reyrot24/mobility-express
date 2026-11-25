/* Interfaccia dell'applicazione */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const E = Engine, num = Engine.num;
  const CUR_KEY_BASE = "cbp.current.v1";
  /* segmento del preventivo: "business" (aziende e P.IVA) o "privati" (residenziale, dimostrativo) */
  let SEG = "business";
  const curKey = () => SEG === "privati" ? "cbp.current.privati.v1" : CUR_KEY_BASE;
  /* catalogo da usare per segmento e fornitura */
  function catalogo(c, seg) {
    const D = Store.data, priv = (seg || SEG) === "privati";
    if (c === "luce") return priv ? { nostre: D.offerteLucePrivati ||= [], mercato: D.mercatoLucePrivati || [], cfg: D.luceDom, agg: D.mercatoPrivatiAggiornato }
      : { nostre: D.offerteLuce, mercato: D.mercatoLuce || [], cfg: D.luce, agg: D.mercatoAggiornato };
    return priv ? { nostre: D.offerteGasPrivati ||= [], mercato: D.mercatoGasPrivati || [], cfg: D.gasDom, agg: D.mercatoPrivatiAggiornato }
      : { nostre: D.offerteGas, mercato: D.mercatoGas || [], cfg: D.gas, agg: D.mercatoAggiornato };
  }

  const fmtEur = new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" });
  const eur = v => v == null || !isFinite(v) ? "—" : fmtEur.format(v);
  const n2 = (v, d = 2) => v == null || !isFinite(v) ? "—" : v.toLocaleString("it-IT", { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = v => v == null || !isFinite(v) ? "—" : (v * 100).toLocaleString("it-IT", { maximumFractionDigits: 1 }) + "%";
  const dIt = iso => iso ? iso.split("-").reverse().join("/") : "—";
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const FILTRI_DEFAULT = { tipologia: "Tutte", fascia: "Tutte", pagamento: "Tutti", operazione: "Tutte", canale: "Tutti", contratto: "Tutti",
    indiceModo: "ultimo", indiceManuale: "", soloValide: true, soloRisparmio: false, escludiFornitore: false, usaSconti: false, metodoFacile: true, soloNostri: false };
  // pratiche salvate prima dell'allineamento a Facile: passano all'ultimo indice disponibile e al calcolo come Facile
  const filtriPratica = f => { f = f || {}; if (f.metodoFacile === undefined) { if (!f.indiceModo || f.indiceModo === "periodo") f.indiceModo = "ultimo"; f.metodoFacile = true; } return Object.assign({}, FILTRI_DEFAULT, f); };

  function nuovaPratica() {
    const priv = SEG === "privati";
    return {
      id: null, creata: null, segmento: SEG,
      cliente: { ragione_sociale: "", partita_iva: "", tipo_cliente: priv ? "domestico" : "societa", residente: "si", fornitore_attuale: "", nome_offerta_attuale: "", indirizzo: "", regione: "" },
      luce: { attiva: true, pod: "", distributore: "", kw: "", da: "", a: "", totale: "", materia: "", kwh: "", kwhAnnuo: "", f1: "", f2: "", f3: "", fasceAttuali: "", usaAnnuo: true },
      conferme: {},
      gas: { attiva: false, pdr: "", uso: "riscaldamento", usaAnnuo: true, classe: (priv ? Store.data?.gasDom?.classeDefault : Store.data?.gas?.classeDefault) || "G10 - G40", da: "", a: "", totale: "", materia: "", smc: "", smcAnnuo: "" },
      origine: nuovaOrigine(),
      filtri: Object.assign({}, FILTRI_DEFAULT),
      sel: { luce: [], gas: [] },
      note: "", avvisi: [], aiCampi: []
    };
  }

  /* provenienza della bolletta: chi l'ha portata e a chi va mandata la risposta */
  const CANALI = ["Diretto", "Agente", "Segnalatore", "Modulo web", "Modulo pubblico", "Flusso automatico", "Altro"];
  function nuovaOrigine(o) { return Object.assign({ canale: "Diretto", agente: "", segnalatore: "", emailRisposta: "", richiestaId: "" }, o || {}); }

  let P;            // pratica corrente
  let files = [];   // file bolletta caricati
  let commForm = "luce", commRes = "luce", commOff = "luce", catOff = "nostre";
  let aperti = new Set(), espansi = new Set();
  let ultimo = { luce: null, gas: null };

  /* ------------------------------------------------ util ------------------------------------------------ */
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600); }
  const getPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
  function setPath(o, p, v) { const ks = p.split("."); let x = o; ks.slice(0, -1).forEach(k => x = x[k] ??= {}); x[ks.at(-1)] = v; }
  function saveCurrent() { try { localStorage.setItem(curKey(), JSON.stringify(P)); } catch (e) { } }
  /* carica la pratica corrente del segmento attivo */
  function caricaCorrente() {
    try { const cur = JSON.parse(localStorage.getItem(curKey()) || "null"); P = cur && cur.cliente ? cur : nuovaPratica(); } catch (e) { P = nuovaPratica(); }
    P.segmento = SEG;
    P.filtri = filtriPratica(P.filtri);
    P.sel = P.sel || { luce: [], gas: [] }; P.aiCampi = P.aiCampi || []; P.avvisi = P.avvisi || []; P.origine = nuovaOrigine(P.origine);
  }
  /* passa da preventivo aziende a privati (e viceversa); conserva la pratica di ciascuno */
  function impostaSegmento(seg, carica) {
    if (seg === SEG && !carica) { document.body.classList.toggle("seg-privati", SEG === "privati"); return; }
    if (P && seg !== SEG) saveCurrent();
    SEG = seg; document.body.classList.toggle("seg-privati", SEG === "privati");
    if (carica !== false) {
      caricaCorrente(); files = []; aperti.clear(); renderFiles(); $("#ai-status").textContent = "";
      mostraComm(P.luce.attiva || !P.gas.attiva ? "luce" : "gas"); fillForm(); ricalcola();
    }
  }
  /* mostra la scheda preventivo del segmento attivo senza ricaricare la pratica */
  function vaiPreventivo() {
    $$("#tabs .tab").forEach(x => x.classList.toggle("active", x.dataset.view === "preventivo" && x.dataset.seg === SEG));
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-preventivo"));
    document.body.classList.toggle("seg-privati", SEG === "privati");
  }

  function dialog(title, bodyHTML, buttons) {
    const d = $("#dlg");
    $("#dlg-title").textContent = title;
    $("#dlg-body").innerHTML = bodyHTML;
    const foot = $("#dlg-foot"); foot.innerHTML = "";
    (buttons || [{ label: "Chiudi" }]).forEach(b => {
      const el = document.createElement("button");
      el.className = "btn" + (b.primary ? " primary" : "");
      el.textContent = b.label;
      el.onclick = async () => { if (b.onClick && (await b.onClick()) === false) return; d.close(); };
      foot.appendChild(el);
    });
    d.showModal();
  }
  $("#dlg [data-close]").onclick = () => $("#dlg").close();

  /* ------------------------------------------------ navigation ------------------------------------------------ */
  $$("#tabs .tab").forEach(b => b.onclick = () => {
    $$("#tabs .tab").forEach(x => x.classList.toggle("active", x === b));
    $$(".view").forEach(v => v.classList.toggle("active", v.id === "view-" + b.dataset.view));
    if (b.dataset.view === "preventivo") impostaSegmento(b.dataset.seg || "business");
    else document.body.classList.remove("seg-privati");
    if (b.dataset.view === "offerte") renderOfferte();
    if (b.dataset.view === "indici") renderIndici();
    if (b.dataset.view === "pratiche") renderPratiche();
    if (b.dataset.view === "invia") renderInvia();
    if (b.dataset.view === "impostazioni") renderSettings();
  });
  function updLabel() { $("#upd-label").textContent = Store.data.aggiornato ? `Catalogo aggiornato al ${dIt(Store.data.aggiornato)} · ${Store.data.offerteLuce.length} luce · ${Store.data.offerteGas.length} gas` : ""; }

  function segmented(sel, cb) {
    $$(sel + " button").forEach(b => b.onclick = () => { $$(sel + " button").forEach(x => x.classList.toggle("active", x === b)); cb(b.dataset.c); });
  }
  const setSeg = (sel, c) => $$(sel + " button").forEach(x => x.classList.toggle("active", x.dataset.c === c));

  /* ------------------------------------------------ form binding ------------------------------------------------ */
  function fillForm() {
    $$("[data-k]").forEach(el => {
      const v = getPath(P, el.dataset.k);
      if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? "";
      el.classList.toggle("ai-filled", P.aiCampi.includes(el.dataset.k));
    });
    $$("[data-flt]").forEach(el => {
      const v = P.filtri[el.dataset.flt];
      if (el.type === "checkbox") el.checked = !!v; else el.value = v ?? "";
    });
    $("#lbl-manuale").style.display = P.filtri.indiceModo === "manuale" ? "" : "none";
    $("#note-prev").value = P.note || "";
    const o = P.origine || {}, ri = $("#origine-richiesta");
    ri.hidden = !o.richiestaId;
    const mo = $("#more-origine"); if (mo && (o.agente || o.segnalatore || o.emailRisposta || o.richiestaId)) mo.open = true;
    ri.textContent = o.richiestaId ? `Da bolletta in arrivo${o.ricevuta ? " del " + new Date(o.ricevuta).toLocaleDateString("it-IT") : ""}${o.noteRichiesta ? " · " + o.noteRichiesta : ""}` : "";
    renderAvvisi();
  }
  $$("[data-k]").forEach(el => el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
    setPath(P, el.dataset.k, el.type === "checkbox" ? el.checked : el.value);
    el.classList.remove("ai-filled"); P.aiCampi = P.aiCampi.filter(k => k !== el.dataset.k);
    if (el.dataset.k.startsWith("luce.") && el.dataset.k !== "luce.attiva" && !P.luce.attiva) { P.luce.attiva = true; $('[data-k="luce.attiva"]').checked = true; }
    if (el.dataset.k.startsWith("gas.") && el.dataset.k !== "gas.attiva" && el.dataset.k !== "gas.classe" && !P.gas.attiva) { P.gas.attiva = true; $('[data-k="gas.attiva"]').checked = true; }
    // mentre si scrive il ricalcolo parte dopo una breve pausa: la pagina resta fluida
    clearTimeout(ricalcolaPresto._t); ricalcolaPresto._t = setTimeout(() => { saveCurrent(); ricalcola(); }, el.tagName === "INPUT" && el.type !== "checkbox" && el.type !== "date" ? 160 : 0);
    autoSalva();
  }));
  function ricalcolaPresto() { }
  $$("[data-flt]").forEach(el => el.addEventListener(el.type === "checkbox" || el.tagName === "SELECT" ? "change" : "input", () => {
    P.filtri[el.dataset.flt] = el.type === "checkbox" ? el.checked : el.value;
    $("#lbl-manuale").style.display = P.filtri.indiceModo === "manuale" ? "" : "none";
    saveCurrent(); ricalcola(); autoSalva();
  }));
  $("#btn-reset-filtri").onclick = () => { P.filtri = Object.assign({}, FILTRI_DEFAULT); fillForm(); saveCurrent(); ricalcola(); };
  $("#note-prev").addEventListener("input", e => { P.note = e.target.value; saveCurrent(); autoSalva(); });

  segmented("#seg-comm", c => { commForm = c; $("#form-luce").style.display = c === "luce" ? "" : "none"; $("#form-gas").style.display = c === "gas" ? "" : "none"; renderDerived(); });
  segmented("#seg-res", c => { commRes = c; renderRisultati(); });
  function mostraComm(c) {
    commForm = commRes = c; setSeg("#seg-comm", c); setSeg("#seg-res", c);
    $("#form-luce").style.display = c === "luce" ? "" : "none"; $("#form-gas").style.display = c === "gas" ? "" : "none";
  }

  /* ------------------------------------------------ calcolo ------------------------------------------------ */
  function contesto(c) {
    const D = Store.data, oggi = E.todayISO();
    const X = P[c], errs = [], info = [], K = catalogo(c), priv = SEG === "privati";
    if (!K.cfg || !D.forecast) return { ctx: {}, errs: ["Catalogo offerte non ancora disponibile"], info, filtri: P.filtri, oggi, offerte: [] };
    const mesi = E.mesiPeriodo(X.da, X.a);
    if (!X.da || !X.a) errs.push("Inserisci il periodo di fatturazione");
    else if (!mesi) errs.push("La data di fine periodo è precedente a quella di inizio");
    const totale = num(X.totale), materia = num(X.materia), materiaFissa = num(X.fisso);
    if (totale == null) errs.push("Inserisci il totale della fattura");
    if (materia == null) info.push("Senza la spesa materia il risparmio è stimato sul totale ricostruito (meno preciso).");
    const f = Object.assign({}, P.filtri, { cliente: P.cliente.tipo_cliente, fornitoreAttuale: P.cliente.fornitore_attuale });
    const manuale = f.indiceModo === "manuale" ? num(f.indiceManuale) : null;

    if (c === "luce") {
      const kwhP = num(X.kwh), kwhA = num(X.kwhAnnuo);
      if (kwhP == null && !(X.usaAnnuo !== false && kwhA)) errs.push("Inserisci i consumi del periodo (kWh)");
      const st = E.stimaAnnua({ commodity: "luce", periodo: kwhP, annuoBolletta: kwhA, usaAnnuo: X.usaAnnuo, da: X.da, a: X.a, mesi });
      const kwhAnnui = st.valore;
      if (st.incertezza) info.push(`Consumo annuo luce stimato (${st.nota}): il risparmio annuo ha un margine di incertezza. Il consumo annuo della bolletta o 12 mesi di storico rendono la stima più affidabile.`);
      const kw = num(X.kw) || (priv ? 3 : 6);
      const f1 = num(X.f1), f2 = num(X.f2), f3 = num(X.f3);
      let quote, quoteFonte;
      const tot = (f1 || 0) + (f2 || 0) + (f3 || 0);
      if (f1 != null && tot > 0) {
        quote = f3 == null ? { f1: f1 / tot, f2: (f2 || 0) / tot / 2, f3: (f2 || 0) / tot / 2 } : { f1: f1 / tot, f2: (f2 || 0) / tot, f3: f3 / tot };
        quoteFonte = "bolletta";
      } else {
        const s1 = K.cfg.bioF1Default; quote = { f1: s1, f2: (1 - s1) / 2, f3: (1 - s1) / 2 }; quoteFonte = "standard";
      }
      const fc = D.forecast;
      const i0 = E.mediaIndice(D.pun, "f0", X.da, X.a, f.indiceModo, manuale, fc.punF0);
      const i1 = E.mediaIndice(D.pun, "f1", X.da, X.a, f.indiceModo, manuale, fc.punF1);
      const i23 = E.mediaIndice(D.pun, "f23", X.da, X.a, f.indiceModo, manuale, fc.punF23);
      const ctx = { kwhAnnui, kw, quote, quoteFonte, idx: { f0: i0.value, f1: i1.value, f23: i23.value }, idxInfo: i0, cfg: K.cfg, mesi, materia, materiaFissa, totale, usaSconti: !!f.usaSconti, metodoFacile: !!f.metodoFacile,
        residente: P.cliente.residente !== "no", consumoAnnuo: kwhAnnui, consumoPeriodo: kwhP, incertezza: st.incertezza || 0, stima: st };
      return { ctx, errs, info, filtri: f, oggi, offerte: K.nostre, offerteMercato: K.mercato, mercatoAgg: K.agg };
    } else {
      const smcP = num(X.smc), smcA = num(X.smcAnnuo);
      if (smcP == null && !(X.usaAnnuo !== false && smcA)) errs.push("Inserisci i consumi del periodo (Smc)");
      const st = E.stimaAnnua({ commodity: "gas", periodo: smcP, annuoBolletta: smcA, usaAnnuo: X.usaAnnuo, da: X.da, a: X.a, mesi, profilo: X.uso || "riscaldamento" });
      const smcAnnui = st.valore;
      if (st.incertezza) info.push(`Consumo annuo gas stimato (${st.nota}). Non è un dato certo: un periodo invernale non rappresenta l'anno. Per una stima affidabile inserisci il consumo annuo della bolletta.`);
      const ip = E.mediaIndice(D.psv, "psv", X.da, X.a, f.indiceModo, manuale, D.forecast.psv);
      const ctx = { smcAnnui, classe: X.classe || K.cfg.classeDefault, idx: { psv: ip.value }, idxInfo: ip, cfg: K.cfg, mesi, materia, materiaFissa, totale, usaSconti: !!f.usaSconti, metodoFacile: !!f.metodoFacile,
        consumoAnnuo: smcAnnui, consumoPeriodo: smcP, incertezza: st.incertezza || 0, stima: st };
      return { ctx, errs, info, filtri: f, oggi, offerte: K.nostre, offerteMercato: K.mercato, mercatoAgg: K.agg };
    }
  }

  function calcola(c) {
    const k = contesto(c);
    if (!P[c].attiva) return Object.assign(k, { results: [], mercato: [], inattiva: true });
    if (k.errs.length) return Object.assign(k, { results: [], mercato: [] });
    k.profilo = profiloCliente(c, k.ctx);
    const elabora = offerte => {
      let res = E.filtra(offerte, k.filtri, k.oggi, c).map(o => c === "luce" ? E.calcolaLuce(o, k.ctx) : E.calcolaGas(o, k.ctx));
      res.forEach(r => {
        r.stato = E.stato(r.offerta, k.oggi); r.restr = Restr.valuta(r.offerta, k.profilo, c);
        // offerta solo dual: serve anche l'altra fornitura nella stessa pratica
        if (E.contratto(r.offerta) === "dual" && !(P.luce.attiva && P.gas.attiva)) { r.restr.ko = true; r.restr.motivi.push(`Offerta solo dual: serve anche la fornitura ${c === "luce" ? "gas" : "luce"} nella stessa pratica`); }
        // risparmio senza sconti condizionati, quando la scelta degli sconti cambia il risultato
        if (k.ctx.usaSconti && r.offerta.ccvScontata != null && r.offerta.ccvScontata !== r.offerta.ccv) {
          const s = (c === "luce" ? E.calcolaLuce : E.calcolaGas)(r.offerta, Object.assign({}, k.ctx, { usaSconti: false }));
          r.risparmioAnnuoSenzaSconti = s.risparmioAnnuo;
        }
        r.commerciale = commerciabile(r, k.oggi);
      });
      if (k.filtri.soloRisparmio) res = res.filter(r => r.risparmioPeriodo > 0);
      // le offerte non acquistabili da questo cliente vanno in fondo (in rosso)
      return res.sort((a, b) => (a.restr.ko - b.restr.ko) || ((b.risparmioPeriodo ?? -1e12) - (a.risparmioPeriodo ?? -1e12)));
    };
    k.totaleCatalogo = k.offerte.length;
    k.results = elabora(k.offerte);
    // privati: nel "mercato" restano solo i fornitori con cui non abbiamo accordi
    let mkt = k.offerteMercato;
    if (SEG === "privati" && k.offerte.length) {
      const nostri = new Set(k.offerte.map(o => normForn(o.azienda)));
      mkt = mkt.filter(o => !nostri.has(normForn(o.azienda)));
    }
    k.totaleMercato = mkt.length;
    k.mercato = elabora(mkt);
    return k;
  }

  /* dati del cliente usati per controllare le restrizioni di vendita delle offerte */
  function profiloCliente(c, ctx) {
    const a = Restr.daIndirizzo(P.cliente.indirizzo), pod = String(P.luce.pod || "").toUpperCase();
    return { regione: P.cliente.regione || a.regione || "", comune: a.comune || "", cap: a.cap || "",
      kwhAnnui: ctx.kwhAnnui ?? null, smcAnnui: ctx.smcAnnui ?? null, kw: c === "luce" ? ctx.kw : null,
      fornitoreAttuale: P.cliente.fornitore_attuale || "",
      distributore: P.luce.distributore || (/^IT001E/.test(pod) ? "e-distribuzione" : ""),
      residente: SEG === "privati" ? P.cliente.residente !== "no" : null, domestico: SEG === "privati",
      tipo: P.cliente.tipo_cliente, pagamento: P.filtri.pagamento };
  }
  const acquistabile = r => !(r.restr && r.restr.ko);
  /* proponibile tramite Alca: offerta nostra, attiva, con accordo valido e attivabile; "da verificare" se restano condizioni decisive */
  function commerciabile(r, oggi) {
    const o = r.offerta, motivi = [];
    if (o.mercato) return { ok: false, motivi: ["Offerta esterna: solo per confronto"], daVerificare: false };
    if (o.chiusa || ["scaduta", "chiusa", "futura"].includes(r.stato?.code)) motivi.push(r.stato?.label || "Offerta non attiva");
    if (o.accordoAl && o.accordoAl < oggi) motivi.push("Accordo commerciale scaduto il " + dIt(o.accordoAl));
    if (o.attivabileAlca === false || o.attivabileAlca === "no") motivi.push("Non attivabile tramite Alca");
    if (!acquistabile(r)) motivi.push(...r.restr.motivi);
    const condizioni = [...(r.restr?.verifiche || [])];
    if (o.statoVerifica === "da_verificare") condizioni.unshift("Dati dell'offerta da verificare con il listino");
    const confermata = P.conferme && P.conferme[o.id];
    return { ok: !motivi.length, motivi, daVerificare: !!condizioni.length && !confermata, condizioni, confermata: !!confermata };
  }
  const proponibile = r => r.commerciale && r.commerciale.ok;
  function aggiornaRegione() {
    const sel = $("#sel-regione"); if (!sel) return;
    if (sel.options.length < 2) Restr.REGIONI.forEach(r => sel.add(new Option(r, r)));
    sel.value = P.cliente.regione || "";
    const a = Restr.daIndirizzo(P.cliente.indirizzo);
    $("#regione-auto").textContent = P.cliente.regione ? "" : a.regione ? `→ ${a.regione}${a.comune ? " · " + a.comune : ""}${a.cap ? " " + a.cap : ""}` : P.cliente.indirizzo ? "Regione non riconosciuta: indica il CAP o sceglila" : "";
  }

  const normForn = s => String(s || "").toLowerCase().replace(/s\.?p\.?a\.?|mercato|energia|energy|\bspa\b/g, "").replace(/[^a-z0-9]/g, "");
  /* privati: dimostrativo finché non ci sono accordi; con gli accordi il preventivo è vero (PDF ed email) */
  function aggiornaDemo() {
    const nAcc = catalogo("luce", "privati").nostre.length + catalogo("gas", "privati").nostre.length, demo = SEG === "privati" && !nAcc;
    document.body.classList.toggle("privati-demo", demo);
    const td = $("#tab-demo"); if (td) td.hidden = !!nAcc;
    const b = $("#demo-banner"); if (!b) return;
    b.className = "alert solo-privati " + (demo ? "warn" : "info");
    b.innerHTML = demo
      ? "<b>🏠 Preventivo Privati – DIMOSTRATIVO.</b> Non abbiamo ancora accordi per i clienti domestici: il confronto è con le offerte del mercato residenziale (aggiornate ogni 3 giorni) e serve a orientare il cliente e a capire su quali fornitori puntare. Non si generano PDF né email."
      : `<b>🏠 Preventivo Privati.</b> ${nAcc} offerte dai nostri accordi${Store.data.accordiPrivatiAggiornato ? ` (listino del ${dIt(Store.data.accordiPrivatiAggiornato)})` : ""}, confrontate con il resto del mercato residenziale. Nel PDF vanno solo le nostre offerte.`;
  }
  /* riassunto accanto alle sezioni a scomparsa, così si vede cosa c'è dentro senza aprirle */
  function aggiornaRiassunti() {
    const o = P.origine || {}, set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set("#sum-luce", [P.luce.pod, P.luce.distributore, P.luce.kwhAnnuo && P.luce.kwhAnnuo + " kWh/anno"].filter(Boolean).join(" · "));
    set("#sum-gas", [P.gas.pdr, P.gas.smcAnnuo && P.gas.smcAnnuo + " Smc/anno"].filter(Boolean).join(" · "));
    set("#sum-origine", [o.canale !== "Diretto" && o.canale, o.agente, o.segnalatore].filter(Boolean).join(" · "));
  }
  function ricalcola() {
    aggiornaDemo(); aggiornaRegione(); aggiornaRiassunti();
    ultimo.luce = calcola("luce"); ultimo.gas = calcola("gas");
    $("#cnt-luce").textContent = P.luce.attiva ? `(${ultimo.luce.results.length})` : "";
    $("#cnt-gas").textContent = P.gas.attiva ? `(${ultimo.gas.results.length})` : "";
    renderDerived(); renderRisultati(); renderSelezionate();
  }

  /* ------------------------------------------------ render preventivo ------------------------------------------------ */
  function renderDerived() {
    const k = ultimo[commForm]; const el = $("#derived");
    if (!k || !k.ctx.cfg) { el.innerHTML = ""; return; }
    const x = k.ctx, chips = [];
    if (x.mesi) chips.push(`Mensilità: <b>${x.mesi}</b>`);
    if (commForm === "luce") {
      if (x.kwhAnnui) chips.push(`Consumo annuo stimato: <b>${n2(x.kwhAnnui, 0)} kWh</b>`);
      chips.push(`Potenza: <b>${n2(x.kw, 1)} kW</b> · ${x.cfg.domestico ? (x.residente ? "domestico residente" : "domestico non residente") : E.bandaPotenza(x.cfg, x.kw).name}`);
      chips.push(`PUN F0 <b>${n2(x.idx.f0, 4)}</b> · F1 <b>${n2(x.idx.f1, 4)}</b> · F23 <b>${n2(x.idx.f23, 4)}</b> €/kWh`);
      chips.push(`Quota F1: <b>${pct(x.quote.f1)}</b> (${x.quoteFonte})`);
    } else {
      if (x.smcAnnui) chips.push(`Consumo annuo stimato: <b>${n2(x.smcAnnui, 0)} Smc</b>`);
      chips.push(`PSV <b>${n2(x.idx.psv, 4)}</b> €/Smc`);
      chips.push(`Contatore: <b>${esc(x.classe)}</b>`);
    }
    const ii = x.idxInfo;
    chips.push(ii.source === "storico" ? `Indice: media ${ii.months.join(", ")}` : ii.source === "forecast" ? `Indice: <b>forecast</b> (nessuno storico per il periodo)` : `Indice: valore manuale`);
    el.innerHTML = chips.map(c => `<span class="chip">${c}</span>`).join("");
  }

  function prezzoLabel(r, c) {
    const o = r.offerta, p = r.prezzi;
    const u = c === "luce" ? "€/kWh" : "€/Smc";
    const vals = Object.entries(p).map(([k, v]) => `${c === "luce" && Object.keys(p).length > 1 ? k + " " : ""}${n2(v, 4)}`).join(" · ");
    if (o.tipologia === "Variabile") return `<div class="p1">${c === "luce" ? "PUN" : "PSV"} + ${n2(o.spread || 0, 4)}</div><div class="p2">≈ ${vals} ${u}</div>`;
    return `<div class="p1">${vals}</div><div class="p2">${u} · prezzo fisso</div>`;
  }

  /* etichette brevi sotto il nome dell'offerta; le condizioni complete sono nel dettaglio */
  function pillsOfferta(o, st, c, r) {
    const p = [];
    p.push(`<span class="pill">${o.tipologia === "Fissa" ? "Prezzo fisso" : "Variabile"}</span>`);
    if (c === "luce" && o.fascia) p.push(`<span class="pill">${o.fascia}</span>`);
    const ct = E.contratto(o); if (ct !== "entrambi") p.push(`<span class="pill">${ct === "dual" ? "Solo dual" : "Single"}</span>`);
    if (st.code === "scadenza") p.push(`<span class="pill warn">${st.label}</span>`);
    else if (st.code !== "attiva") p.push(`<span class="pill bad">${st.label}</span>`);
    const fr = r && r.restr ? r.restr.frasi : [];
    const nV = fr.filter(f => f.esito === "verifica").length, nOk = fr.filter(f => f.esito === "ok").length;
    if (r && !r.restr?.ko && nV) p.push(`<span class="pill warn" title="${esc(fr.filter(f => f.esito === "verifica").map(f => f.motivo || f.testo).join(" · "))}">${nV} ${nV === 1 ? "condizione" : "condizioni"} da verificare</span>`);
    else if (r && !r.restr?.ko && nOk) p.push(`<span class="pill ok">Condizioni rispettate</span>`);
    else if (!fr.length && o.restrizioni) p.push(`<span class="pill r">${esc(o.restrizioni)}</span>`);
    return p.join("");
  }

  /* tutte le condizioni di vendita, colorate: rosso = blocca, giallo = da verificare, verde = rispettata */
  function condizioniHTML(r) {
    const fr = r.restr ? r.restr.frasi : [];
    if (!fr.length) return "";
    return `<div><h4>Condizioni di vendita</h4><div class="o-conds">${fr.map(f => f.esito === "ko" ? `<span class="pill r bad" title="${esc(f.motivo)}">✕ ${esc(f.testo)}</span>`
      : f.esito === "verifica" ? `<span class="pill r warn" title="Da verificare: ${esc(f.motivo)}">! ${esc(f.testo)}</span>`
      : `<span class="pill r ok">✓ ${esc(f.testo)}</span>`).join("")}</div></div>`;
  }

  function renderRisultati() {
    const c = commRes, k = ultimo[c], kp = $("#kpis"), box = $("#results");
    if (!k) return;
    if (k.inattiva) { kp.innerHTML = ""; box.innerHTML = `<div class="empty">Fornitura ${c} non inclusa. Attiva "includi" nei dati ${c} o carica una bolletta.</div>`; return; }
    if (k.errs.length) { kp.innerHTML = ""; box.innerHTML = `<div class="empty">Per calcolare servono ancora:<br><b>${k.errs.map(esc).join("<br>")}</b></div>`; return; }
    const priv = SEG === "privati", M0 = k.mercato || [];
    // privati: senza accordi nostri, il riferimento è il migliore di tutto il mercato
    const soloNostri = !!P.filtri.soloNostri, tNostri = $("#flt-nostri-t");
    if (tNostri) tNostri.textContent = priv ? "Solo i nostri accordi privati" : "Solo le nostre offerte";
    const R = k.results, tutte = priv && !k.totaleCatalogo && !soloNostri ? [...R, ...M0].sort((a, b) => (a.restr.ko - b.restr.ko) || ((b.risparmioPeriodo ?? -1e12) - (a.risparmioPeriodo ?? -1e12))) : R;
    const vend = tutte.filter(acquistabile), nKo = tutte.length - vend.length;
    const best = vend[0], conR = vend.filter(r => r.risparmioPeriodo > 0).length;
    const x = k.ctx;
    kp.innerHTML = `
      <div class="kpi"><div class="l">Bolletta attuale</div><div class="v">${eur(x.totale)}</div><div class="s">${x.mesi} ${x.mesi === 1 ? "mese" : "mesi"} · materia ${eur(x.materia)}</div></div>
      <div class="kpi ${best && best.risparmioPeriodo > 0 ? "good" : "bad"}"><div class="l">Miglior risparmio sul periodo</div><div class="v">${best ? eur(best.risparmioPeriodo) : "—"}</div><div class="s">${best ? `<a href="#" class="o-link" data-scheda-off="${esc(best.offerta.id)}">${esc(best.offerta.azienda + " · " + best.offerta.nome)}</a>` : "nessuna offerta"}</div></div>
      <div class="kpi ${best && best.risparmioAnnuo > 0 ? "good" : "bad"}"><div class="l">Risparmio annuo stimato</div><div class="v">${best ? eur(best.risparmioAnnuo) : "—"}</div><div class="s">${best ? pct(best.risparmioPct) + " della bolletta" : ""}</div></div>
      <div class="kpi"><div class="l">Offerte con risparmio</div><div class="v">${conR} / ${vend.length}</div><div class="s">${(priv && !k.totaleCatalogo ? k.totaleMercato : k.totaleCatalogo) - tutte.length} escluse dai filtri${nKo ? ` · ${nKo} non acquistabili` : ""}</div></div>`;
    let warn = k.info.length ? `<div class="alert info">${k.info.map(esc).join("<br>")}</div>` : "";
    // restrizioni di vendita: offerte bloccate per questo cliente e dati mancanti per controllarle
    const pf = k.profilo || {}, tuttiR = [...R, ...M0];
    const koTot = tuttiR.filter(r => !acquistabile(r)).length;
    const dove = [pf.regione, pf.comune && pf.comune.charAt(0) + pf.comune.slice(1).toLowerCase(), pf.cap].filter(Boolean).join(" · ");
    if (koTot) warn += `<div class="alert bad"><b>${koTot} ${koTot === 1 ? "offerta non acquistabile" : "offerte non acquistabili"}</b> per questo cliente${dove ? ` (${esc(dove)})` : ""}: sono in rosso in fondo agli elenchi (nel resto del mercato aprendo l'elenco completo), con il motivo evidenziato, e non si possono mettere nel preventivo.</div>`;
    const servonoDati = tuttiR.some(r => r.restr && r.restr.frasi.some(f => f.esito === "verifica" && /indirizzo|regione|CAP/.test(f.motivo)));
    if (servonoDati) warn += `<div class="alert warn">Inserisci l'<b>indirizzo di fornitura</b> con il CAP (o scegli la regione): alcune offerte hanno limiti territoriali che non posso ancora controllare.</div>`;
    const sel = new Set(P.sel[c]);
    const riga = (r, i, mkt) => {
      const o = r.offerta, s = r.risparmioPeriodo, ko = !acquistabile(r), aperta = aperti.has(o.id), scelta = !ko && !mkt && sel.has(o.id);
      const cls = ["offer", mkt ? "mkt" : "", ko ? "ko" : "", scelta ? "sel" : "", aperta ? "open" : "", i === 0 && s > 0 && !ko ? "top" : "", s > 0 || ko ? "" : "dim"].filter(Boolean).join(" ");
      const cm = r.commerciale || {}, nonProp = !mkt && !ko && !cm.ok, daVer = !mkt && !ko && cm.ok && cm.daVerificare;
      const badge = ko ? '<span class="pill bad">Non acquistabile</span>'
        : nonProp ? `<span class="pill bad">Non proponibile: ${esc(cm.motivi.join(" · "))}</span>`
        : (daVer ? `<span class="pill warn" title="${esc(cm.condizioni.join(" · "))}">Da verificare</span> ` : cm.confermata ? '<span class="pill ok">Condizioni verificate</span> ' : "")
          + (i === 0 && s > 0 ? `<span class="pill ${mkt ? "mkt" : "best"}">${mkt ? "Migliore del mercato" : priv ? "Consigliata" : "Nostra migliore"}</span>` : "")
          + (mkt ? '<span class="pill">Solo confronto · non attivabile tramite Alca</span>' : "");
      const lato = mkt ? `<span class="rank">${i + 1}</span>` : (ko || nonProp) ? `<input type="checkbox" disabled aria-label="Non proponibile">`
        : `<input type="checkbox" data-sel="${o.id}" ${daVer ? "data-verifica" : ""} ${scelta && !daVer ? "checked" : ""} aria-label="Includi ${esc(o.azienda)} nel preventivo">`;
      return `<article class="${cls}" data-id="${o.id}">
        <div class="o-row">
          <div class="o-sel">${lato}</div>
          <div class="o-main">
            ${badge ? `<div class="o-badges">${badge}</div>` : ""}
            <div class="o-name"><a href="#" class="o-link" data-scheda-off="${esc(o.id)}" title="Tutte le condizioni dell'offerta"><b>${esc(o.azienda)}</b><span>${esc(o.nome)}</span></a></div>
            ${ko ? `<div class="ko-msg"><span>${r.restr.motivi.map(esc).join(" · ")}</span></div>` : ""}
            <div class="o-tags">${pillsOfferta(o, r.stato, c, r)}<span class="o-more">${aperta ? "Chiudi" : "Dettagli"}</span></div>
            ${scelta && !daVer && Store.mode === "server" ? (P.richiesteFatte?.[o.id]
              ? `<div class="o-richiesta"><span class="pill ok">Contratto richiesto · ${esc(P.richiesteFatte[o.id])}</span></div>`
              : `<div class="o-richiesta"><button class="btn sm primary" type="button" data-richiedi="${o.id}">Richiedi contratto</button></div>`) : ""}
          </div>
          <div class="o-price">${prezzoLabel(r, c)}<div class="p2">CCV ${eur(r.ccv)}/anno${r.ccv !== (o.ccv || 0) ? ` <s>${eur(o.ccv)}</s>` : ""}</div></div>
          <div class="o-save ${s > 0 ? "pos" : "neg"}"><div class="sub">${s > 0 ? "risparmio annuo" : "costa di più"}</div><div class="big">${eur(r.risparmioAnnuo)}</div>
            <div class="sub">${s > 0 ? `${pct(r.risparmioPct)} · ${eur(s)} nel periodo` : `${eur(s)} nel periodo`}</div>
            ${r.risparmioAnnuoSenzaSconti != null ? `<div class="sub">senza sconti: ${eur(r.risparmioAnnuoSenzaSconti)}</div>` : ""}
            ${r.risparmioAnnuoMin != null ? `<div class="sub">stima: ${eur(r.risparmioAnnuoMin)} – ${eur(r.risparmioAnnuoMax)}</div>` : ""}</div>
        </div>
        ${aperta ? `<div class="o-detail">${condizioniHTML(r)}<div><h4>Costi stimati</h4>${breakdownHTML(r, c, k)}</div></div>` : ""}
      </article>`;
    };
    // elenchi lunghi: prime 8 offerte, il resto su richiesta (le non acquistabili sono sempre in fondo)
    const elenco = (L, mkt) => {
      const chiave = c + (mkt ? "-mkt" : "-nostre"), tutteV = espansi.has(chiave), N = 8;
      const ok = L.filter(acquistabile), no = L.filter(r => !acquistabile(r));
      const visOk = tutteV ? ok : ok.slice(0, N), resto = ok.length - visOk.length;
      // mercato: centinaia di offerte, le non acquistabili si vedono solo aprendo l'elenco completo
      const visNo = mkt && !tutteV ? [] : no, nascNo = no.length - visNo.length;
      const btn = ok.length > N || nascNo ? `<div style="margin-top:2px;text-align:center"><button class="btn sm" data-espandi="${chiave}">${tutteV ? "Mostra meno" : `Mostra altre ${resto} offerte${nascNo ? ` (e ${nascNo} non acquistabili)` : ""}`}</button></div>` : "";
      // nostre offerte: le non acquistabili restano sempre visibili, in rosso, in fondo
      return `<div class="offers">${visOk.map((r, i) => riga(r, i, mkt)).join("")}${btn}${visNo.map((r, i) => riga(r, ok.length + i, mkt)).join("")}</div>`;
    };
    // utente senza visibilità del resto del mercato (spunta in Utenti e rete): solo le nostre offerte
    const vedeMkt = Store.profilo?.vede_mercato !== false && !soloNostri;
    const M = vedeMkt ? (k.mercato || []) : []; let bm;
    // confronto nostra migliore vs migliore del mercato
    let cfr = "";
    const bn = R.find(acquistabile); bm = M.find(acquistabile);
    if (vedeMkt && bn && bm && bn.risparmioAnnuo != null && bm.risparmioAnnuo != null) {
      const d = bn.risparmioAnnuo - bm.risparmioAnnuo;
      cfr = d >= 0
        ? `<div class="alert ok">La nostra migliore offerta (<b>${esc(bn.offerta.azienda)}</b>) batte la migliore del mercato (<b>${esc(bm.offerta.azienda)} · ${esc(bm.offerta.nome)}</b>) di <b>${eur(d)}/anno</b>.</div>`
        : `<div class="alert warn">Attenzione: nel resto del mercato <b>${esc(bm.offerta.azienda)} · ${esc(bm.offerta.nome)}</b> fa risparmiare <b>${eur(-d)}/anno</b> in più della nostra migliore offerta.</div>`;
    }
    const nostre = R.length ? elenco(R, false)
      : priv && !k.totaleCatalogo
        ? `<div class="alert info">Non abbiamo ancora accordi per i privati. Quando li firmiamo si caricano da <b>Impostazioni → Carica nuove offerte con AI → Accordi privati</b> e compaiono qui, confrontati con il mercato.</div>`
        : `<div class="empty">Nessuna nostra offerta corrisponde ai filtri.</div>`;
    const mercato = M.length ? elenco(M, true)
      : `<div class="empty">${k.totaleMercato ? "Nessuna offerta di mercato corrisponde ai filtri." : "Nessuna offerta di mercato registrata."}</div>`;
    const agg = k.mercatoAgg;
    const titNostre = priv ? "I nostri accordi privati" : "Le nostre migliori offerte";
    const titMkt = priv ? "Mercato residenziale" : "Resto del mercato";
    const sottMkt = priv ? "offerte per la casa dei principali fornitori" : "fornitori che non abbiamo";
    box.innerHTML = warn + (priv ? orientamento((k.totaleCatalogo ? R : tutte).filter(acquistabile), c, !!k.totaleCatalogo) : "") + cfr +
      `<h3 class="res-title">${titNostre} <span class="muted small">${R.length} di ${k.totaleCatalogo}</span></h3>` + nostre +
      (vedeMkt ? `<h3 class="res-title mkt">${titMkt} <span class="muted small">${M.length} di ${k.totaleMercato} · ${sottMkt}${agg ? ` · prezzi verificati al ${dIt(agg)}` : ""}</span></h3>` + mercato : "") +
      `<p class="muted small" style="margin-top:16px">Clicca un'offerta per condizioni e dettaglio dei costi. Risparmio nel periodo = (spesa materia in bolletta − quota ${c === "luce" ? "energia" : "gas"} dell'offerta con i consumi reali del periodo) × (1 + IVA); risparmio annuo = (spesa materia attuale riportata al consumo annuo − quota annua dell'offerta) × (1 + IVA)${priv ? ", con IVA domestica (10% luce; gas 10% fino a 480 Smc/anno)" : ""}. Le offerte variabili usano l'indice indicato nel dettaglio: è una stima, non un prezzo futuro garantito. Le offerte del mercato servono solo come confronto e non entrano nel preventivo commerciale.</p>`;
    $$("#results [data-verifica]").forEach(cb => cb.onchange = () => {
      const id = cb.dataset.sel, r = [...k.results].find(x => x.offerta.id === id); cb.checked = false;
      if (!r) return;
      dialog("Condizioni da verificare", `<p>Prima di proporre <b>${esc(r.offerta.azienda)} · ${esc(r.offerta.nome)}</b> conferma di aver verificato con il cliente:</p><ul>${r.commerciale.condizioni.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="muted small">La conferma resta nella pratica con data e operatore.</p>`,
        [{ label: "Annulla" }, { label: "Ho verificato: includi", primary: true, onClick: async () => {
          P.conferme = P.conferme || {};
          P.conferme[id] = { at: new Date().toISOString(), da: (await Store.nomeUtente().catch(() => "")) || "operatore", condizioni: r.commerciale.condizioni };
          if (!P.sel[c].includes(id)) P.sel[c].push(id);
          saveCurrent(); ricalcola();
        } }]);
    });
    // nome dell'offerta (elenchi, riquadri «Cosa proporre», migliore offerta): scheda con tutte le condizioni
    $$("[data-scheda-off]").forEach(a => a.onclick = e => {
      e.preventDefault(); e.stopPropagation();
      const r = [...(k.results || []), ...(k.mercato || [])].find(x => x.offerta.id === a.dataset.schedaOff);
      if (r) schedaOfferta(r, c, k);
    });
    $$("#results .o-row").forEach(row => row.onclick = e => {
      if (e.target.closest("input, a, button")) return;
      const id = row.parentElement.dataset.id; aperti.has(id) ? aperti.delete(id) : aperti.add(id); renderRisultati();
    });
    $$("#results [data-richiedi]").forEach(b => b.onclick = e => { e.stopPropagation(); const r = k.results.find(x => x.offerta.id === b.dataset.richiedi); if (r) richiediContratto([[c, r]]); });
    $$("#results [data-espandi]").forEach(b => b.onclick = () => { const k2 = b.dataset.espandi; espansi.has(k2) ? espansi.delete(k2) : espansi.add(k2); renderRisultati(); });
    $$("#results [data-sel]:not([data-verifica])").forEach(cb => cb.onchange = () => {
      const id = cb.dataset.sel, arr = P.sel[c];
      if (cb.checked) { if (!arr.includes(id)) arr.push(id); } else P.sel[c] = arr.filter(x => x !== id);
      saveCurrent(); renderRisultati(); renderSelezionate(); autoSalva();
    });
  }

  /* privati: orientamento rapido per il consumatore e per capire su quali fornitori puntare */
  function orientamento(L, c, nostri) {
    const pos = L.filter(r => r.risparmioAnnuo > 0);
    const top = L[0], fisso = L.find(r => r.offerta.tipologia === "Fissa"), varb = L.find(r => r.offerta.tipologia === "Variabile");
    const forn = []; for (const r of pos) { if (!forn.includes(r.offerta.azienda)) forn.push(r.offerta.azienda); if (forn.length === 3) break; }
    const box = (l, r, extra) => `<div><div class="l">${l}</div>${r ? `<div class="v"><a href="#" class="o-link" data-scheda-off="${esc(r.offerta.id)}">${esc(r.offerta.azienda)}</a></div><div class="s"><a href="#" class="o-link" data-scheda-off="${esc(r.offerta.id)}">${esc(r.offerta.nome)}</a> · <span class="saving ${r.risparmioAnnuo > 0 ? "pos" : "neg"}">${eur(r.risparmioAnnuo)}/anno</span>${extra ? " · " + extra : ""}</div>` : `<div class="s">—</div>`}</div>`;
    const consiglio = !top ? "" : top.risparmioAnnuo <= 0
      ? `La bolletta attuale è già in linea o migliore del mercato: <b>non conviene cambiare</b>, salvo esigenze diverse (prezzo bloccato, servizi).`
      : fisso && varb
        ? `Se il cliente vuole <b>certezza</b> sul prezzo: <b>${esc(fisso.offerta.azienda)}</b> (fisso, ${eur(fisso.risparmioAnnuo)}/anno). Se accetta che il prezzo segua il mercato: <b>${esc(varb.offerta.azienda)}</b> (variabile, ${eur(varb.risparmioAnnuo)}/anno).`
        : `Il migliore è <b>${esc(top.offerta.azienda)}</b> con ${eur(top.risparmioAnnuo)}/anno.`;
    return `<div class="card-sub"><h3 class="res-title" style="margin-top:0">${nostri ? "Cosa proporre al cliente" : "Su chi puntare"} ${nostri ? "" : '<span class="pill demo">demo</span>'}</h3>
      <div class="orient">${box("Miglior risparmio", top)}${box("Miglior prezzo fisso", fisso)}${box("Miglior variabile", varb, varb ? (c === "luce" ? "PUN" : "PSV") + " + " + n2(varb.offerta.spread || 0, 4) : "")}
        <div><div class="l">${nostri ? "Fornitori da proporre" : "Fornitori da contattare"}</div><div class="v">${forn.map(esc).join(", ") || "—"}</div><div class="s">${pos.length} offerte su ${L.length} fanno risparmiare</div></div></div>
      ${consiglio ? `<div class="alert ${top.risparmioAnnuo > 0 ? "ok" : "warn"}">${consiglio}</div>` : ""}</div>`;
  }

  /* scheda completa di un'offerta: dati del listino, condizioni di vendita per questo cliente e costi stimati */
  function schedaOfferta(r, c, k) {
    const o = r.offerta, mkt = !!o.mercato || !(k.results || []).includes(r), st = E.stato(o, E.todayISO());
    const u = c === "luce" ? "€/kWh" : "€/Smc", n = (v, d = 4) => v == null || v === "" ? "—" : n2(v, d), dt = v => v ? dIt(v) : "—";
    const riga = (l, v) => v == null || v === "" || v === "—" ? "" : `<tr><th>${l}</th><td>${v}</td></tr>`;
    const prezzi = o.tipologia === "Variabile"
      ? riga("Prezzo", `${c === "luce" ? "PUN" : "PSV"} + spread ${n(o.spread)} ${u}`) + riga("Prezzo stimato per il periodo", Object.entries(r.prezzi || {}).map(([f, v]) => `${c === "luce" && Object.keys(r.prezzi).length > 1 ? f + " " : ""}${n(v)}`).join(" · ") + " " + u)
      : c === "luce" ? riga("Prezzo F0 / F1", o.p1 != null ? `${n(o.p1)} ${u}` : "") + riga("Prezzo F2 / F23", o.p2 != null ? `${n(o.p2)} ${u}` : "") + riga("Prezzo F3", o.p3 != null ? `${n(o.p3)} ${u}` : "")
        : riga("Prezzo gas", o.p1 != null ? `${n(o.p1)} ${u}` : "");
    const fonte = /^https?:/i.test(o.fonte || "") ? `<a href="${esc(o.fonte)}" target="_blank" rel="noopener">apri la fonte</a>` : esc(o.fonte || "");
    const cm = r.commerciale || {};
    const html = `<div class="o-badges" style="margin-bottom:8px"><span class="pill ${st.code === "attiva" ? "good" : st.code === "scadenza" ? "warn" : "bad"}">${esc(st.label)}</span> ${mkt ? '<span class="pill">Solo confronto · non attivabile tramite Alca</span>' : (SEG === "privati" ? '<span class="pill ok">Nostro accordo privati</span>' : '<span class="pill ok">Attivabile tramite Alca</span>')}</div>
      <div class="table-wrap"><table class="scheda-off"><tbody>
        ${riga("Fornitore", esc(o.azienda))}${riga("Offerta", esc(o.nome))}${riga("Codice", esc(o.codice || ""))}
        ${riga("Tipologia", o.tipologia === "Fissa" ? "Prezzo fisso" : "Variabile (indicizzata)")}${c === "luce" ? riga("Fasce", esc(o.fascia || "")) : ""}
        ${prezzi}${riga("Costi o sconti aggiuntivi", o.extra ? `${n(o.extra)} ${u}` : "")}
        ${riga("Quota fissa (CCV)", o.ccv != null ? `${eur(o.ccv)}/anno${o.ccvScontata != null && o.ccvScontata !== o.ccv ? ` · con sconti ${eur(o.ccvScontata)}/anno` : ""}` : "")}
        ${riga("Valida dal", dt(o.inizio))}${riga("Valida fino al", dt(o.fine || o.validaAl))}${riga("Accordo Alca fino al", o.accordoAl ? dt(o.accordoAl) : "")}
        ${riga("Contratto", { single: "Solo single (luce o gas)", dual: "Solo dual (luce + gas)", entrambi: "Single o dual" }[E.contratto(o)] || "")}
        ${riga("Operazioni ammesse", esc(o.operazioni || ""))}${riga("Pagamento", esc(o.pagamento || ""))}${riga("Canali di vendita", esc(o.canali || ""))}
        ${riga("Condizioni e restrizioni", esc(o.restrizioni || ""))}${riga("Note del listino", esc(o.note || "").replace(/\n/g, "<br>"))}
        ${riga("Fonte", fonte)}${riga("Prezzi verificati il", o.verificata ? dt(o.verificata) : "")}
      </tbody></table></div>
      ${condizioniHTML(r)}
      ${!mkt && cm.motivi?.length ? `<div class="alert bad"><b>Non proponibile:</b> ${cm.motivi.map(esc).join(" · ")}</div>` : ""}
      ${!mkt && cm.condizioni?.length ? `<div class="alert warn"><b>Da verificare con il cliente:</b><ul>${cm.condizioni.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
      <h4 style="margin:14px 0 6px">Costi stimati per questo cliente</h4>${breakdownHTML(r, c, k)}
      <p class="muted small">Risparmio annuo stimato: <b>${eur(r.risparmioAnnuo)}</b>${r.risparmioPct != null ? ` (${pct(r.risparmioPct)} della bolletta)` : ""}. Stima orientativa: prezzi e condizioni vanno confermati sul contratto del fornitore.</p>`;
    dialog(`${o.azienda} · ${o.nome}`, html, [{ label: "Chiudi", primary: true }]);
  }

  function breakdownHTML(r, c, k) {

    const u = c === "luce" ? "kWh" : "Smc", x = k.ctx;
    const cons = c === "luce" ? x.kwhAnnui : x.smcAnnui;
    const items = [
      [`Consumo annuo (${x.stima?.metodo === "bolletta" ? "da bolletta" : "stimato"})`, `${n2(cons, 0)} ${u}${x.incertezza ? ` ±${Math.round(x.incertezza * 100)}%` : ""}`],
      ["Spesa materia attuale annua (stima)", eur(r.materiaAttualeAnnua)],
      ...(r.materiaAnnuaInfo?.metodo === "fisso+variabile" ? [["Di cui quota fissa attuale (12 mesi)" + (r.materiaAnnuaInfo.fonteFisso === "stimata" ? ", stimata" : ""), eur(r.materiaAnnuaInfo.fissoPeriodo * 12 / x.mesi)],
        [`Prezzo energia attuale ${r.materiaAnnuaInfo.limitato ? "(limitato: consumo del periodo troppo basso)" : "(dalla bolletta)"}`, `${n2(r.materiaAnnuaInfo.prezzoVariabile, 4)} €/${u}`]] : []),
      ["Risparmio annuo" + (r.risparmioAnnuoMin != null ? " (intervallo)" : ""), r.risparmioAnnuoMin != null ? `${eur(r.risparmioAnnuoMin)} – ${eur(r.risparmioAnnuoMax)}` : eur(r.risparmioAnnuo)],
      ...(r.risparmioAnnuoSenzaSconti != null ? [["Risparmio annuo senza sconti condizionati", eur(r.risparmioAnnuoSenzaSconti)]] : []),
      ...(r.offerta.tipologia === "Variabile" ? [["Indice usato (stima, non prezzo futuro)", `${c === "luce" ? "PUN" : "PSV"} ${x.idxInfo?.source === "storico" ? "media " + (x.idxInfo.months || []).join(", ") : x.idxInfo?.source === "forecast" ? "previsione" : "valore manuale"}`]] : []),
      [c === "luce" ? "Spesa energia (incl. dispacciamento/capacità)" : "Spesa materia gas", eur(r.energia)],
      ["Commercializzazione (CCV)" + (r.ccv !== (r.offerta.ccv || 0) ? " con sconti" : ""), eur(r.ccv)],
      [`Quota ${c === "luce" ? "energia" : "gas"} annua`, eur(r.quota)],
      ["Trasporto e gestione contatore", eur(r.trasporto)],
      ["Oneri di sistema", eur(r.oneri)],
      ["Accise" + (r.offerta.privati || SEG === "privati" ? " (domestiche)" : ""), eur(r.accise)],
      [`IVA ${pct(r.ivaAliq)}`, eur(r.iva)],
      ["Totale annuo stimato", `<b>${eur(r.totaleAnnuo)}</b>`],
      ["Totale mensile medio", eur(r.totaleMensile)],
      [`Quota ${c === "luce" ? "energia" : "gas"} nel periodo`, eur(r.quotaPeriodo)],
      ["Spesa materia attuale nel periodo", eur(x.materia)]
    ];
    const o = r.offerta;
    return `<div class="breakdown">${items.map(([a, b]) => `<div><span class="muted">${a}</span><span class="num">${b}</span></div>`).join("")}</div>
      <div class="small muted" style="margin-top:8px">${o.mercato
        ? `Offerta di mercato · verificata il ${dIt(o.verificata)}${/^https?:\/\//.test(o.fonte || "") ? ` · <a href="${esc(o.fonte)}" target="_blank" rel="noopener noreferrer">fonte</a>` : ""}`
        : `Operazioni: ${esc(o.operazioni) || "—"} · Pagamento: ${esc(o.pagamento) || "—"} · Canali: ${esc(o.canali) || "—"}`}${o.note ? " · Note: " + esc(o.note) : ""}</div>`;
  }

  function offerteSelezionate(c) {
    const k = ultimo[c]; if (!k) return [];
    // privati (dimostrativo): finché non ci sono accordi si indicano le migliori del mercato
    // il preventivo commerciale contiene SOLO offerte attivabili tramite Alca: mai le offerte esterne del mercato
    const pool = k.results.filter(proponibile);
    if (!pool.length) return [];
    const ids = P.sel[c];
    // come Facile: si propongono anche le offerte con condizioni da verificare (le condizioni compaiono nel preventivo);
    // la verifica resta obbligatoria prima di chiedere il contratto
    if (ids.length) return ids.map(id => pool.find(r => r.offerta.id === id)).filter(Boolean);
    return pool.filter(r => r.risparmioPeriodo > 0).slice(0, 3);
  }

  function renderSelezionate() {
    const el = $("#selezionate"), blocks = [];
    for (const c of ["luce", "gas"]) {
      if (!P[c].attiva) continue;
      const k = ultimo[c]; if (!k || k.errs.length) continue;
      const list = offerteSelezionate(c), auto = !P.sel[c].length;
      blocks.push(`<h3 style="margin:8px 0 6px">${c === "luce" ? "Luce" : "Gas"} ${auto ? '<span class="muted small">(automatico: migliori 3)</span>' : ""}</h3>` + (list.length
        ? `<div class="table-wrap"><table><tbody>${list.map(r => `<tr><td>${esc(r.offerta.azienda)} · ${esc(r.offerta.nome)}</td><td class="num"><span class="saving ${r.risparmioPeriodo > 0 ? "pos" : "neg"}">${eur(r.risparmioAnnuo)}/anno</span></td></tr>`).join("")}</tbody></table></div>`
        : !k.results.some(proponibile)
          ? `<div class="alert warn">Al momento non sono disponibili offerte attivabili tramite Alca per questa fornitura.</div><div class="muted small" style="margin-top:6px">Le alternative esterne restano visibili nel confronto di mercato, solo a titolo informativo.</div>`
          : `<div class="muted small">Nessuna offerta Alca proponibile in automatico: spunta un'offerta dall'elenco (quelle "Da verificare" chiedono conferma delle condizioni).</div>`));
    }
    el.innerHTML = blocks.join("") || `<div class="muted small">Inserisci i dati della bolletta per vedere le offerte.</div>`;
  }

  function renderAvvisi() {
    const el = $("#ai-avvisi");
    el.innerHTML = P.avvisi && P.avvisi.length ? `<div class="alert warn"><b>Da verificare:</b><ul>${P.avvisi.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>` : "";
  }

  /* ------------------------------------------------ upload + AI ------------------------------------------------ */
  const drop = $("#drop"), fin = $("#file-input");
  drop.onclick = () => fin.click();
  drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fin.click(); } };
  drop.ondragover = e => { e.preventDefault(); drop.classList.add("over"); };
  drop.ondragleave = () => drop.classList.remove("over");
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove("over"); aggiungiFile(e.dataTransfer.files); };
  fin.onchange = () => { aggiungiFile(fin.files); fin.value = ""; };
  /* bolletta caricata: chiedo subito i contatti del cliente e parto con l'analisi AI, senza premere il pulsante */
  function aggiungiFile(list) {
    const nuovi = Array.from(list || []); if (!nuovi.length) return;
    files.push(...nuovi); renderFiles();
    chiediContatti();
    clearTimeout(aggiungiFile._t);
    aggiungiFile._t = setTimeout(() => { if (!analisiInCorso) $("#btn-analizza").onclick(); }, 400);   // breve attesa: più file trascinati insieme = una sola analisi
  }

  /* ---------- email e telefono del cliente ---------- */
  const contattiObbligatori = () => Store.mode === "server" ? !!Store.profilo?.contatti_obbligatori : false;
  const telOk = s => String(s || "").replace(/\D/g, "").length >= 6;
  let contattiCliente = null, attesaContatti = null;
  function chiediContatti() {
    if (attesaContatti) return attesaContatti;   // già richiesti per questa bolletta
    // precompilo solo se è la stessa pratica (bolletta già in CRM o rianalisi degli stessi file), mai con i contatti del cliente precedente
    const stessa = (Store.mode === "server" && P.serverId && ["Bolletta ricevuta", "Dati da completare"].includes(P.crm?.stato))
      || (P.analisi && files.length && P.analisi.file?.join("|") === files.map(f => f.name).join("|"));
    const obbl = contattiObbligatori(), em0 = contattiCliente?.email || (stessa ? P.crm?.email : "") || "", tel0 = contattiCliente?.telefono || (stessa ? P.crm?.telefono : "") || "";
    attesaContatti = new Promise(res => {
      const d = $("#dlg"), chiudi = $("#dlg [data-close]");
      const blocca = e => e.preventDefault();
      if (obbl) { chiudi.hidden = true; d.addEventListener("cancel", blocca); }
      d.addEventListener("close", () => { chiudi.hidden = false; d.removeEventListener("cancel", blocca); }, { once: true });
      const salva = () => {
        const email = $("#ct-email").value.trim(), telefono = $("#ct-tel").value.trim(), st = $("#ct-st");
        if ((obbl || email) && !emailOk(email)) { st.textContent = "Inserisci un'email valida del cliente."; $("#ct-email").focus(); return false; }
        if ((obbl || telefono) && !telOk(telefono)) { st.textContent = "Inserisci un numero di telefono valido del cliente."; $("#ct-tel").focus(); return false; }
        contattiCliente = { email, telefono }; applicaContatti(); autoSalva(); res(contattiCliente);
      };
      dialog("Contatti del cliente", `<p class="muted" style="margin-top:0">Intanto analizzo la bolletta.${obbl ? " Email e telefono sono <b>obbligatori</b>." : " Puoi inserirli anche dopo."}</p>
        <div class="fields"><label class="f full">Email del cliente<input id="ct-email" type="email" inputmode="email" autocomplete="off" value="${esc(em0)}" placeholder="cliente@esempio.it"></label>
        <label class="f full">Telefono del cliente<input id="ct-tel" type="tel" inputmode="tel" autocomplete="off" value="${esc(tel0)}" placeholder="333 1234567"></label></div>
        <div class="status err" id="ct-st"></div>`,
        obbl ? [{ label: "Salva contatti", primary: true, onClick: salva }]
             : [{ label: "Più tardi", onClick: () => res(null) }, { label: "Salva contatti", primary: true, onClick: salva }]);
      setTimeout(() => $("#ct-email")?.focus(), 50);
    });
    return attesaContatti;
  }
  function applicaContatti() {
    if (!contattiCliente) return;
    crmDefault(P); P.crm.email = contattiCliente.email; P.crm.telefono = contattiCliente.telefono;
    $$('[data-k="crm.email"], [data-k="crm.telefono"]').forEach(el => el.value = getPath(P, el.dataset.k) || "");
    saveCurrent();
  }
  function renderFiles() {
    $("#file-list").innerHTML = files.map((f, i) => `<li><span>📄 ${esc(f.name)} <span class="muted small">${(f.size / 1024).toFixed(0)} KB</span></span><button class="btn sm" data-rm="${i}">✕</button></li>`).join("");
    $$("#file-list [data-rm]").forEach(b => b.onclick = () => { files.splice(+b.dataset.rm, 1); renderFiles(); });
    $("#btn-analizza").disabled = !files.length;
  }

  $("#btn-analizza").onclick = async () => {
    const st = $("#ai-status"), btn = $("#btn-analizza");
    if (Store.mode === "local" && !Store.data.settings.apiKey) {
      st.className = "status err"; st.innerHTML = 'Manca la chiave API. <a href="#" id="go-set">Apri Impostazioni</a>';
      $("#go-set").onclick = e => { e.preventDefault(); $('#tabs [data-view="impostazioni"]').click(); };
      return;
    }
    btn.disabled = true; st.className = "status"; analisiInCorso = true;
    const t0 = Date.now();
    const contatti = chiediContatti();   // se non già chiesti (es. rianalisi con il pulsante)
    try {
      const out = await AI.estraiBolletta(files, Store.data.settings, msg => st.innerHTML = `<span class="spinner"></span>${esc(msg)}`);
      applicaEstrazione(out);
      applicaContatti();
      st.className = "status ok";
      st.textContent = `✓ Dati estratti in ${Math.round((Date.now() - t0) / 1000)} s · affidabilità ${out.confidenza || "n.d."}. Controlla i campi evidenziati.`;
      // ogni bolletta analizzata entra subito nel CRM, con tutti i dati letti (se obbligatori, dopo email e telefono del cliente)
      const fileAnalizzati = files.slice();
      if (contattiObbligatori() && !contattiCliente) {
        const testo = st.textContent; st.className = "status"; st.innerHTML = `<span class="spinner"></span>Dati estratti: inserisci email e telefono del cliente per salvare la pratica.`;
        await contatti; applicaContatti(); st.className = "status ok"; st.textContent = testo;
      }
      try {
        P.analisi = { at: new Date().toISOString(), file: fileAnalizzati.map(f => f.name), confidenza: out.confidenza || null, avvisi: out.avvisi || [], estratto: out };
        const dove = await salvaNelCrm("Bolletta analizzata con AI" + (fileAnalizzati.length ? ` (${fileAnalizzati.map(f => f.name).join(", ")})` : ""), "Analisi completata");
        st.textContent += dove === "browser" ? " Salvata nel CRM di questo browser." : " Salvata nel CRM.";
        if (Store.mode === "server") archiviaBollette(fileAnalizzati).catch(e => toast("File della bolletta non archiviato: " + e.message));
      } catch (e) { st.textContent += " Attenzione: non salvata nel CRM (" + (e.message || e.code || "errore") + "): premi «Salva nel CRM»."; }
    } catch (e) {
      st.className = "status err"; st.textContent = "Errore: " + e.message;
    } finally {
      btn.disabled = !files.length; analisiInCorso = false;
      // la prossima bolletta chiederà di nuovo i contatti (quelli di questa restano nella pratica)
      if (contattiCliente || !$("#dlg").open) { contattiCliente = null; attesaContatti = null; }
      else attesaContatti.then(() => { contattiCliente = null; attesaContatti = null; });
    }
  };
  let analisiInCorso = false;

  function applicaEstrazione(out) {
    const campi = [];
    const fresh = nuovaPratica();          // una nuova bolletta riparte da campi vuoti (filtri e note restano)
    // una bolletta arrivata da agente/segnalatore è già una pratica sul server: si completa quella, senza crearne un'altra
    const stessaPratica = Store.mode === "server" && P.serverId && ["Bolletta ricevuta", "Dati da completare"].includes(P.crm?.stato);
    P.cliente = fresh.cliente; P.luce = fresh.luce; P.gas = fresh.gas;
    if (!stessaPratica) { P.id = null; P.serverId = null; P.numero = null; P.creata = null; delete P.crm; delete P.autore; }
    delete P.riepilogo; delete P.preventivoId; delete P.preventivoNumero;
    P.origine = nuovaOrigine(P.origine); P.origine.collegata = false;   // la provenienza resta: di solito si compila prima di analizzare
    const put = (k, v) => { if (v === null || v === undefined || v === "") return; setPath(P, k, typeof v === "number" ? String(v).replace(".", ",") : v); campi.push(k); };
    const cl = out.cliente || {};
    put("cliente.ragione_sociale", cl.ragione_sociale); put("cliente.partita_iva", cl.partita_iva || cl.codice_fiscale);
    put("cliente.fornitore_attuale", cl.fornitore_attuale); put("cliente.nome_offerta_attuale", cl.nome_offerta_attuale);
    put("cliente.indirizzo", cl.indirizzo_fornitura);
    const domestica = cl.tipo_cliente === "domestico";
    if (SEG === "privati") { if (out.luce && typeof out.luce.residente === "boolean") put("cliente.residente", out.luce.residente ? "si" : "no"); }
    else if (cl.tipo_cliente && !domestica) put("cliente.tipo_cliente", cl.tipo_cliente);
    const L = out.luce, G = out.gas;
    P.luce.attiva = !!L; P.gas.attiva = !!G;
    if (L) {
      put("luce.pod", L.pod); put("luce.distributore", L.distributore); put("luce.da", L.periodo_da); put("luce.a", L.periodo_a);
      put("luce.totale", L.totale_fornitura_eur); put("luce.materia", L.spesa_materia_energia_eur); put("luce.fisso", L.quota_fissa_vendita_eur);
      put("luce.kwh", L.consumo_periodo_kwh); put("luce.kwhAnnuo", L.consumo_annuo_kwh);
      put("luce.f1", L.consumo_f1_kwh); put("luce.f2", L.consumo_f2_kwh); put("luce.f3", L.consumo_f3_kwh);
      put("luce.kw", L.potenza_impegnata_kw ?? L.potenza_disponibile_kw); put("luce.fasceAttuali", L.struttura_fasce_attuale);
      if (L.consumo_periodo_kwh == null && L.consumo_annuo_kwh) P.luce.usaAnnuo = true;
    }
    if (G) {
      put("gas.pdr", G.pdr); put("gas.da", G.periodo_da); put("gas.a", G.periodo_a);
      put("gas.totale", G.totale_fornitura_eur); put("gas.materia", G.spesa_materia_gas_eur); put("gas.fisso", G.quota_fissa_vendita_eur);
      put("gas.smc", G.consumo_periodo_smc); put("gas.smcAnnuo", G.consumo_annuo_smc);
      const cc = (G.classe_contatore || "").toUpperCase().match(/G\s*(\d+)/);
      if (cc) { const g = +cc[1]; put("gas.classe", g <= 6 ? "G4 - G6" : g <= 40 ? "G10 - G40" : "G40"); }
      if (G.consumo_periodo_smc == null && G.consumo_annuo_smc) P.gas.usaAnnuo = true;
    }
    const avv = [...(out.avvisi || [])];
    if (L?.consumi_stimati) avv.push("Consumi luce stimati dal fornitore: la proiezione annua potrebbe non essere accurata.");
    if (G?.consumi_stimati) avv.push("Consumi gas stimati dal fornitore: la proiezione annua potrebbe non essere accurata.");
    if (L && L.spesa_materia_energia_eur == null) avv.push("Spesa materia energia non trovata: inseriscila a mano per un confronto preciso.");
    if (G && G.spesa_materia_gas_eur == null) avv.push("Spesa materia gas non trovata: inseriscila a mano per un confronto preciso.");
    if (L && L.potenza_impegnata_kw == null) avv.push(`Potenza impegnata non trovata: uso ${SEG === "privati" ? 3 : 6} kW.`);
    if (domestica && SEG !== "privati") avv.push("Sembra una bolletta domestica (privato): per il confronto giusto usa «🏠 Preventivo Privati».");
    if (SEG === "privati" && cl.tipo_cliente && !domestica) avv.push("Sembra una bolletta aziendale: per il preventivo vero usa «🏢 Preventivo Azienda / P.IVA».");
    if (G && !G.classe_contatore) avv.push("Classe contatore gas non trovata: uso " + P.gas.classe + ".");
    P.avvisi = avv; P.aiCampi = campi;
    // dati incerti da confermare prima del preventivo, e da dove viene ogni dato (file e pagina)
    P.campiIncerti = (out.campi_incerti || []).filter(Boolean); P.campiConfermati = {}; P.fontiDati = out.fonti || [];
    if (P.campiIncerti.length) avv.unshift("Dati da verificare prima del preventivo: " + P.campiIncerti.join(", "));
    P.conferme = {};
    P.sel = { luce: [], gas: [] };
    mostraComm(L ? "luce" : "gas");
    fillForm(); saveCurrent(); ricalcola();
  }

  $("#btn-nuova").onclick = () => {
    P = nuovaPratica(); files = []; aperti.clear(); renderFiles();
    $("#ai-status").textContent = ""; mostraComm("luce"); fillForm(); saveCurrent(); ricalcola();
  };

  /* ------------------------------------------------ pratiche ------------------------------------------------ */
  /* ------------------------------------------------ CRM ------------------------------------------------ */
  /* percorso: bolletta → … → attivazione confermata, più esiti negativi con motivazione (codici condivisi con il database) */
  const SP = window.STATI_PRATICA;
  const STATI = SP.elenco.map(x => x[1]);
  const CHIUSI = ["Attivazione confermata", ...SP.negativi.map(c => SP.label[c])];
  const STATO_CLS = Object.fromEntries(SP.elenco.map(([c, l]) => [l, c === "attivazione_confermata" ? "good" : SP.negativi.includes(c) ? "bad" : ["preventivo_inviato", "da_ricontattare", "proposta_accettata", "documentazione_completa", "richiesta_inoltrata"].includes(c) ? "warn" : ""]));
  const SOLO_UFFICIO = ["Richiesta inoltrata", "Attivazione confermata"];
  function crmDefault(p) {
    p.crm = Object.assign({ stato: "Dati da completare", prossimoContatto: "", referente: "", email: "", telefono: "", note: "", storico: [] }, p.crm || {});
    if (SP.vecchi[p.crm.stato]) p.crm.stato = SP.label[SP.vecchi[p.crm.stato]];   // pratiche della versione precedente
    return p;
  }
  /* salva il preventivo corrente nel CRM; evento = testo per lo storico, stato = stato minimo da impostare */
  /* un salvataggio alla volta: evita pratiche doppie se analisi, correzioni e PDF arrivano ravvicinati */
  let codaCrm = Promise.resolve();
  function salvaNelCrm(evento, stato) {
    const fatto = codaCrm.then(() => salvaNelCrmOra(evento, stato));
    codaCrm = fatto.catch(() => { });
    return fatto;
  }
  async function salvaNelCrmOra(evento, stato) {
    crmDefault(P);
    const ora = new Date().toISOString();
    if (!P.id) { P.id = Store.uid("P"); P.creata = ora; P.crm.storico.push({ t: ora, e: "Pratica creata" }); }
    P.aggiornata = ora;
    if (stato && STATI.indexOf(P.crm.stato) < STATI.indexOf(stato)) { P.crm.stato = stato; P.crm.statoCodice = SP.codice[stato]; }
    if (evento) P.crm.storico.push({ t: ora, e: evento });
    P.riepilogo = ["luce", "gas"].filter(c => P[c].attiva && ultimo[c]?.results.length).map(c => {
      const b = offerteSelezionate(c)[0]; return b ? { c, offerta: `${b.offerta.azienda} · ${b.offerta.nome}`, risparmioAnnuo: b.risparmioAnnuo } : null;
    }).filter(Boolean);
    P.consumi = { kwh: ultimo.luce?.ctx?.kwhAnnui || null, smc: ultimo.gas?.ctx?.smcAnnui || null };
    const nuovaPerRichiesta = P.origine?.richiestaId && !P.origine.collegata;
    if (nuovaPerRichiesta) P.origine.collegata = true;
    const dove = await Store.savePratica(P);
    saveCurrent();
    if (nuovaPerRichiesta) await aggiornaRichiesta(P.origine.richiestaId, "Preventivo pronto", "Preventivo creato: " + (P.cliente.ragione_sociale || P.id), { praticaId: P.id });
    return dove;
  }
  /* richiesta di contratto: le offerte scelte vanno all'ufficio, che contatta il cliente e chiude il contratto */
  async function richiediContratto(coppie) {
    if (Store.mode !== "server") { toast("La richiesta di contratto è disponibile nella versione online con accesso personale"); return; }
    coppie = (coppie || []).filter(([, r]) => r && proponibile(r) && !r.commerciale.daVerificare && !(P.richiesteFatte || {})[r.offerta.id]);
    if (!coppie.length) { toast("Spunta almeno un'offerta Alca proponibile, non ancora richiesta"); return; }
    if (!P.crm?.email && !P.crm?.telefono) { await chiediContatti(); applicaContatti(); }
    if (contattiObbligatori() && !(emailOk(P.crm?.email || "") && telOk(P.crm?.telefono || ""))) { toast("Servono email e telefono del cliente"); return; }
    dialog("Richiedi il contratto", `<p>L'ufficio riceve la richiesta, la valuta e contatta il cliente per il contratto.</p>
      <ul>${coppie.map(([c, r]) => `<li><b>${c === "luce" ? "Luce" : "Gas"}</b>: ${esc(r.offerta.azienda)} · ${esc(r.offerta.nome)} <span class="muted small">(risparmio stimato ${eur(r.risparmioAnnuo)}/anno)</span></li>`).join("")}</ul>
      <div class="small muted">Cliente: <b>${esc(P.cliente.ragione_sociale || "—")}</b> · ${esc(P.crm?.email || "email non indicata")} · ${esc(P.crm?.telefono || "telefono non indicato")}</div>
      <div class="status" id="rc-st"></div>`,
      [{ label: "Annulla" }, { label: "Invia la richiesta", primary: true, onClick: async () => {
        const st = $("#rc-st"); st.innerHTML = '<span class="spinner"></span>Invio…';
        try {
          await salvaNelCrm("Richiesta di contratto");   // la pratica deve esistere, con i dati aggiornati
          const offerte = coppie.map(([c, r]) => ({ commodity: c, attivabileAlca: true, offerta: r.offerta, prezzi: r.prezzi, ccv: r.ccv,
            risparmioAnnuo: r.risparmioAnnuo, risparmioPeriodo: r.risparmioPeriodo, condizioniVerificate: P.conferme?.[r.offerta.id] || null }));
          const out = await Server.rpc("richiedi_contratto", { pid: P.id, offerte, preventivo: P.preventivoId || null });
          P.richiesteFatte = Object.assign({}, P.richiesteFatte);
          coppie.forEach(([, r], i) => P.richiesteFatte[r.offerta.id] = out[i]?.numero || "inviata");
          if (STATI.indexOf(P.crm.stato) < STATI.indexOf("Proposta accettata")) { P.crm.stato = "Proposta accettata"; P.crm.statoCodice = "proposta_accettata"; }
          saveCurrent(); autoSalva(); renderRisultati();
          toast("Richiesta inviata all'ufficio: " + out.map(x => x.numero).join(", "));
        } catch (e) { st.className = "status err"; st.textContent = e.message; return false; }
      } }]);
  }
  $("#btn-richiedi")?.addEventListener("click", () => richiediContratto(["luce", "gas"].flatMap(c => P[c]?.attiva && ultimo[c] && !ultimo[c].errs.length ? offerteSelezionate(c).map(r => [c, r]) : [])));

  /* le correzioni a una pratica già nel CRM si salvano da sole, pochi secondi dopo l'ultima modifica */
  let tAuto = null;
  function autoSalva() {
    if (!P || !P.id) return;
    clearTimeout(tAuto);
    tAuto = setTimeout(() => salvaNelCrm().catch(e => toast("Salvataggio automatico non riuscito: " + (e.message || e.code || "errore"))), 3000);
  }
  /* versione con server: il file della bolletta va nell'archivio documenti della pratica */
  async function archiviaBollette(lista) {
    if (!P.serverId) return;
    P.documentiArchiviati = P.documentiArchiviati || [];
    for (const f of lista) {
      const firma = f.name;
      if (P.documentiArchiviati.includes(firma)) continue;
      await Server.caricaDocumento(P.serverId, f, "bolletta");
      P.documentiArchiviati.push(firma);
    }
    saveCurrent(); autoSalva();
  }
  $("#btn-salva").onclick = async () => {
    const btn = $("#btn-salva"); btn.disabled = true;
    try {
      const dove = await salvaNelCrm("Salvato manualmente");
      toast(dove === "browser" ? "Salvato nel CRM (solo in questo browser: il tuo account non permette di salvarlo online)" : `Salvato nel CRM: ${P.cliente.ragione_sociale || "preventivo"}`);
    } catch (e) { toast("Non salvato: " + (e.code || e.message || "errore")); }
    finally { btn.disabled = false; }
  };

  let praticheCache = [], richiesteCache = [], nomiProduttori = {};
  const crmF = { q: "", stato: "Tutti", prod: "Tutti", agente: "Tutti", segn: "Tutti", seg: "Tutti", richiamare: false };
  $("#sel-canale").innerHTML = CANALI.map(c => `<option>${c}</option>`).join("");
  $("#crm-agente").onchange = e => { crmF.agente = e.target.value; disegnaCrm(); };
  $("#crm-seg").onchange = e => { crmF.seg = e.target.value; disegnaCrm(); };
  $("#crm-segn").onchange = e => { crmF.segn = e.target.value; disegnaCrm(); };
  const NESSUNO = "(nessuno)";
  /* elenco di agenti e segnalatori già usati (pratiche + bollette in arrivo), per filtri e suggerimenti */
  function nomiUsati(campo) {
    const s = new Set();
    [...praticheCache, ...richiesteCache].forEach(x => { const v = (x.origine || x)[campo]; if (v && String(v).trim()) s.add(String(v).trim()); });
    if (P?.origine?.[campo]) s.add(P.origine[campo].trim());
    return [...s].sort((a, b) => a.localeCompare(b, "it"));
  }
  function aggiornaElenchiNomi() {
    const opt = (campo, sel, cur) => {
      const l = nomiUsati(campo);
      if (cur !== "Tutti" && cur !== NESSUNO && !l.includes(cur)) l.unshift(cur);
      $(sel).innerHTML = ["Tutti", ...l, NESSUNO].map(v => `<option ${v === cur ? "selected" : ""}>${esc(v)}</option>`).join("");
    };
    opt("agente", "#crm-agente", crmF.agente); opt("segnalatore", "#crm-segn", crmF.segn);
    $("#dl-agenti").innerHTML = nomiUsati("agente").map(v => `<option value="${esc(v)}">`).join("");
    $("#dl-segnalatori").innerHTML = nomiUsati("segnalatore").map(v => `<option value="${esc(v)}">`).join("");
  }
  const provenienza = o => [o?.agente && "Agente: " + o.agente, o?.segnalatore && "Segnalatore: " + o.segnalatore, o?.canale && !["Diretto", "Agente", "Segnalatore"].includes(o.canale) && o.canale].filter(Boolean);
  $("#crm-q").addEventListener("input", e => { crmF.q = e.target.value; disegnaCrm(); });
  $("#crm-stato").innerHTML = ["Tutti", ...STATI].map(s => `<option>${s}</option>`).join("");
  $("#crm-stato").onchange = e => { crmF.stato = e.target.value; disegnaCrm(); };
  $("#crm-prod").onchange = e => { crmF.prod = e.target.value; disegnaCrm(); };
  $("#crm-richiamare").onchange = e => { crmF.richiamare = e.target.checked; disegnaCrm(); };
  $("#crm-refresh").onclick = () => renderPratiche();

  async function renderPratiche() {
    const el = $("#pratiche-list");
    el.innerHTML = `<div class="empty"><span class="spinner"></span>Caricamento…</div>`;
    praticheCache = (await Store.listPratiche()).map(crmDefault);
    $("#crm-err").hidden = !Store.crmError;
    $("#crm-err").textContent = Store.crmError ? `Non riesco a leggere i preventivi salvati sul tuo account (${Store.crmError}). Premi "Aggiorna" tra qualche secondo; se continua, ricarica la pagina.` : "";
    const autori = [...new Set(praticheCache.map(p => p.autore).filter(Boolean))];
    const multi = Store.mode === "online" && Store.canEdit && autori.length > 0;
    nomiProduttori = multi ? await Store.nomiUtenti(autori) : {};
    $("#crm-prod-wrap").hidden = !multi;
    if (multi) $("#crm-prod").innerHTML = `<option>Tutti</option>` + autori.map(a => `<option value="${esc(a)}">${esc(nomeProd(a))}</option>`).join("");
    praticheCache.forEach(p => p.origine = nuovaOrigine(p.origine));
    await caricaRichieste();
    const altri = [...new Set(richiesteCache.map(r => r.autore).filter(a => a && !(a in nomiProduttori)))];
    if (altri.length) { Object.assign(nomiProduttori, await Store.nomiUtenti(altri)); disegnaInbox(); }
    aggiornaElenchiNomi();
    disegnaCrm();
  }
  const nomeProd = a => a === Store._uid ? "Io" : (nomiProduttori[a] || "Produttore " + String(a).slice(-4));
  const risparmioTot = p => (p.riepilogo || []).reduce((t, r) => t + (r.risparmioAnnuo > 0 ? r.risparmioAnnuo : 0), 0);

  function crmFiltrate() {
    const q = crmF.q.trim().toLowerCase(), oggi = E.todayISO();
    return praticheCache.filter(p => {
      if (crmF.stato !== "Tutti" && p.crm.stato !== crmF.stato) return false;
      if (crmF.prod !== "Tutti" && p.autore !== crmF.prod) return false;
      if (crmF.seg !== "Tutti" && (p.segmento === "privati" ? "privati" : "business") !== crmF.seg) return false;
      const eq = (v, f) => f === "Tutti" || (f === NESSUNO ? !String(v || "").trim() : String(v || "").trim() === f);
      if (!eq(p.origine.agente, crmF.agente) || !eq(p.origine.segnalatore, crmF.segn)) return false;
      if (crmF.richiamare && !(p.crm.prossimoContatto && p.crm.prossimoContatto <= oggi && !CHIUSI.includes(p.crm.stato))) return false;
      if (q) {
        const t = [p.cliente.ragione_sociale, p.cliente.partita_iva, p.cliente.fornitore_attuale, p.crm.referente, p.crm.email, p.crm.telefono, p.luce?.pod, p.gas?.pdr, p.crm.note, p.origine.agente, p.origine.segnalatore, p.origine.emailRisposta, p.numero, p.stimaReferral, p.noteRichiesta].join(" ").toLowerCase();
        if (!t.includes(q)) return false;
      }
      return true;
    });
  }

  function disegnaCrm() {
    const el = $("#pratiche-list"), L = crmFiltrate(), oggi = E.todayISO(), all = praticheCache;
    const cnt = s => all.filter(p => p.crm.stato === s).length;
    const neg = SP.negativi.reduce((t, c) => t + cnt(SP.label[c]), 0), att = cnt("Attivazione confermata"), chiusi = att + neg;
    const daRichiamare = all.filter(p => p.crm.prossimoContatto && p.crm.prossimoContatto <= oggi && !CHIUSI.includes(p.crm.stato)).length;
    const inCorso = all.filter(p => ["Preventivo inviato", "Da ricontattare", "Proposta accettata", "Documentazione completa", "Richiesta inoltrata"].includes(p.crm.stato)).length;
    $("#crm-kpis").innerHTML = `
      <div class="kpi"><div class="l">Pratiche</div><div class="v">${all.length}</div><div class="s">${cnt("Bolletta ricevuta") + cnt("Dati da completare")} da lavorare · ${cnt("Preventivo preparato")} preventivi pronti</div></div>
      <div class="kpi"><div class="l">In corso</div><div class="v">${inCorso}</div><div class="s">${daRichiamare ? `<b>${daRichiamare}</b> da ricontattare` : "nessun ricontatto scaduto"}</div></div>
      <div class="kpi good"><div class="l">Attivazioni confermate</div><div class="v">${att}</div><div class="s">${chiusi ? pct(att / chiusi) + " delle pratiche chiuse" : "—"}</div></div>
      <div class="kpi"><div class="l">Risparmio proposto</div><div class="v">${eur(all.reduce((t, p) => t + risparmioTot(p), 0))}</div><div class="s">all'anno, su tutti i preventivi</div></div>`;
    if (!all.length) { el.innerHTML = `<div class="empty">Nessun preventivo ancora. Ogni volta che crei il PDF o premi "Salva nel CRM" il preventivo finisce qui.</div>`; return; }
    if (!L.length) { el.innerHTML = `<div class="empty">Nessun preventivo corrisponde ai filtri.</div>`; return; }
    const multi = !$("#crm-prod-wrap").hidden;
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Data</th><th>Cliente</th><th>Provenienza</th><th>Forniture</th><th>Offerta proposta</th><th class="num">Risparmio annuo</th><th>Stato</th><th>Ricontatto</th>${multi ? "<th>Produttore</th>" : ""}<th></th></tr></thead><tbody>
      ${L.map(p => { const scad = p.crm.prossimoContatto && p.crm.prossimoContatto <= oggi && !CHIUSI.includes(p.crm.stato);
        return `<tr data-id="${p.id}">
        <td class="small">${new Date(p.creata || p.aggiornata).toLocaleDateString("it-IT")}${p.soloBrowser ? '<div class="small muted">solo browser</div>' : ""}</td>
        <td>${p.segmento === "privati" ? '<span class="pill demo">🏠 Privato</span> ' : ""}<b>${esc(p.cliente.ragione_sociale || "(senza nome)")}</b>${p.stimaReferral ? ` <span class="pill">Stima ${esc(p.stimaReferral)}</span>` : ""}<div class="small muted">${esc(p.cliente.partita_iva)}${p.crm.referente ? " · " + esc(p.crm.referente) : ""}${p.crm.telefono ? " · " + esc(p.crm.telefono) : ""}</div><div class="small muted">da ${esc(p.cliente.fornitore_attuale) || "—"}</div></td>
        <td class="small">${provenienza(p.origine).map(esc).join("<br>") || '<span class="muted">Diretto</span>'}</td>
        <td>${["luce", "gas"].filter(c => p[c]?.attiva).join(" + ") || "—"}</td>
        <td class="small">${(p.riepilogo || []).map(r => `${r.c}: ${esc(r.offerta)}`).join("<br>") || "—"}</td>
        <td class="num">${(p.riepilogo || []).map(r => `<span class="saving ${r.risparmioAnnuo > 0 ? "pos" : "neg"}">${eur(r.risparmioAnnuo)}</span>`).join("<br>") || "—"}</td>
        <td><select data-stato class="pill-select ${STATO_CLS[p.crm.stato]}">${STATI.map(s => `<option ${s === p.crm.stato ? "selected" : ""} ${SOLO_UFFICIO.includes(s) && Store.mode === "server" && !Store.profilo?.ufficio && s !== p.crm.stato ? "disabled" : ""}>${s}</option>`).join("")}</select>${p.crm.motivoEsito ? `<div class="small muted">${esc(p.crm.motivoEsito)}</div>` : ""}</td>
        <td><input type="date" data-ric value="${esc(p.crm.prossimoContatto)}" class="${scad ? "scaduto" : ""}"></td>
        ${multi ? `<td class="small">${esc(nomeProd(p.autore))}</td>` : ""}
        <td><div class="btn-row nowrap"><button class="btn sm" data-mail title="Invia il preventivo al cliente">✉️ Invia</button><button class="btn sm" data-scheda>Scheda</button><button class="btn sm" data-open>Apri</button><button class="btn sm danger" data-del title="Elimina">🗑</button></div></td></tr>`; }).join("")}
      </tbody></table></div>`;
    const rec = el => praticheCache.find(x => x.id === el.closest("tr").dataset.id);
    const aggiorna = async (p, ev) => {
      p.aggiornata = new Date().toISOString(); if (ev) p.crm.storico.push({ t: p.aggiornata, e: ev });
      try { await Store.savePratica(p); if (P.id === p.id) { P.crm = JSON.parse(JSON.stringify(p.crm)); P.origine = nuovaOrigine(p.origine); saveCurrent(); fillForm(); } }
      catch (e) { toast("Non salvato: " + (e.code || e.message || "errore")); }
      disegnaCrm();
    };
    $$("#pratiche-list [data-stato]").forEach(s => s.onchange = () => {
      const p = rec(s), nuovo = s.value, cod = SP.codice[nuovo];
      const applica = motivo => { p.crm.stato = nuovo; p.crm.statoCodice = cod; if (motivo) p.crm.motivoEsito = motivo; aggiorna(p, "Stato: " + nuovo + (motivo ? " – " + motivo : "")); };
      if (!SP.negativi.includes(cod)) return applica();
      s.value = p.crm.stato;   // gli esiti negativi richiedono la motivazione
      dialog("Motivo dell'esito", `<label class="f">Perché la pratica è "${esc(nuovo)}"?<select id="mot-sel"><option>Prezzo non competitivo</option><option>Cliente non interessato</option><option>Cliente non raggiungibile</option><option>Requisiti dell'offerta non soddisfatti</option><option>Documentazione non fornita</option><option>Già cliente / già passato ad altro fornitore</option><option>Altro</option></select></label>
        <label class="f" style="margin-top:8px">Dettagli<input id="mot-txt" placeholder="facoltativo"></label>`,
        [{ label: "Annulla" }, { label: "Conferma", primary: true, onClick: () => { const m = [$("#mot-sel").value, $("#mot-txt").value.trim()].filter(Boolean).join(": "); applica(m); } }]);
    });
    $$("#pratiche-list [data-ric]").forEach(s => s.onchange = () => { const p = rec(s); p.crm.prossimoContatto = s.value; aggiorna(p, s.value ? "Ricontatto fissato al " + dIt(s.value) : "Ricontatto rimosso"); });
    $$("#pratiche-list [data-scheda]").forEach(b => b.onclick = () => Store.mode === "server" && window.Rete ? Rete.scheda(rec(b).id) : schedaCrm(rec(b), aggiorna));
    $$("#pratiche-list [data-open]").forEach(b => b.onclick = () => { apriPratica(rec(b)); vaiPreventivo(); });
    $$("#pratiche-list [data-mail]").forEach(b => b.onclick = () => { apriPratica(rec(b)); inviaAlCliente(); });
    $$("#pratiche-list [data-del]").forEach(b => b.onclick = () => { const p = rec(b);
      dialog("Eliminare il preventivo?", `<p>${esc(p.cliente.ragione_sociale || "(senza nome)")}: il preventivo e il suo storico vengono cancellati definitivamente.</p>`, [
        { label: "Annulla" },
        { label: "Elimina", primary: true, onClick: async () => { await Store.deletePratica(p); renderPratiche(); } }]); });
  }

  async function apriPraticaDaId(id) {
    const l = await Store.listPratiche(); const rec = l.find(p => p.id === id);
    if (!rec) { toast("Pratica non trovata o non visibile per il tuo ruolo"); return; }
    apriPratica(crmDefault(rec)); vaiPreventivo();
  }
  function apriPratica(rec) {
    impostaSegmento(rec.segmento === "privati" ? "privati" : "business", false);
    // le pratiche nate da una bolletta inviata (solo dati essenziali) si completano con i campi vuoti del preventivo
    const base = nuovaPratica(), r2 = JSON.parse(JSON.stringify(rec));
    P = Object.assign(base, r2, { cliente: Object.assign(base.cliente, r2.cliente), luce: Object.assign(base.luce, r2.luce), gas: Object.assign(base.gas, r2.gas) });
    delete P.soloBrowser; P.segmento = SEG;
    P.filtri = filtriPratica(P.filtri); P.sel =P.sel || { luce: [], gas: [] }; P.aiCampi = []; P.avvisi = P.avvisi || [];
    P.origine = nuovaOrigine(P.origine);
    files = []; renderFiles(); $("#ai-status").textContent = ""; aperti.clear();
    mostraComm(P.luce.attiva ? "luce" : "gas"); fillForm(); saveCurrent(); ricalcola();
  }

  function schedaCrm(p, aggiorna) {
    const c = p.crm;
    dialog(p.cliente.ragione_sociale || "Preventivo", `
      <div class="fields">
        <label class="f">Referente<input id="cs-ref" value="${esc(c.referente)}"></label>
        <label class="f">Telefono<input id="cs-tel" value="${esc(c.telefono)}" inputmode="tel"></label>
        <label class="f">Email<input id="cs-mail" value="${esc(c.email)}" inputmode="email"></label>
        <label class="f">Stato<select id="cs-stato">${STATI.map(s => `<option ${s === c.stato ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <label class="f">Prossimo contatto<input type="date" id="cs-ric" value="${esc(c.prossimoContatto)}"></label>
        <div class="section-label">Provenienza</div>
        <label class="f">Arrivata tramite<select id="cs-canale">${CANALI.map(s => `<option ${s === p.origine.canale ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <label class="f">Agente<input id="cs-agente" list="dl-agenti" value="${esc(p.origine.agente)}"></label>
        <label class="f">Segnalatore<input id="cs-segn" list="dl-segnalatori" value="${esc(p.origine.segnalatore)}"></label>
        <label class="f">Email per la risposta<input id="cs-erisp" inputmode="email" value="${esc(p.origine.emailRisposta)}"></label>
        <label class="f full">Note<textarea id="cs-note" rows="4">${esc(c.note)}</textarea></label>
      </div>
      <div class="small muted" style="margin:10px 0 4px">P.IVA ${esc(p.cliente.partita_iva) || "—"} · fornitore attuale ${esc(p.cliente.fornitore_attuale) || "—"}${p.luce?.attiva && p.luce.pod ? " · POD " + esc(p.luce.pod) : ""}${p.gas?.attiva && p.gas.pdr ? " · PDR " + esc(p.gas.pdr) : ""}</div>
      <h3 style="margin:12px 0 6px">Storico</h3>
      <ul class="timeline">${[...c.storico].reverse().map(s => `<li><span class="muted small">${new Date(s.t).toLocaleString("it-IT")}</span> ${esc(s.e)}</li>`).join("") || "<li class='muted'>—</li>"}</ul>`,
      [{ label: "Annulla" },
       { label: "✉️ Invia preventivo", onClick: async () => {
         leggiScheda(); await aggiorna(p, null);
         apriPratica(p); setTimeout(inviaAlCliente, 0); return true; } },
       { label: "Salva", primary: true, onClick: () => {
        const prima = c.stato; leggiScheda();
        aggiorna(p, prima !== c.stato ? "Stato: " + c.stato : "Scheda aggiornata");
      } }]);
    function leggiScheda() {
      c.referente = $("#cs-ref").value.trim(); c.telefono = $("#cs-tel").value.trim(); c.email = $("#cs-mail").value.trim();
      c.stato = $("#cs-stato").value; c.prossimoContatto = $("#cs-ric").value; c.note = $("#cs-note").value;
      Object.assign(p.origine, { canale: $("#cs-canale").value, agente: $("#cs-agente").value.trim(), segnalatore: $("#cs-segn").value.trim(), emailRisposta: $("#cs-erisp").value.trim() });
    }
  }

  /* ------------------------------------------------ bollette in arrivo ------------------------------------------------ */
  const STATI_RICH = ["Nuova", "In lavorazione", "Preventivo pronto", "Risposta inviata", "Scartata"];
  const RICH_CLS = { "Nuova": "warn", "In lavorazione": "warn", "Preventivo pronto": "", "Risposta inviata": "good", "Scartata": "bad" };
  const evasa = r => ["Risposta inviata", "Scartata"].includes(r.stato);
  $("#inbox-tutte").onchange = () => disegnaInbox();
  $("#inbox-nuova").onclick = () => schedaRichiesta(null);

  async function caricaRichieste() {
    $("#inbox-card").hidden = !Store.puoRichieste;
    if (!Store.puoRichieste) { richiesteCache = []; return; }
    try { richiesteCache = (await Store.listRichieste()).map(r => Object.assign({ stato: "Nuova", allegati: [], storico: [], cliente: {} }, r)); }
    catch (e) { console.warn("richieste", e); richiesteCache = []; $("#inbox-list").innerHTML = `<div class="alert warn">Non riesco a leggere le bollette in arrivo (${esc(e.code || e.message)}).</div>`; return; }
    disegnaInbox();
  }

  function disegnaInbox() {
    const el = $("#inbox-list"), tutte = $("#inbox-tutte").checked;
    const aperte = richiesteCache.filter(r => !evasa(r)), L = tutte ? richiesteCache : aperte;
    $("#inbox-count").textContent = aperte.length ? aperte.length + " da evadere" : "";
    $("#inbox-count").hidden = !aperte.length;
    if (!L.length) { el.innerHTML = `<div class="empty">${richiesteCache.length ? "Nessuna bolletta da evadere." : "Nessuna bolletta in arrivo. Con «Registra bolletta» annoti una bolletta ricevuta da un agente o segnalatore; quando attiveremo il flusso automatico arriveranno qui da sole."}</div>`; return; }
    el.innerHTML = `<div class="table-wrap"><table><thead><tr><th>Ricevuta</th><th>Cliente</th><th>Provenienza</th><th>Rispondere a</th><th>Bolletta</th><th>Stato</th><th></th></tr></thead><tbody>
      ${L.map(r => `<tr data-rid="${esc(r.id)}">
        <td class="small">${r.ricevuta ? new Date(r.ricevuta).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" }) : "—"}</td>
        <td><b>${esc(r.cliente.ragione_sociale || "(da leggere in bolletta)")}</b>${r.cliente.partita_iva ? `<div class="small muted">${esc(r.cliente.partita_iva)}</div>` : ""}${r.note ? `<div class="small muted">${esc(r.note)}</div>` : ""}</td>
        <td class="small">${provenienza(r).map(esc).join("<br>") || esc(r.canale || "—")}${r.autore && r.autore !== Store._uid ? `<div class="muted">inviata da ${esc(nomeProd(r.autore))}</div>` : ""}</td>
        <td class="small">${esc(r.emailRisposta) || "—"}</td>
        <td class="small">${(r.allegati || []).length ? r.allegati.map(a => "📄 " + esc(a.nome || "bolletta")).join("<br>") : '<span class="muted">da caricare</span>'}</td>
        <td><select data-rstato class="pill-select ${RICH_CLS[r.stato] || ""}">${STATI_RICH.map(s => `<option ${s === r.stato ? "selected" : ""}>${s}</option>`).join("")}</select></td>
        <td><div class="btn-row nowrap"><button class="btn sm primary" data-lavora>${r.praticaId ? "Apri preventivo" : "Fai preventivo"}</button><button class="btn sm" data-rmod>Modifica</button><button class="btn sm danger" data-rdel title="Elimina">🗑</button></div></td></tr>`).join("")}
      </tbody></table></div>`;
    const rec = b => richiesteCache.find(x => x.id === b.closest("tr").dataset.rid);
    $$("#inbox-list [data-rstato]").forEach(s => s.onchange = () => aggiornaRichiesta(rec(s).id, s.value, "Stato: " + s.value));
    $$("#inbox-list [data-lavora]").forEach(b => b.onclick = () => lavoraRichiesta(rec(b)));
    $$("#inbox-list [data-rmod]").forEach(b => b.onclick = () => schedaRichiesta(rec(b)));
    $$("#inbox-list [data-rdel]").forEach(b => b.onclick = () => { const r = rec(b);
      dialog("Eliminare la bolletta in arrivo?", `<p>${esc(r.cliente.ragione_sociale || "Richiesta")}${r.agente ? " · " + esc(r.agente) : ""}: viene tolta dall'elenco. Il preventivo eventualmente già fatto resta nel CRM.</p>`, [
        { label: "Annulla" }, { label: "Elimina", primary: true, onClick: async () => { await Store.deleteRichiesta(r); await caricaRichieste(); } }]); });
  }

  /* cambia lo stato di una richiesta (e, se serve, la collega al preventivo corrente) */
  async function aggiornaRichiesta(id, stato, evento, extra) {
    if (!id || !Store.puoRichieste) return;
    let r = richiesteCache.find(x => x.id === id);
    if (!r) { try { r = (await Store.listRichieste()).find(x => x.id === id); } catch (e) { } }
    if (!r) return;
    r = JSON.parse(JSON.stringify(r)); r.storico = r.storico || [];
    if (stato && !(evasa(r) && STATI_RICH.indexOf(stato) < STATI_RICH.indexOf(r.stato) && !evento?.startsWith("Stato:"))) r.stato = stato;
    Object.assign(r, extra || {});
    r.storico.push({ t: new Date().toISOString(), e: evento || "Stato: " + r.stato });
    try { await Store.saveRichiesta(r); const i = richiesteCache.findIndex(x => x.id === id); if (i >= 0) richiesteCache[i] = r; else richiesteCache.unshift(r); }
    catch (e) { toast("Bolletta in arrivo non aggiornata: " + (e.code || e.message)); }
    if ($("#view-pratiche").classList.contains("active")) disegnaInbox();
  }

  async function lavoraRichiesta(r) {
    const esistente = r.praticaId && praticheCache.find(p => p.id === r.praticaId);
    // sul server la bolletta in arrivo è già una pratica: si apre quella e si analizzano gli allegati
    const daCompletare = esistente && r._server && ["Bolletta ricevuta", "Dati da completare"].includes(esistente.crm?.stato);
    if (esistente && !daCompletare) { apriPratica(esistente); vaiPreventivo(); return; }
    if (daCompletare) { apriPratica(esistente); P.documentiArchiviati = (r.allegati || []).map(a => a.nome); }   // già in archivio
    else { impostaSegmento(r.segmento === "privati" ? "privati" : "business", false); P = nuovaPratica(); }
    aperti.clear();
    P.origine = nuovaOrigine({ canale: r.canale || "Diretto", agente: r.agente || "", segnalatore: r.segnalatore || "", emailRisposta: r.emailRisposta || "",
      richiestaId: r.id, ricevuta: r.ricevuta || "", noteRichiesta: r.note || "", inviataDa: r.autore || "" });
    P.cliente.ragione_sociale = r.cliente?.ragione_sociale || ""; P.cliente.partita_iva = r.cliente?.partita_iva || "";
    files = []; $("#ai-status").textContent = "";
    // le bollette arrivate dal flusso automatico si scaricano e si analizzano subito
    for (const a of r.allegati || []) {
      if (!a.url) continue;
      try { const blob = await (await fetch(a.url)).blob(); files.push(new File([blob], a.nome || "bolletta.pdf", { type: a.tipo || blob.type || "application/pdf" })); }
      catch (e) { console.warn("allegato", e); toast("Non riesco a scaricare l'allegato " + (a.nome || "")); }
    }
    renderFiles(); mostraComm("luce"); fillForm(); saveCurrent(); ricalcola();
    vaiPreventivo();
    if (r.stato === "Nuova") aggiornaRichiesta(r.id, "In lavorazione", "Presa in carico");
    if (files.length) $("#btn-analizza").click();
    else toast("Carica la bolletta e premi Analizza: agente, segnalatore ed email di risposta sono già compilati");
  }

  function schedaRichiesta(r) {
    const nuova = !r; r = r ? JSON.parse(JSON.stringify(r)) : { ricevuta: new Date().toISOString(), canale: "Agente", agente: "", segnalatore: "", emailRisposta: "", cliente: {}, note: "", allegati: [], stato: "Nuova", storico: [] };
    const locISO = iso => { const d = iso ? new Date(iso) : new Date(); return new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16); };
    dialog(nuova ? "Registra bolletta in arrivo" : "Bolletta in arrivo", `
      <div class="fields">
        <label class="f">Ricevuta il<input type="datetime-local" id="ri-data" value="${locISO(r.ricevuta)}"></label>
        <label class="f">Arrivata tramite<select id="ri-canale">${CANALI.map(s => `<option ${s === r.canale ? "selected" : ""}>${s}</option>`).join("")}</select></label>
        <label class="f">Agente<input id="ri-agente" list="dl-agenti" value="${esc(r.agente)}"></label>
        <label class="f">Segnalatore<input id="ri-segn" list="dl-segnalatori" value="${esc(r.segnalatore)}"></label>
        <label class="f full">Email a cui mandare il preventivo<input id="ri-email" inputmode="email" value="${esc(r.emailRisposta)}" placeholder="es. email dell'agente o del cliente"></label>
        <label class="f">Cliente (se noto)<input id="ri-rs" value="${esc(r.cliente.ragione_sociale)}"></label>
        <label class="f">Partita IVA<input id="ri-piva" value="${esc(r.cliente.partita_iva)}"></label>
        <label class="f full">Note<textarea id="ri-note" rows="3">${esc(r.note)}</textarea></label>
      </div>
      ${nuova ? `<div class="small muted" style="margin-top:6px">La bolletta la carichi quando premi «Fai preventivo».</div>` : `<h3 style="margin:12px 0 6px">Storico</h3>
      <ul class="timeline">${[...(r.storico || [])].reverse().map(s => `<li><span class="muted small">${new Date(s.t).toLocaleString("it-IT")}</span> ${esc(s.e)}</li>`).join("") || "<li class='muted'>—</li>"}</ul>`}
      <div class="status" id="ri-status"></div>`,
      [{ label: "Annulla" },
       { label: nuova ? "Salva e fai preventivo" : "Salva e apri", onClick: async () => { const x = await salva(); if (!x) return false; setTimeout(() => lavoraRichiesta(x), 0); } },
       { label: "Salva", primary: true, onClick: async () => (await salva()) ? undefined : false }]);
    async function salva() {
      const em = $("#ri-email").value.trim();
      if (em && !emailOk(em)) { $("#ri-status").className = "status err"; $("#ri-status").textContent = "Email per la risposta non valida."; return null; }
      Object.assign(r, { ricevuta: new Date($("#ri-data").value || Date.now()).toISOString(), canale: $("#ri-canale").value, agente: $("#ri-agente").value.trim(),
        segnalatore: $("#ri-segn").value.trim(), emailRisposta: em, note: $("#ri-note").value.trim(),
        cliente: { ragione_sociale: $("#ri-rs").value.trim(), partita_iva: $("#ri-piva").value.trim() } });
      r.storico.push({ t: new Date().toISOString(), e: nuova ? "Registrata a mano" : "Dati modificati" });
      try { const saved = await Store.saveRichiesta(r); await caricaRichieste(); aggiornaElenchiNomi(); return saved; }
      catch (e) { $("#ri-status").className = "status err"; $("#ri-status").textContent = "Non salvata: " + (e.code || e.message); return null; }
    }
  }

  /* ------------------------------------------------ modulo "Invia bolletta" ------------------------------------------------ */
  let ibFiles = [];
  const ibDrop = $("#ib-drop"), ibIn = $("#ib-input");
  ibDrop.onclick = () => ibIn.click();
  ibDrop.ondragover = e => { e.preventDefault(); ibDrop.classList.add("over"); };
  ibDrop.ondragleave = () => ibDrop.classList.remove("over");
  ibDrop.ondrop = e => { e.preventDefault(); ibDrop.classList.remove("over"); ibFiles.push(...e.dataTransfer.files); ibRender(); };
  ibIn.onchange = () => { ibFiles.push(...ibIn.files); ibIn.value = ""; ibRender(); };
  function ibRender() {
    $("#ib-files").innerHTML = ibFiles.map((f, i) => `<li><span>📄 ${esc(f.name)} <span class="muted small">${(f.size / 1024).toFixed(0)} KB</span></span><button class="btn sm" data-rm="${i}">✕</button></li>`).join("");
    $$("#ib-files [data-rm]").forEach(b => b.onclick = () => { ibFiles.splice(+b.dataset.rm, 1); ibRender(); });
  }
  let ibPrefill = false;
  async function renderInvia() {
    if (!ibPrefill) {
      ibPrefill = true;
      const nome = Store.data.settings.agente || await Store.nomeUtente();
      if (nome && !$("#ib-agente").value) $("#ib-agente").value = nome;
      try { const u = JSON.parse(localStorage.getItem("cbp.invia.v1") || "{}"); if (u.email && !$("#ib-email").value) $("#ib-email").value = u.email; if (u.agente) $("#ib-agente").value = u.agente; } catch (e) { }
    }
    const el = $("#ib-mie");
    el.innerHTML = `<div class="empty"><span class="spinner"></span>Caricamento…</div>`;
    let L = [];
    try { L = await Store.mieBollette(); } catch (e) { el.innerHTML = `<div class="alert warn">Non riesco a leggere le tue bollette (${esc(e.code || e.message)}).</div>`; return; }
    el.innerHTML = L.length ? `<div class="table-wrap"><table><thead><tr><th>Inviata</th><th>Cliente</th><th>Segnalatore</th><th>Stato</th></tr></thead><tbody>
      ${L.map(r => `<tr><td class="small">${new Date(r.ricevuta).toLocaleString("it-IT", { dateStyle: "short", timeStyle: "short" })}</td>
        <td><b>${esc(r.cliente?.ragione_sociale || (r.allegati || [])[0]?.nome || "—")}</b>${r.emailRisposta ? `<div class="small muted">risposta a ${esc(r.emailRisposta)}</div>` : ""}</td>
        <td class="small">${esc(r.segnalatore) || "—"}</td>
        <td><span class="pill ${RICH_CLS[r.stato] || ""}">${esc(r.stato === "Risposta inviata" ? "Preventivo inviato" : r.stato)}</span></td></tr>`).join("")}</tbody></table></div>`
      : `<div class="empty">Non hai ancora inviato bollette.</div>`;
  }
  $("#ib-refresh").onclick = () => renderInvia();
  $("#ib-go").onclick = async () => {
    const st = $("#ib-status"), btn = $("#ib-go");
    const err = m => { st.className = "status err"; st.textContent = m; };
    const em = $("#ib-email").value.trim(), ag = $("#ib-agente").value.trim();
    if (!ibFiles.length) return err("Carica la bolletta (PDF o foto).");
    if (!ag && !$("#ib-segn").value.trim()) return err("Indica l'agente o il segnalatore.");
    if (!emailOk(em)) return err("Inserisci un'email valida a cui mandare il preventivo.");
    const cliEm = $("#ib-cli-email").value.trim(), cliTel = $("#ib-cli-tel").value.trim();
    if ((contattiObbligatori() || cliEm) && !emailOk(cliEm)) return err("Inserisci l'email del cliente" + (contattiObbligatori() ? " (obbligatoria)." : " valida."));
    if ((contattiObbligatori() || cliTel) && !telOk(cliTel)) return err("Inserisci il telefono del cliente" + (contattiObbligatori() ? " (obbligatorio)." : " valido."));
    const tooBig = ibFiles.find(f => f.size > 20 * 1024 * 1024); if (tooBig) return err(`${tooBig.name} supera 20 MB.`);
    btn.disabled = true; st.className = "status";
    try {
      const segn = $("#ib-segn").value.trim();
      await Store.inviaBolletta({ canale: "Modulo web", agente: ag, segnalatore: segn, emailRisposta: em,
        cliente: { ragione_sociale: $("#ib-rs").value.trim(), partita_iva: $("#ib-piva").value.trim(), email: cliEm, telefono: cliTel }, note: $("#ib-note").value.trim() },
        ibFiles, m => st.innerHTML = `<span class="spinner"></span>${esc(m)}`);
      try { localStorage.setItem("cbp.invia.v1", JSON.stringify({ email: em, agente: ag })); } catch (e) { }
      ibFiles = []; ibRender(); ["#ib-segn", "#ib-rs", "#ib-piva", "#ib-note", "#ib-cli-email", "#ib-cli-tel"].forEach(s => $(s).value = "");
      st.className = "status ok"; st.textContent = "✓ Bolletta inviata. Riceverai il preventivo all'indirizzo " + em + ".";
      renderInvia();
    } catch (e) { err("Non inviata: " + (e.message || e.code || "errore")); }
    finally { btn.disabled = false; }
  };

  $("#crm-export").onclick = async () => {
    const L = crmFiltrate(), sep = ";";
    const cell = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Data", "Cliente", "P.IVA", "Referente", "Telefono", "Email", "Fornitore attuale", "Forniture", "Offerta proposta", "Risparmio annuo €", "Stato", "Prossimo contatto", "Produttore", "Arrivata tramite", "Agente", "Segnalatore", "Email risposta", "Note"];
    const rows = L.map(p => [new Date(p.creata || p.aggiornata).toLocaleDateString("it-IT"), p.cliente.ragione_sociale, p.cliente.partita_iva, p.crm.referente, p.crm.telefono, p.crm.email,
      p.cliente.fornitore_attuale, ["luce", "gas"].filter(c => p[c]?.attiva).join("+"), (p.riepilogo || []).map(r => r.c + ": " + r.offerta).join(" | "),
      String(Math.round(risparmioTot(p) * 100) / 100).replace(".", ","), p.crm.stato, dIt(p.crm.prossimoContatto), p.autore ? nomeProd(p.autore) : "", p.origine.canale, p.origine.agente, p.origine.segnalatore, p.origine.emailRisposta, p.crm.note]);
    const txt = "﻿" + [head, ...rows].map(r => r.map(cell).join(sep)).join("\r\n");
    const filename = `CRM-preventivi-${E.todayISO()}.csv`;
    if (Store.mode === "online") {
      const dl = await window.claude.use("downloads");
      if (!dl) { toast("Download non disponibile in questa visualizzazione"); return; }
      try { await dl.save({ filename, data: new Blob([txt], { type: "text/csv" }) }); } catch (e) { if (e?.code !== "declined") toast("File non scaricato"); }
      return;
    }
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([txt], { type: "text/csv" })); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  /* ------------------------------------------------ stampa ------------------------------------------------ */
  /* controlli prima di emettere il preventivo commerciale */
  function controlliEmissione() {
    const attive = ["luce", "gas"].filter(c => P[c].attiva && ultimo[c] && !ultimo[c].errs.length);
    if (!attive.length) return "Inserisci prima i dati della bolletta.";
    const sel = Object.fromEntries(attive.map(c => [c, offerteSelezionate(c)]));
    if (!attive.some(c => sel[c].length)) return "Al momento non sono disponibili offerte attivabili tramite Alca per questa fornitura: il preventivo commerciale non si può emettere. Puoi usare il confronto di mercato a scopo informativo.";
    // dual: l'abbinamento deve rispettare le condizioni dei prodotti scelti
    for (const c of attive) for (const r of sel[c]) if (E.contratto(r.offerta) === "dual") {
      const altra = c === "luce" ? "gas" : "luce";
      const ok = (sel[altra] || []).some(x => normForn(x.offerta.azienda) === normForn(r.offerta.azienda) && E.contratto(x.offerta) !== "single");
      if (!ok) return `${r.offerta.azienda} · ${r.offerta.nome} vale solo in abbinamento dual: seleziona anche l'offerta ${altra} dello stesso fornitore, oppure togli questa offerta.`;
    }
    return null;
  }
  function confermaCampiIncerti() {
    const da = (P.campiIncerti || []).filter(c => !(P.campiConfermati || {})[c]);
    if (!da.length) return Promise.resolve(true);
    return new Promise(res => dialog("Verifica i dati incerti", `<p>L'analisi automatica ha letto con difficoltà questi dati. Controllali sulla bolletta (e correggili nei campi se serve) prima di emettere il preventivo:</p>
      <ul>${da.map(c => { const f = (P.fontiDati || []).find(x => x.campo === c); return `<li><b>${esc(c)}</b>${f ? ` <span class="muted small">(${esc(f.file || "")}${f.pagina ? ", pag. " + f.pagina : ""})</span>` : ""}</li>`; }).join("")}</ul>`,
      [{ label: "Torno a controllare", onClick: () => res(false) }, { label: "Ho verificato i dati", primary: true, onClick: async () => {
        const chi = (await Store.nomeUtente().catch(() => "")) || "operatore", at = new Date().toISOString();
        P.campiConfermati = Object.assign({}, P.campiConfermati, Object.fromEntries(da.map(c => [c, { da: chi, at }]))); saveCurrent(); res(true);
      } }]));
  }
  /* fotografia dei dati e delle condizioni usate: un preventivo emesso non cambia se cambiano catalogo o parametri */
  function fotografia() {
    const out = { cliente: P.cliente, segmento: SEG, consumi: {}, offerte: [], ipotesi: [], catalogo_versioni: Store.catalogoVersioni || null, conferme: P.conferme || {}, campi_confermati: P.campiConfermati || {} };
    for (const c of ["luce", "gas"]) {
      const k = ultimo[c]; if (!P[c].attiva || !k || k.errs.length) continue;
      out.consumi[c] = { bolletta: P[c], annuo: k.ctx.consumoAnnuo, periodo: k.ctx.consumoPeriodo, stima: k.ctx.stima, indice: k.ctx.idxInfo, mesi: k.ctx.mesi, materia: k.ctx.materia, totale: k.ctx.totale };
      for (const r of offerteSelezionate(c)) out.offerte.push({ commodity: c, attivabileAlca: true, offerta: r.offerta, prezzi: r.prezzi, ccv: r.ccv, quotaAnnua: r.quota,
        totaleAnnuo: r.totaleAnnuo, risparmioPeriodo: r.risparmioPeriodo, risparmioAnnuo: r.risparmioAnnuo, risparmioAnnuoMin: r.risparmioAnnuoMin ?? null, risparmioAnnuoMax: r.risparmioAnnuoMax ?? null,
        risparmioAnnuoSenzaSconti: r.risparmioAnnuoSenzaSconti ?? null, condizioni: r.restr?.frasi || [], scontiApplicati: !!k.ctx.usaSconti });
      out.ipotesi.push(`${c}: consumo annuo ${k.ctx.stima?.nota || ""}; indice ${k.ctx.idxInfo?.source === "storico" ? "media " + (k.ctx.idxInfo.months || []).join(", ") : k.ctx.idxInfo?.source || ""}`);
    }
    return out;
  }
  $("#btn-stampa").onclick = async () => {
    const blocco = controlliEmissione();
    if (blocco) { dialog("Preventivo non emesso", `<div class="alert warn">${esc(blocco)}</div>`); return; }
    if (!(await confermaCampiIncerti())) return;
    if (Store.mode === "server") {
      try {
        await salvaNelCrm();
        const q = await Server.rpc("emetti_preventivo", { pid: P.id, snapshot: fotografia() });
        P.preventivoId = q.id; P.preventivoNumero = q.numero; P.preventivoVersione = q.versione; saveCurrent();
      } catch (e) { dialog("Preventivo non emesso", `<div class="alert bad">${esc(e.message)}</div>`); return; }
    } else { P.preventivoNumero = (P.id || "P") + "-" + new Date().toISOString().slice(0, 10); }
    const D = Store.data, cl = P.cliente, blocchi = [];
    for (const c of ["luce", "gas"]) {
      const k = ultimo[c];
      if (!P[c].attiva || !k || k.errs.length) continue;
      const list = offerteSelezionate(c);
      const X = P[c], x = k.ctx, u = c === "luce" ? "kWh" : "Smc";
      const cons = c === "luce" ? x.kwhAnnui : x.smcAnnui;
      const best = list[0];
      blocchi.push(`
        <h2>Fornitura ${c === "luce" ? "energia elettrica" : "gas naturale"} ${c === "luce" && X.pod ? "· POD " + esc(X.pod) : c === "gas" && X.pdr ? "· PDR " + esc(X.pdr) : ""}</h2>
        <div class="p-grid">
          <div class="p-box"><b>Situazione attuale</b>
            <div class="p-kv"><span>Fornitore</span><span>${esc(cl.fornitore_attuale) || "—"}</span></div>
            <div class="p-kv"><span>Periodo bolletta</span><span>${dIt(X.da)} – ${dIt(X.a)} (${x.mesi} mesi)</span></div>
            <div class="p-kv"><span>Totale bolletta</span><span>${eur(x.totale)}</span></div>
            <div class="p-kv"><span>Spesa materia ${c === "luce" ? "energia" : "gas"}</span><span>${eur(x.materia)}</span></div>
            <div class="p-kv"><span>Consumo annuo stimato</span><span>${n2(cons, 0)} ${u}</span></div>
            ${c === "luce" ? `<div class="p-kv"><span>Potenza impegnata</span><span>${n2(x.kw, 1)} kW</span></div>` : `<div class="p-kv"><span>Classe contatore</span><span>${esc(x.classe)}</span></div>`}
          </div>
          <div class="p-box"><b>Risparmio stimato con la proposta migliore</b>
            ${best ? `<div style="margin:6px 0">${esc(best.offerta.azienda)} – ${esc(best.offerta.nome)}</div>
              <div class="p-big">${eur(best.risparmioAnnuo)} / anno</div>
              <div class="p-kv"><span>Risparmio sul periodo della bolletta</span><span>${eur(best.risparmioPeriodo)}</span></div>
              <div class="p-kv"><span>Nuova bolletta stimata (stesso periodo)</span><span>${eur(best.nuovaBollettaPeriodo)}</span></div>
              <div class="p-kv"><span>Riduzione</span><span>${pct(best.risparmioPct)}</span></div>` : "<div>Nessuna offerta più conveniente individuata.</div>"}
          </div>
        </div>
        ${list.length ? `<table><thead><tr><th>Fornitore / Offerta</th><th>Prezzo</th><th>CCV/anno</th><th>Bolletta periodo</th><th>Risparmio periodo</th><th>Risparmio annuo</th></tr></thead><tbody>
          ${list.map(r => `<tr><td><b>${esc(r.offerta.azienda)}</b><br>${esc(r.offerta.nome)}<br><span style="color:#666">${r.offerta.tipologia}${c === "luce" ? " · " + r.offerta.fascia : ""}</span></td>
            <td>${prezzoLabel(r, c)}</td><td class="num">${eur(r.ccv)}</td><td class="num">${eur(r.nuovaBollettaPeriodo)}</td>
            <td class="num">${eur(r.risparmioPeriodo)}</td><td class="num"><b>${eur(r.risparmioAnnuo)}</b></td></tr>`).join("")}
          </tbody></table>` : ""}`);
    }
    if (!blocchi.length) { toast("Inserisci prima i dati della bolletta"); return; }
    // ogni preventivo prodotto finisce nel CRM
    salvaNelCrm("Emesso il preventivo " + (P.preventivoNumero || ""), "Preventivo preparato").catch(e => console.warn("CRM", e));
    $("#print-area").innerHTML = `
      <div class="p-head"><div><h1>Alca Energy · Proposta di risparmio energetico</h1><div>${esc(intestazione().agente)}</div></div>
        <div style="text-align:right">${new Date().toLocaleDateString("it-IT")}<br>Preventivo ${esc(P.preventivoNumero || P.id || "—")}</div></div>
      <div class="p-box"><b>Cliente:</b> ${esc(cl.ragione_sociale) || "—"} ${cl.partita_iva ? "· P.IVA " + esc(cl.partita_iva) : ""}</div>
      ${blocchi.join("")}
      ${P.note ? `<div class="p-box"><b>Note:</b> ${esc(P.note).replace(/\n/g, "<br>")}</div>` : ""}
      <div class="p-note">Stima calcolata sui consumi della bolletta fornita, riportati su base annua, con le componenti regolate ARERA vigenti, accise e IVA ${pct(catalogo("luce").cfg.iva)}${SEG === "privati" ? " (uso domestico)" : ""}.
      Per le offerte a prezzo variabile si usa ${P.filtri.indiceModo === "ultimo" ? "l'ultimo valore mensile pubblicato" : P.filtri.indiceModo === "ultimi12" ? "la media degli ultimi 12 mesi" : P.filtri.indiceModo === "manuale" ? "il valore indicato" : "la media del periodo di fatturazione"} dell'indice PUN/PSV: l'importo reale dipenderà dall'andamento futuro dei prezzi all'ingrosso.
      Le condizioni economiche sono quelle in vigore alla data del preventivo e sono soggette alla validità dell'offerta. Documento non contrattuale.</div>`;
    anteprimaPdf();
  };

  /* ---------- PDF: generato come documento vero (testo e tabelle), non come fotografia della pagina ---------- */
  const JSPDF = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
  const AUTOTABLE = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
  function loadScript(src) {
    if (document.querySelector(`script[src="${src}"]`)?.dataset.ok) return Promise.resolve();
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = () => { s.dataset.ok = "1"; res(); }; s.onerror = () => rej(new Error("Impossibile caricare il generatore PDF (connessione?)")); document.head.appendChild(s); });
  }
  async function loadJsPdf() { if (!window.jspdf) await loadScript(JSPDF); await loadScript(AUTOTABLE); return window.jspdf.jsPDF; }
  function nomeFile() {
    const n = (P.cliente.ragione_sociale || "cliente").normalize("NFD").replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    return `Preventivo-${n}-${E.todayISO()}.pdf`;
  }
  // testo compatibile con i font standard del PDF
  const pt = s => String(s ?? "").replace(/≈/g, "circa").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[^\x00-\xFF€–—…·•]/g, "");
  function prezzoTesto(r, c) {
    const o = r.offerta, u = c === "luce" ? "€/kWh" : "€/Smc";
    const vals = Object.entries(r.prezzi).map(([k, v]) => `${c === "luce" ? k + " " : ""}${n2(v, 4)}`).join(" · ");
    return o.tipologia === "Variabile" ? `${c === "luce" ? "PUN" : "PSV"} + ${n2(o.spread || 0, 4)}\n(oggi circa ${vals} ${u})` : `${vals} ${u}\nprezzo fisso`;
  }

  /* logo per il PDF: lo stesso file della barra in alto (nella versione claude.ai è già incorporato nella pagina) */
  let _logo;
  async function logoDataUrl() {
    if (_logo !== undefined) return _logo;
    try {
      const src = document.querySelector(".brand-logo")?.getAttribute("src") || "assets/logo-alca.png";
      if (src.startsWith("data:")) return (_logo = src);
      const blob = await (await fetch(src)).blob();
      _logo = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
    } catch (e) { _logo = null; }
    return _logo;
  }
  /* identità Alca Energy e agente di riferimento sul preventivo */
  function intestazione() {
    const S = Store.data.settings, pr = Store.profilo;
    const agente = pr ? `Referente: ${pr.nome} ${pr.cognome}${pr.codice_agente ? " (cod. " + pr.codice_agente + ")" : ""}` : (S.agente || "");
    return { agente, contatti: S.mittente || "energia@alcabroker.it" };
  }
  async function creaPdfBlob() {
    const jsPDF = await loadJsPdf();
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const D = Store.data, cl = P.cliente, W = 210, M = 14, ACC = [15, 110, 86], GR = [95, 107, 120];
    // intestazione
    // intestazione con il logo Alca Broker (sfondo verde scuro del logo)
    doc.setFillColor(12, 47, 42); doc.rect(0, 0, W, 30, "F");
    const logo = await logoDataUrl(), xT = logo ? M + 42 : M;
    if (logo) doc.addImage(logo, "PNG", M - 2, 4, 37.2, 22);
    doc.setTextColor(255); doc.setFont("helvetica", "bold"); doc.setFontSize(15);
    const IT = intestazione();
    doc.text("Alca Energy · Proposta di risparmio", xT, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.text(pt([IT.agente, IT.contatti].filter(Boolean).join(" · ")), xT, 22);
    doc.text(new Date().toLocaleDateString("it-IT"), W - M, 14, { align: "right" });
    doc.text(pt("Preventivo " + (P.preventivoNumero || P.id || "—")), W - M, 22, { align: "right" });
    let y = 38;
    doc.setTextColor(23, 33, 43); doc.setFontSize(10);
    doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: "plain", styles: { fontSize: 10, cellPadding: 1.2 },
      body: [[{ content: "Cliente", styles: { fontStyle: "bold", cellWidth: 32 } }, pt(cl.ragione_sociale || "—")],
             ...(cl.partita_iva ? [[{ content: "P.IVA / C.F.", styles: { fontStyle: "bold" } }, pt(cl.partita_iva)]] : []),
             ...(cl.fornitore_attuale ? [[{ content: "Fornitore attuale", styles: { fontStyle: "bold" } }, pt(cl.fornitore_attuale + (cl.nome_offerta_attuale ? " – " + cl.nome_offerta_attuale : ""))]] : [])] });
    y = doc.lastAutoTable.finalY + 6;
    let totAnnuo = 0;
    for (const c of ["luce", "gas"]) {
      const k = ultimo[c];
      if (!P[c].attiva || !k || k.errs.length) continue;
      const list = offerteSelezionate(c), X = P[c], x = k.ctx, u = c === "luce" ? "kWh" : "Smc", best = list[0];
      const cons = c === "luce" ? x.kwhAnnui : x.smcAnnui;
      if (best && best.risparmioAnnuo > 0) totAnnuo += best.risparmioAnnuo;
      if (y > 230) { doc.addPage(); y = 18; }
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...ACC);
      doc.text(pt(`Fornitura ${c === "luce" ? "energia elettrica" : "gas naturale"}${c === "luce" && X.pod ? " · POD " + X.pod : c === "gas" && X.pdr ? " · PDR " + X.pdr : ""}`), M, y);
      doc.setDrawColor(...ACC); doc.setLineWidth(0.4); doc.line(M, y + 1.8, W - M, y + 1.8);
      y += 5;
      const att = [["Periodo bolletta", `${dIt(X.da)} – ${dIt(X.a)} (${x.mesi} ${x.mesi === 1 ? "mese" : "mesi"})`], ["Totale bolletta", eur(x.totale)],
        [`Spesa materia ${c === "luce" ? "energia" : "gas"}`, eur(x.materia)],
        [x.stima?.metodo === "bolletta" ? "Consumo annuo (da bolletta)" : "Consumo annuo stimato", `${n2(cons, 0)} ${u}${x.stima?.metodo !== "bolletta" && x.stima?.nota ? " – " + x.stima.nota : ""}`],
        c === "luce" ? ["Potenza impegnata", `${n2(x.kw, 1)} kW`] : ["Classe contatore", String(x.classe)]];
      const prop = best ? [["Offerta proposta (attivabile tramite Alca)", `${best.offerta.azienda} – ${best.offerta.nome}`],
        ["Risparmio annuo stimato", eur(best.risparmioAnnuo) + (best.risparmioAnnuoMin != null ? ` (tra ${eur(best.risparmioAnnuoMin)} e ${eur(best.risparmioAnnuoMax)})` : "")],
        ...(best.risparmioAnnuoSenzaSconti != null ? [["Risparmio senza sconti condizionati", eur(best.risparmioAnnuoSenzaSconti)]] : []),
        ["Risparmio sul periodo", eur(best.risparmioPeriodo)], ["Nuova bolletta (stesso periodo)", eur(best.nuovaBollettaPeriodo)], ["Riduzione", pct(best.risparmioPct)]]
        : [["Esito", "Nessuna offerta più conveniente individuata"]];
      const colW = (W - 2 * M - 6) / 2;
      const kv = (rows, left, titolo, evid) => {
        doc.autoTable({ startY: y, margin: { left, right: W - left - colW }, tableWidth: colW, theme: "grid",
          head: [[{ content: titolo, colSpan: 2 }]], body: rows.map(r => r.map(pt)),
          headStyles: { fillColor: evid ? ACC : [236, 240, 243], textColor: evid ? 255 : [23, 33, 43], fontSize: 10 },
          styles: { fontSize: 9, cellPadding: 1.8, lineColor: [223, 228, 233], lineWidth: 0.2 },
          columnStyles: { 0: { textColor: GR, cellWidth: colW * 0.45 }, 1: { halign: "right", fontStyle: "bold" } },
          didParseCell: d => { if (evid && d.section === "body" && d.row.index === 1 && d.column.index === 1) { d.cell.styles.fontSize = 13; d.cell.styles.textColor = ACC; } } });
        return doc.lastAutoTable.finalY;
      };
      const y1 = kv(att, M, "Situazione attuale", false), y2 = kv(prop, M + colW + 6, "Con la nostra proposta", true);
      y = Math.max(y1, y2) + 5;
      if (list.length) {
        doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: "striped",
          head: [["Fornitore / Offerta", "Prezzo energia", "CCV/anno", "Bolletta periodo", "Risparmio periodo", "Risparmio annuo"]],
          body: list.map(r => [pt(`${r.offerta.azienda}\n${r.offerta.nome}\n${r.offerta.tipologia}${c === "luce" ? " · " + r.offerta.fascia : ""}`), pt(prezzoTesto(r, c)),
            eur(r.ccv), eur(r.nuovaBollettaPeriodo), eur(r.risparmioPeriodo), eur(r.risparmioAnnuo)].map(pt)),
          headStyles: { fillColor: [23, 33, 43], fontSize: 8.5 }, styles: { fontSize: 8.5, cellPadding: 1.8, valign: "middle" },
          columnStyles: { 0: { cellWidth: 52 }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" }, 5: { halign: "right", fontStyle: "bold" } } });
        y = doc.lastAutoTable.finalY + 8;
      }
    }
    if (totAnnuo > 0 && P.luce.attiva && P.gas.attiva) {
      if (y > 260) { doc.addPage(); y = 18; }
      doc.setFillColor(231, 245, 236); doc.roundedRect(M, y, W - 2 * M, 12, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...ACC);
      doc.text(pt(`Risparmio totale stimato luce + gas: ${eur(totAnnuo)} all'anno`), W / 2, y + 7.8, { align: "center" });
      y += 18;
    }
    if (P.note) {
      if (y > 250) { doc.addPage(); y = 18; }
      doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: "plain", head: [["Note"]], body: [[pt(P.note)]], headStyles: { fontSize: 10 }, styles: { fontSize: 9.5 } });
      y = doc.lastAutoTable.finalY + 6;
    }
    const disc = pt(`Stima calcolata sui consumi della bolletta fornita, riportati su base annua, con le componenti regolate ARERA vigenti, accise e IVA ${pct(catalogo("luce").cfg.iva)}${SEG === "privati" ? " (uso domestico)" : ""}. ` +
      `Per le offerte a prezzo variabile si usa ${P.filtri.indiceModo === "ultimo" ? "l'ultimo valore mensile pubblicato" : P.filtri.indiceModo === "ultimi12" ? "la media degli ultimi 12 mesi" : P.filtri.indiceModo === "manuale" ? "il valore indicato" : "la media del periodo di fatturazione"} dell'indice PUN/PSV: l'importo reale dipenderà dall'andamento futuro dei prezzi all'ingrosso. ` +
      `Le condizioni economiche sono quelle in vigore alla data del preventivo e sono soggette alla validità dell'offerta. Documento non contrattuale.`);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...GR);
    const lines = doc.splitTextToSize(disc, W - 2 * M);
    if (y + lines.length * 3.4 > 285) { doc.addPage(); y = 18; }
    doc.text(lines, M, y);
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFontSize(7.5); doc.setTextColor(...GR); doc.text(`Pagina ${i} di ${n}`, W - M, 292, { align: "right" }); }
    return doc.output("blob");
  }

  async function scaricaPdf() {
    const blob = await creaPdfBlob();
    if (!blob || blob.size < 1500) throw new Error("PDF generato vuoto");
    if (Store.mode === "online") {
      const downloads = await window.claude.use("downloads");
      if (!downloads) throw new Error("Il download non è disponibile in questa visualizzazione.");
      await downloads.save({ filename: nomeFile(), data: blob });
    } else {
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nomeFile(); document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
  }

  /* ---------- Invio del preventivo al cliente via email ---------- */
  const emailOk = s => /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(s);
  function testoEmail() {
    const S = Store.data.settings, cl = P.cliente, righe = [];
    for (const c of ["luce", "gas"]) {
      const k = ultimo[c]; if (!P[c].attiva || !k || k.errs.length) continue;
      const b = offerteSelezionate(c)[0];
      if (b && b.risparmioAnnuo > 0) righe.push(`- ${c === "luce" ? "Energia elettrica" : "Gas naturale"}: risparmio stimato di circa ${eur(b.risparmioAnnuo)} all'anno con l'offerta ${b.offerta.azienda} ${b.offerta.nome}.`);
    }
    return `Gentile ${P.crm?.referente || cl.ragione_sociale || "Cliente"},

come concordato, le invio in allegato la nostra proposta per le forniture di ${cl.ragione_sociale || "Vostra azienda"}, elaborata sui dati dell'ultima bolletta.
${righe.length ? "\n" + righe.join("\n") + "\n" : ""}
Nel documento trova il confronto con la situazione attuale e il dettaglio delle offerte. Le condizioni sono valide fino alla scadenza indicata per ciascuna offerta.

Resto a disposizione per qualsiasi chiarimento e per procedere con l'attivazione.

Cordiali saluti
${S.firma || S.agente || ""}`.trim();
  }
  const b64 = async blob => { const u8 = new Uint8Array(await blob.arrayBuffer()); let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
  const htmlDaTesto = t => `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5">${esc(t).replace(/\n/g, "<br>")}</div>`;

  async function inviaAlCliente() {
    if (!P.luce.attiva && !P.gas.attiva || !["luce", "gas"].some(c => P[c].attiva && ultimo[c] && !ultimo[c].errs.length)) { toast("Inserisci prima i dati della bolletta"); return; }
    crmDefault(P);
    const S = Store.data.settings, mitt = S.mittente || "energia@alcabroker.it";
    const gmail = Store.mode === "online" && Store.isOwner ? await window.claude.use("mcp").catch(() => null) : null;
    const oggetto = `Proposta di risparmio energetico – ${P.cliente.ragione_sociale || "preventivo"}`;
    dialog("Invia il preventivo al cliente", `
      <div class="fields">
        <label class="f full">${P.origine?.emailRisposta ? "Destinatario (email indicata per la risposta)" : "Email del cliente"}<input id="em-to" inputmode="email" value="${esc(P.origine?.emailRisposta || P.crm.email)}" placeholder="cliente@azienda.it"></label>
        ${P.origine?.emailRisposta && P.crm.email && P.crm.email !== P.origine.emailRisposta ? `<div class="small muted full">Email del cliente in scheda: ${esc(P.crm.email)}</div>` : ""}
        <label class="f full">Copia (facoltativa)<input id="em-cc" inputmode="email" placeholder="separate da virgola"></label>
        <label class="f full">Oggetto<input id="em-sub" value="${esc(oggetto)}"></label>
        <label class="f full">Messaggio<textarea id="em-body" rows="11">${esc(testoEmail())}</textarea></label>
      </div>
      <div class="small muted" style="margin-top:8px">📎 In allegato: <b>${esc(nomeFile())}</b> (il PDF del preventivo con le offerte selezionate)</div>
      ${gmail ? `<div class="alert info small" style="margin-top:8px">La bozza viene creata nella tua casella Gmail aziendale e parte da <b>${esc(mitt)}</b>: aprila, controlla e premi Invia.</div>`
        : `<div class="alert info small" style="margin-top:8px">${Store.mode === "online" && !Store.isOwner ? "L'invio da " + esc(mitt) + " è riservato al titolare." : "Da questo computer non posso creare la bozza in Gmail."} Con il pulsante qui sotto scarico il PDF e apro la mail già scritta: allega il file scaricato e invia da <b>${esc(mitt)}</b>.</div>`}
      <div class="status" id="em-status"></div>`,
      [{ label: "Chiudi" },
       ...(gmail ? [{ label: "Scarica PDF e apri email", onClick: () => emailManuale() }] : []),
       { label: gmail ? "✉️ Crea bozza in Gmail" : "✉️ Scarica PDF e apri email", primary: true, onClick: () => gmail ? bozzaGmail(gmail, mitt) : emailManuale() }]);
  }

  function leggiCampiEmail() {
    const to = $("#em-to").value.trim(), cc = $("#em-cc").value.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const st = $("#em-status");
    if (!emailOk(to)) { st.className = "status err"; st.textContent = "Inserisci un indirizzo email valido per il cliente."; $("#em-to").focus(); return null; }
    if (cc.some(x => !emailOk(x))) { st.className = "status err"; st.textContent = "Controlla gli indirizzi in copia."; return null; }
    return { to, cc, sub: $("#em-sub").value.trim(), body: $("#em-body").value };
  }
  /* stato dell'email: "preparata" (programma di posta aperto, invio NON confermato), "bozza" (solo con l'id restituito da Gmail),
     "manuale" (l'operatore dichiara di averla inviata: dichiarazione tracciata, distinta da una conferma del servizio) */
  async function registraInvio(to, evento, tipo, conferma) {
    if (to !== P.origine?.emailRisposta) P.crm.email = to;   // l'email di risposta (agente/segnalatore) non sostituisce quella del cliente
    P.email = Object.assign({}, P.email, { stato: { preparata: "Email preparata (invio non confermato)", bozza: "Bozza creata", manuale: "Invio dichiarato dall'operatore" }[tipo], a: to, at: new Date().toISOString(), conferma: conferma || null });
    if (tipo === "manuale" && STATI.indexOf(P.crm.stato) < STATI.indexOf("Preventivo inviato")) P.crm.stato = "Preventivo inviato";
    P.crm.statoCodice = SP.codice[P.crm.stato];
    await salvaNelCrm(evento).catch(e => console.warn("CRM", e));
    if (Store.mode === "server" && P.preventivoId) {
      const nuovo = { preparata: "email_preparata", bozza: "bozza_creata", manuale: "invio_dichiarato_manualmente" }[tipo];
      await Server.rpc("stato_email_preventivo", { prev: P.preventivoId, nuovo, conferma: conferma || null }).catch(e => toast("Stato email non registrato: " + e.message));
    }
    if (P.origine?.richiestaId && tipo === "manuale") await aggiornaRichiesta(P.origine.richiestaId, "Risposta inviata", `Preventivo inviato a ${to} (dichiarato dall'operatore)`);
  }
  function chiediConfermaInvio(to) {
    dialog("Hai inviato l'email?", `<p>Il programma di posta è stato aperto con la mail per <b>${esc(to)}</b>. L'app non può sapere se è partita.</p><p>Conferma solo dopo averla inviata davvero: la dichiarazione resta nello storico con il tuo nome.</p>`,
      [{ label: "Non ancora" }, { label: "Sì, l'ho inviata", primary: true, onClick: async () => { await registraInvio(to, `Invio a ${to} dichiarato dall'operatore`, "manuale"); toast("Invio registrato"); } }]);
  }

  async function bozzaGmail(mcp, mitt) {
    const f = leggiCampiEmail(); if (!f) return false;
    const st = $("#em-status"), btns = $$("#dlg-foot button"); btns.forEach(b => b.disabled = true);
    st.className = "status"; st.innerHTML = `<span class="spinner"></span>Creo il PDF e la bozza in Gmail…`;
    try {
      await salvaNelCrm();   // assegna il riferimento prima di creare il PDF
      const blob = await creaPdfBlob();
      const input = { to: [f.to], subject: f.sub, body: f.body, htmlBody: htmlDaTesto(f.body), includeSignature: !Store.data.settings.firma,
        attachments: [{ filename: nomeFile(), mimeType: "application/pdf", content: await b64(blob) }] };
      if (f.cc.length) input.cc = f.cc;
      const r = await mcp.callTool("Gmail", "create_draft", input);
      const url = r?.payload?.viewUrl || r?.payload?.draft?.viewUrl || "https://mail.google.com/mail/#drafts";
      const draftId = r?.payload?.id || r?.payload?.draftId || r?.payload?.draft?.id || null;
      // "Bozza creata" solo con la conferma di Gmail; altrimenti resta "preparata"
      if (draftId) await registraInvio(f.to, `Bozza Gmail creata per ${f.to} (id ${draftId})`, "bozza", String(draftId));
      else await registraInvio(f.to, `Richiesta di bozza a Gmail per ${f.to} senza conferma: controlla tra le bozze`, "preparata");
      st.className = "status ok";
      st.innerHTML = `✓ Bozza creata con il PDF allegato. <a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><b>Apri la bozza in Gmail</b></a>, controlla che il mittente sia ${esc(mitt)} e premi Invia.`;
      $$("#dlg-foot button").forEach(b => { b.disabled = false; }); $$("#dlg-foot button").slice(1).forEach(b => b.hidden = true);
      toast("Bozza creata in Gmail");
      return false;   // lascia aperta la finestra per il link
    } catch (e) {
      const m = {
        server_not_connected: "Gmail non è collegato: aggiungilo in claude.ai → Impostazioni → Connettori, con l'account aziendale.",
        needs_reauth: "Il collegamento a Gmail è scaduto: ricollegalo in claude.ai → Impostazioni → Connettori.",
        not_in_manifest: "Non hai autorizzato questa pagina a usare Gmail. Puoi riattivarlo dal menu Autorizzazioni dell'artifact.",
        approval_required: "Serve la tua approvazione per creare la bozza: riprova e premi Consenti.",
        selection_required: "Hai più account Gmail collegati: scegli quello aziendale quando richiesto e riprova.",
        blocked_by_policy: "La tua organizzazione non permette di usare Gmail da questa pagina.",
        server_unavailable: "Gmail non risponde in questo momento. Controlla tra le bozze prima di riprovare: potrebbe essere stata creata.",
        upstream_error: "Gmail non ha risposto. Controlla tra le bozze prima di riprovare: potrebbe essere stata creata.",
        tool_error: "Gmail ha rifiutato la bozza: " + (e.message || "")
      }[e && e.code];
      st.className = "status err"; st.textContent = m || ("Bozza non creata: " + (e.message || e.code || "errore"));
      btns.forEach(b => b.disabled = false);
      return false;
    }
  }

  async function emailManuale() {
    const f = leggiCampiEmail(); if (!f) return false;
    const st = $("#em-status");
    try {
      await registraInvio(f.to, `Email preparata nel programma di posta per ${f.to} (invio non confermato)`, "preparata");
      await scaricaPdf();
      const q = new URLSearchParams(); if (f.cc.length) q.set("cc", f.cc.join(",")); q.set("subject", f.sub); q.set("body", f.body + "\n\n[Allegare il PDF " + nomeFile() + "]");
      const href = `mailto:${encodeURIComponent(f.to)}?${q.toString().replace(/\+/g, "%20")}`;
      st.className = "status ok";
      st.innerHTML = `✓ PDF scaricato. <a href="${esc(href)}" target="_blank" rel="noopener"><b>Apri la mail già scritta</b></a>, allega il PDF e invia da ${esc(Store.data.settings.mittente || "energia@alcabroker.it")}.`;
      const a = document.createElement("a"); a.href = href; a.target = "_blank"; a.rel = "noopener"; document.body.appendChild(a); a.click(); a.remove();
      st.insertAdjacentHTML("beforeend", ` <button class="btn sm" id="em-inviata" type="button">Ho inviato l'email</button>`);
      $("#em-inviata").onclick = () => { $("#dlg").close(); setTimeout(() => chiediConfermaInvio(f.to), 0); };
    } catch (e) {
      if (!(e && (e.code === "declined" || e.code === "cancelled"))) { st.className = "status err"; st.textContent = "Errore: " + (e.message || e.code); }
    }
    return false;
  }

  $("#btn-invia").onclick = () => inviaAlCliente();

  function anteprimaPdf() {
    const bottoni = [{ label: "Chiudi" }, { label: "✉️ Invia al cliente", onClick: () => { setTimeout(inviaAlCliente, 0); return true; } }];
    if (Store.mode === "local") bottoni.push({ label: "🖨️ Stampa", onClick: () => { $("#dlg").close(); setTimeout(() => window.print(), 50); return false; } });
    bottoni.push({ label: "⬇️ Scarica PDF", primary: true, onClick: async () => {
      const btns = $$("#dlg-foot button"); btns.forEach(b => b.disabled = true);
      btns.at(-1).textContent = "Creo il PDF…";
      try {
        await scaricaPdf();
        toast("PDF pronto · preventivo salvato nel CRM");
        return true;
      } catch (e) {
        if (e && (e.code === "cancelled" || e.code === "declined")) return false;
        toast("PDF non creato: " + (e.message || e.code || "errore"));
        return false;
      } finally { btns.forEach(b => b.disabled = false); btns.at(-1).textContent = "⬇️ Scarica PDF"; }
    } });
    dialog("Anteprima preventivo", `<div class="pdfdoc pdf-preview">${$("#print-area").innerHTML}</div>`, bottoni);
  }

  /* ------------------------------------------------ offerte (catalogo) ------------------------------------------------ */
  segmented("#seg-off", c => { commOff = c; renderOfferte(); });
  segmented("#seg-cat", c => { catOff = c; renderOfferte(); });
  let segOff = "business";
  segmented("#seg-segoff", c => { segOff = c; renderOfferte(); });
  function listaOfferte(D, c) {
    if (segOff === "privati") {
      if (catOff === "mercato") return c === "luce" ? (D.mercatoLucePrivati ??= []) : (D.mercatoGasPrivati ??= []);
      return c === "luce" ? (D.offerteLucePrivati ??= []) : (D.offerteGasPrivati ??= []);
    }
    if (catOff === "mercato") return c === "luce" ? (D.mercatoLuce ??= []) : (D.mercatoGas ??= []);
    return c === "luce" ? D.offerteLuce : D.offerteGas;
  }
  function renderOfferte() {
    const vedeMkt = Store.profilo?.vede_mercato !== false, bMkt = document.querySelector('#seg-cat [data-c="mercato"]');
    if (bMkt) bMkt.hidden = !vedeMkt;
    if (!vedeMkt && catOff === "mercato") { catOff = "nostre"; setSeg("#seg-cat", "nostre"); }
    const c = commOff, D = Store.data, L = listaOfferte(D, c), oggi = E.todayISO(), mkt = catOff === "mercato", priv = segOff === "privati";
    $("#off-info").innerHTML = priv
      ? (mkt ? `Offerte per la casa dei principali fornitori (mercato residenziale), raccolte con una ricerca sul web ogni 3 giorni${D.mercatoPrivatiAggiornato ? ` (ultimo controllo ${dIt(D.mercatoPrivatiAggiornato)})` : ""}. Usate nel Preventivo Privati (dimostrativo).`
        : `I nostri accordi per i privati. Non ne abbiamo ancora: quando li firmiamo si caricano da Impostazioni → Carica nuove offerte con AI → «Accordi privati», oppure con «＋ Nuova offerta».`)
      : mkt
      ? `Offerte business dei fornitori che non abbiamo, raccolte con una ricerca sul web ogni 3 giorni${D.mercatoAggiornato ? ` (ultimo controllo ${dIt(D.mercatoAggiornato)})` : ""}. Servono come confronto nei risultati e non entrano nel preventivo.`
      : "Modifica direttamente le celle. Le offerte variabili usano PUN/PSV + spread; le fisse il prezzo indicato.";
    $("#btn-import-xlsx").hidden = mkt || priv || !Store.canEdit;
    const colsMkt = c === "luce"
      ? [["azienda", "Azienda", "w-m"], ["nome", "Offerta", "w-l"], ["fine", "Valida fino", "date"], ["tipologia", "Tipologia", ["Fissa", "Variabile"]], ["fascia", "Fascia", ["Monoraria", "Bioraria", "Trioraria"]],
         ["p1", "Prezzo F0/F1 €/kWh", "n"], ["p2", "Prezzo F2/F23", "n"], ["spread", "Spread €/kWh", "n"], ["ccv", "CCV €/anno", "n"], ["restrizioni", "Condizioni", "w-m"], ["note", "Note", "w-l"], ["fonte", "Fonte (link)", "w-l"], ["verificata", "Verificata il", "date"]]
      : [["azienda", "Azienda", "w-m"], ["nome", "Offerta", "w-l"], ["fine", "Valida fino", "date"], ["tipologia", "Tipologia", ["Fissa", "Variabile"]],
         ["p1", "Prezzo €/Smc", "n"], ["spread", "Spread €/Smc", "n"], ["ccv", "CCV €/anno", "n"], ["restrizioni", "Condizioni", "w-m"], ["note", "Note", "w-l"], ["fonte", "Fonte (link)", "w-l"], ["verificata", "Verificata il", "date"]];
    let cols = mkt ? colsMkt : c === "luce"
      ? [["azienda", "Azienda", "w-m"], ["nome", "Offerta", "w-l"], ["inizio", "Inizio", "date"], ["fine", "Fine", "date"], ["tipologia", "Tipologia", ["Fissa", "Variabile"]], ["fascia", "Fascia", ["Monoraria", "Bioraria", "Trioraria"]],
         ["p1", "Prezzo F0/F1 €/kWh", "n"], ["p2", "Prezzo F2/F23", "n"], ["p3", "Prezzo F3", "n"], ["spread", "Spread €/kWh", "n"], ["extra", "Costi/sconti agg. €/kWh", "n"], ["ccv", "CCV €/anno", "n"],
         ["operazioni", "Operazioni", "w-l"], ["pagamento", "Pagamento", "w-m"], ["canali", "Canali", "w-m"], ["restrizioni", "Tipologia offerta", "w-m"], ["contratto", "Contratto", ["", "single", "dual", "entrambi"]], ["accordoAl", "Accordo Alca fino al", "date"], ["attivabileAlca", "Attivabile tramite Alca", ["", "si", "no"]], ["statoVerifica", "Stato verifica", ["", "verificata", "da_verificare"]], ["note", "Note", "w-m"]]
      : [["azienda", "Azienda", "w-m"], ["nome", "Offerta", "w-l"], ["inizio", "Inizio", "date"], ["fine", "Fine", "date"], ["tipologia", "Tipologia", ["Fissa", "Variabile"]],
         ["p1", "Prezzo €/Smc", "n"], ["spread", "Spread €/Smc", "n"], ["extra", "Costi/sconti agg. €/Smc", "n"], ["ccv", "CCV €/anno", "n"],
         ["operazioni", "Operazioni", "w-l"], ["pagamento", "Pagamento", "w-m"], ["canali", "Canali", "w-m"], ["restrizioni", "Tipologia offerta", "w-m"], ["contratto", "Contratto", ["", "single", "dual", "entrambi"]], ["accordoAl", "Accordo Alca fino al", "date"], ["attivabileAlca", "Attivabile tramite Alca", ["", "si", "no"]], ["statoVerifica", "Stato verifica", ["", "verificata", "da_verificare"]], ["note", "Note", "w-m"]];
    // senza il permesso «prezzi» il catalogo mostra solo cosa c'è (stato, azienda, offerta, date, tipologia, fascia): per la stima si carica la bolletta.
    // È una scelta di presentazione: il calcolo dei preventivi nel browser usa comunque il catalogo completo.
    const prezzi = !Store.profilo || Store.profilo.vede_prezzi !== false;
    if (!prezzi) {
      cols = cols.filter(([k]) => ["azienda", "nome", "inizio", "fine", "tipologia", "fascia"].includes(k));
      $("#off-info").innerHTML = "Prezzi e condizioni delle offerte sono riservati. <b>Carica la bolletta del cliente in Preventivo</b>: il confronto ti mostra le offerte più convenienti e il risparmio stimato.";
    }
    const cell = (o, [k, , t]) => {
      const v = o[k] ?? "";
      if (Array.isArray(t)) return `<select data-f="${k}">${t.map(x => `<option value="${x}" ${x === v ? "selected" : ""}>${x || "auto"}</option>`).join("")}</select>`;
      if (t === "date") return `<input type="date" data-f="${k}" value="${esc(v)}">`;
      if (t === "n") return `<input data-f="${k}" data-num="1" inputmode="decimal" value="${v === "" ? "" : String(v).replace(".", ",")}" style="width:90px">`;
      return `<input data-f="${k}" class="${t}" value="${esc(v)}">`;
    };
    $("#off-table").innerHTML = `<div class="table-wrap" style="max-height:70vh;overflow:auto"><table class="edit-table"><thead><tr><th>Stato</th>${cols.map(x => `<th>${x[1]}</th>`).join("")}${prezzi ? "<th>Chiusa</th><th>Attiva</th><th></th>" : ""}</tr></thead><tbody>
      ${L.map(o => { const st = E.stato(o, oggi); return `<tr data-id="${o.id}"><td><span class="pill ${st.code === "attiva" ? "good" : st.code === "scadenza" ? "warn" : "bad"}">${st.label}</span></td>${cols.map(cl => `<td>${cell(o, cl)}</td>`).join("")}
        ${prezzi ? `<td><input type="checkbox" data-f="chiusa" ${o.chiusa ? "checked" : ""}></td><td><input type="checkbox" data-f="attiva" ${!o.disattivata ? "checked" : ""}></td>
        <td><button class="btn sm danger" data-del-off="${o.id}">🗑</button></td>` : ""}</tr>`; }).join("")}
      </tbody></table></div>`;
    $$("#off-table [data-f]").forEach(el => el.addEventListener("change", () => {
      const o = L.find(x => x.id === el.closest("tr").dataset.id), k = el.dataset.f;
      if (k === "attiva") o.disattivata = !el.checked;
      else if (el.type === "checkbox") o[k] = el.checked;
      else if (el.dataset.num) o[k] = num(el.value);
      else o[k] = el.value || (k === "contratto" ? null : "");
      Store.save(); ricalcola(); updLabel();
      if (["inizio", "fine", "chiusa"].includes(k)) renderOfferte();
    }));
    if (!Store.canEdit) $$("#off-table input, #off-table select, #off-table button").forEach(x => x.disabled = true);
    $$("#off-table [data-del-off]").forEach(b => b.onclick = () => {
      const o = L.find(x => x.id === b.dataset.delOff);
      dialog("Eliminare l'offerta?", `<p>${esc(o.azienda)} · ${esc(o.nome)}</p>`, [{ label: "Annulla" }, { label: "Elimina", primary: true, onClick: () => {
        L.splice(L.indexOf(o), 1); Store.save(); renderOfferte(); ricalcola(); updLabel(); } }]);
    });
  }
  $("#btn-add-off").onclick = () => {
    const D = Store.data;
    const nuova = catOff === "mercato" ? Store.newOffertaMercato(commOff) : commOff === "luce" ? Store.newOffertaLuce() : Store.newOffertaGas();
    if (segOff === "privati") nuova.privati = true;
    listaOfferte(D, commOff).unshift(nuova);
    Store.save(); renderOfferte(); updLabel();
  };

  /* import Excel */
  $("#btn-import-xlsx").onclick = () => $("#xlsx-input").click();
  $("#xlsx-input").onchange = async e => {
    const fl = Array.from(e.target.files); e.target.value = "";
    if (!fl.length) return;
    toast("Lettura dei file Excel…");
    const piani = [], errori = [];
    for (const f of fl) { try { piani.push(await Importer.analizza(f)); } catch (err) { errori.push(err.message); } }
    const body = piani.map(p => {
      const s = p.tipo === "luce" ? p.pun : p.psv, last = s.at(-1);
      return `<div class="alert info"><b>${esc(p.file)}</b> → calcolatore <b>${p.tipo.toUpperCase()}</b><ul>
        <li>${p.offerte.length} offerte (sostituiranno le ${p.tipo === "luce" ? Store.data.offerteLuce.length : Store.data.offerteGas.length} attuali)</li>
        <li>Storico ${p.tipo === "luce" ? "PUN" : "PSV"}: ${s.length} mesi${last ? `, ultimo ${String(last.m).padStart(2, "0")}/${last.y}` : ""}</li>
        <li>Componenti Autorità aggiornate</li></ul></div>`;
    }).join("") + errori.map(x => `<div class="alert warn">${esc(x)}</div>`).join("");
    dialog("Importa calcolatori", body || "<p>Nessun file valido.</p>", piani.length ? [{ label: "Annulla" }, { label: "Importa", primary: true, onClick: () => {
      piani.forEach(p => Importer.applica(p)); updLabel(); renderOfferte(); ricalcola(); toast("Catalogo aggiornato"); } }] : null);
  };

  /* ------------------------------------------------ indici & componenti ------------------------------------------------ */
  function renderIndici() {
    const D = Store.data;
    $$("[data-fc]").forEach(el => { el.value = String(D.forecast[el.dataset.fc] ?? "").replace(".", ","); });
    const map = new Map();
    D.pun.forEach(r => map.set(r.y * 12 + r.m, { y: r.y, m: r.m, pun: r }));
    D.psv.forEach(r => { const k = r.y * 12 + r.m; const x = map.get(k) || { y: r.y, m: r.m }; x.psv = r; map.set(k, x); });
    const rows = [...map.entries()].sort((a, b) => b[0] - a[0]).map(e => e[1]);
    const inp = (v, k, kind) => `<input data-ind="${kind}" data-key="${k}" inputmode="decimal" value="${v == null ? "" : String(v).replace(".", ",")}" style="width:90px">`;
    $("#tbl-indici").innerHTML = `<thead><tr><th>Mese</th><th>PUN F0</th><th>PUN F1</th><th>PUN F23</th><th>PSV €/Smc</th></tr></thead><tbody>
      ${rows.map(r => `<tr data-ym="${r.y}-${r.m}"><td>${String(r.m).padStart(2, "0")}/${r.y}</td>
        <td>${inp(r.pun?.f0, "f0", "pun")}</td><td>${inp(r.pun?.f1, "f1", "pun")}</td><td>${inp(r.pun?.f23, "f23", "pun")}</td><td>${inp(r.psv?.psv, "psv", "psv")}</td></tr>`).join("")}</tbody>`;
    $$("#tbl-indici [data-ind]").forEach(el => el.onchange = () => {
      const [y, m] = el.closest("tr").dataset.ym.split("-").map(Number), arr = el.dataset.ind === "pun" ? D.pun : D.psv;
      let r = arr.find(x => x.y === y && x.m === m);
      if (!r) { r = { y, m }; arr.push(r); arr.sort((a, b) => a.y * 12 + a.m - (b.y * 12 + b.m)); }
      r[el.dataset.key] = num(el.value); Store.save(); ricalcola();
    });
    $("#comp-luce").value = JSON.stringify(D.luce, null, 2);
    $("#comp-gas").value = JSON.stringify(D.gas, null, 2);
    $("#comp-luceDom").value = JSON.stringify(D.luceDom, null, 2);
    $("#comp-gasDom").value = JSON.stringify(D.gasDom, null, 2);
    if (!Store.canEdit) $$("#view-indici input, #view-indici textarea").forEach(x => { x.disabled = true; x.readOnly = true; });
  }
  $$("[data-fc]").forEach(el => el.onchange = () => { Store.data.forecast[el.dataset.fc] = num(el.value); Store.save(); ricalcola(); });
  $("#btn-add-mese").onclick = () => {
    const D = Store.data, last = [...D.pun, ...D.psv].reduce((a, r) => Math.max(a, r.y * 12 + r.m), 0);
    const k = last + 1, y = Math.floor((k - 1) / 12), m = k - y * 12;
    D.pun.push({ y, m, f0: null, f1: null, f23: null }); D.psv.push({ y, m, psv: null }); Store.save(); renderIndici();
  };
  $$("[data-save-comp]").forEach(b => b.onclick = () => {
    const c = b.dataset.saveComp;
    try { const v = JSON.parse($("#comp-" + c).value); Store.data[c] = v; Store.save(); ricalcola(); toast("Componenti salvate"); }
    catch (e) { dialog("JSON non valido", `<p>${esc(e.message)}</p>`); }
  });

  /* ------------------------------------------------ impostazioni ------------------------------------------------ */
  function renderSettings() {
    const s = Store.data.settings;
    $("#set-key").value = s.apiKey || ""; $("#set-model").value = s.model; $("#set-effort").value = s.effort;
    $("#set-remember").checked = s.rememberKey !== false; $("#set-agente").value = s.agente || "";
    $("#set-mittente").value = s.mittente || ""; $("#set-firma").value = s.firma || "";
  }
  $("#btn-save-set").onclick = () => {
    const s = Store.data.settings;
    s.apiKey = $("#set-key").value.trim(); s.model = $("#set-model").value; s.effort = $("#set-effort").value;
    s.rememberKey = $("#set-remember").checked; s.agente = $("#set-agente").value;
    s.mittente = $("#set-mittente").value.trim(); s.firma = $("#set-firma").value;
    Store.save(); toast("Impostazioni salvate");
  };
  $("#btn-export").onclick = async () => {
    const txt = await Store.exportJSON(), filename = `comparatore-backup-${E.todayISO()}.json`;
    if (Store.mode === "online") {
      const dl = await window.claude.use("downloads");
      if (!dl) { toast("Download non disponibile in questa visualizzazione"); return; }
      try { await dl.save({ filename, data: txt }); } catch (e) { if (e?.code !== "declined") toast("Backup non scaricato"); }
      return;
    }
    const blob = new Blob([txt], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  $("#btn-import-json").onclick = () => $("#json-input").click();
  $("#json-input").onchange = async e => {
    const f = e.target.files[0]; e.target.value = ""; if (!f) return;
    try { await Store.importJSON(await f.text()); updLabel(); ricalcola(); renderSettings(); toast("Backup ripristinato"); }
    catch (err) { dialog("Ripristino non riuscito", `<p>${esc(err.message)}</p>`); }
  };
  $("#btn-reset").onclick = () => dialog("Ripristinare il catalogo originale?", "<p>Offerte, indici PUN/PSV e componenti tornano ai valori dei calcolatori del 17/11/2026. Le pratiche salvate e le impostazioni restano.</p>",
    [{ label: "Annulla" }, { label: "Ripristina", primary: true, onClick: async () => { try { await Store.resetCatalogo(); } catch (e) { toast(e.message); return; } updLabel(); ricalcola(); renderSettings(); toast("Catalogo ripristinato"); } }]);

  /* ------------------------------------------------ import offerte con AI ------------------------------------------------ */
  let aiFiles = [];
  const aiDrop = $("#aioff-drop"), aiIn = $("#aioff-input");
  aiDrop.onclick = () => aiIn.click();
  aiDrop.ondragover = e => { e.preventDefault(); aiDrop.classList.add("over"); };
  aiDrop.ondragleave = () => aiDrop.classList.remove("over");
  aiDrop.ondrop = e => { e.preventDefault(); aiDrop.classList.remove("over"); aiFiles.push(...e.dataTransfer.files); renderAiFiles(); };
  aiIn.onchange = () => { aiFiles.push(...aiIn.files); aiIn.value = ""; renderAiFiles(); };
  function renderAiFiles() {
    $("#aioff-files").innerHTML = aiFiles.map((f, i) => `<li><span>📄 ${esc(f.name)} <span class="muted small">${(f.size / 1024).toFixed(0)} KB</span></span><button class="btn sm" data-rm="${i}">✕</button></li>`).join("");
    $$("#aioff-files [data-rm]").forEach(b => b.onclick = () => { aiFiles.splice(+b.dataset.rm, 1); renderAiFiles(); });
    $("#aioff-go").disabled = !aiFiles.length && !$("#aioff-testo").value.trim();
  }
  $("#aioff-testo").addEventListener("input", renderAiFiles);
  /* file + eventuale testo incollato (listini copiati da portali, email…) */
  function fileImport() {
    const txt = $("#aioff-testo").value.trim();
    return txt ? [...aiFiles, new File([txt], "testo-incollato.txt", { type: "text/plain" })] : aiFiles;
  }

  const CAMPI = { luce: ["azienda", "nome", "inizio", "fine", "tipologia", "fascia", "p1", "p2", "p3", "spread", "ccv", "ccvScontata", "contratto", "operazioni", "pagamento", "canali", "restrizioni", "note"],
    gas: ["azienda", "nome", "inizio", "fine", "tipologia", "p1", "spread", "ccv", "ccvScontata", "contratto", "operazioni", "pagamento", "canali", "restrizioni", "note"] };
  const ETICHETTE = { azienda: "Fornitore", nome: "Offerta", inizio: "Inizio", fine: "Fine", tipologia: "Tipologia", fascia: "Fascia", p1: "Prezzo F0/F1", p2: "Prezzo F2/F23", p3: "Prezzo F3",
    spread: "Spread", ccv: "CCV €/anno", ccvScontata: "CCV con sconti €/anno", contratto: "Contratto", operazioni: "Operazioni", pagamento: "Pagamento", canali: "Canali", restrizioni: "Restrizioni", note: "Note" };
  const norm = s => String(s || "").toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
  const fmtV = (k, v) => v == null || v === "" ? "—" : ["inizio", "fine"].includes(k) ? dIt(v) : typeof v === "number" ? n2(v, ["ccv"].includes(k) ? 2 : 4) : esc(v);

  /* destinazioni dell'import offerte con AI */
  const NOMI_DEST = { nostre: "Le nostre offerte (aziende)", mercato: "Offerte di mercato (aziende)", "nostre-privati": "Accordi privati (residenziale)", "mercato-privati": "Mercato privati (residenziale)" };
  const isMktDest = d => d.startsWith("mercato");
  function listaDest(dest, c) {
    const D = Store.data, k = (isMktDest(dest) ? "mercato" : "offerte") + (c === "luce" ? "Luce" : "Gas") + (dest.endsWith("privati") ? "Privati" : "");
    return (D[k] ??= []);
  }
  function catalogoPerAI(dest) {
    const D = Store.data, righe = [];
    for (const c of ["luce", "gas"]) {
      const L = listaDest(dest, c);
      L.forEach(o => righe.push([o.id, c, o.azienda, o.nome, o.tipologia, c === "luce" ? o.fascia : "", o.tipologia === "Variabile" ? `spread ${o.spread}` : [o.p1, o.p2, o.p3].filter(x => x != null).join("/"), o.ccv, o.fine || ""].join(" | ")));
    }
    return righe.join("\n") || "(vuoto)";
  }

  /* confronta il risultato dell'AI con il catalogo e prepara le modifiche */
  function pianoModifiche(out, dest) {
    const D = Store.data, piano = [];
    for (const x of out.offerte || []) {
      const c = x.commodity === "gas" ? "gas" : "luce";
      const L = listaDest(dest, c);
      // controlli di plausibilità sulle unità
      for (const k of ["p1", "p2", "p3", "spread"]) {
        if (typeof x[k] !== "number") continue;
        if (c === "luce" && x[k] > 2) x[k] = x[k] / 1000;          // €/MWh → €/kWh
        if (c === "gas" && x[k] > 20) x[k] = x[k] / 100;           // c€/Smc → €/Smc
      }
      let o = (x.corrisponde_a && L.find(y => y.id === x.corrisponde_a)) || L.find(y => norm(y.azienda) === norm(x.azienda) && norm(y.nome) === norm(x.nome)) || null;
      let azione = x.azione === "chiudi" ? "chiudi" : o ? "aggiorna" : "nuova";
      if (azione === "chiudi" && !o) continue;
      const modifiche = [];
      if (azione === "chiudi") { if (!o.chiusa) modifiche.push(["chiusa", false, true]); }
      else for (const k of CAMPI[c]) {
        let v = x[k]; if (v === null || v === undefined || v === "") continue;
        if (k === "tipologia" && !["Fissa", "Variabile"].includes(v)) continue;
        if (k === "fascia" && !["Monoraria", "Bioraria", "Trioraria"].includes(v)) continue;
        const old = o ? o[k] : null;
        if (o && (old === v || (typeof v === "number" && typeof old === "number" && Math.abs(old - v) < 1e-9))) continue;
        modifiche.push([k, old, v]);
      }
      if (o && !modifiche.length) { piano.push({ c, azione: "invariata", o, x, modifiche, L }); continue; }
      piano.push({ c, azione, o, x, modifiche, L });
    }
    return piano;
  }

  function applicaPiano(piano, dest, nomiFile) {
    const oggi = E.todayISO();
    for (const p of piano) {
      if (p.azione === "invariata") { if (p.o && isMktDest(dest)) p.o.verificata = oggi; continue; }
      let o = p.o;
      if (!o) {
        o = isMktDest(dest) ? Store.newOffertaMercato(p.c) : p.c === "luce" ? Store.newOffertaLuce() : Store.newOffertaGas();
        if (isMktDest(dest)) o.fonte = "Import AI: " + nomiFile; if (dest.endsWith("privati")) o.privati = true;
        p.L.unshift(o);
      }
      for (const [k, , v] of p.modifiche) o[k] = v;
      if (isMktDest(dest)) o.verificata = oggi;
      if (p.azione === "aggiorna" && o.chiusa && !p.modifiche.some(m => m[0] === "chiusa")) o.chiusa = false;
    }
    if (dest === "mercato") Store.data.mercatoAggiornato = oggi; else if (dest === "mercato-privati") Store.data.mercatoPrivatiAggiornato = oggi; else if (dest === "nostre") Store.data.aggiornato = oggi;
    return Store.save();
  }

  $("#aioff-go").onclick = async () => {
    const st = $("#aioff-status"), btn = $("#aioff-go"), dest = $("#aioff-dest").value;
    if (Store.mode === "local" && !Store.data.settings.apiKey) { st.className = "status err"; st.textContent = "Inserisci prima la chiave API qui a sinistra e salva."; return; }
    btn.disabled = true; st.className = "status";
    const t0 = Date.now();
    try {
      // 1) i calcolatori Excel standard si importano senza AI (lettura esatta delle celle)
      const calcolatori = [], altri = [];
      for (const f of fileImport()) {
        if (dest === "nostre" && /\.(xlsx|xlsm|xls)$/i.test(f.name)) {
          try { calcolatori.push(await Importer.analizza(f)); continue; } catch (e) { /* non è un calcolatore: va all'AI */ }
        }
        altri.push(f);
      }
      let out = { offerte: [], avvisi: [] };
      if (altri.length) out = await AI.estraiOfferte(altri, Store.data.settings, catalogoPerAI(dest), NOMI_DEST[dest],
        m => st.innerHTML = `<span class="spinner"></span>${esc(m)}`);
      const piano = pianoModifiche(out, dest);
      st.className = "status ok"; st.textContent = `✓ Analisi completata in ${Math.round((Date.now() - t0) / 1000)} s.`;
      mostraPiano(piano, calcolatori, out.avvisi || [], dest, altri.map(f => f.name).join(", "));
    } catch (e) {
      st.className = "status err"; st.textContent = "Errore: " + e.message;
    } finally { btn.disabled = !aiFiles.length && !$("#aioff-testo").value.trim(); }
  };

  function mostraPiano(piano, calcolatori, avvisi, dest, nomiFile) {
    const cambi = piano.filter(p => p.azione !== "invariata"), inv = piano.length - cambi.length;
    const lbl = { nuova: '<span class="pill good">Nuova</span>', aggiorna: '<span class="pill warn">Aggiorna</span>', chiudi: '<span class="pill bad">Chiudi</span>' };
    const righe = cambi.map((p, i) => `<tr class="${p.azione === "nuova" ? "nuova" : "mod"}">
      <td><input type="checkbox" data-pi="${i}" checked></td><td>${lbl[p.azione]}<div class="small muted">${p.c}</div></td>
      <td><b>${esc(p.o?.azienda || p.x.azienda)}</b><div>${esc(p.o?.nome || p.x.nome)}</div></td>
      <td class="small">${p.modifiche.filter(m => !(p.azione === "nuova" && ["azienda", "nome"].includes(m[0]))).map(([k, a, b]) =>
        `<div><span class="muted">${ETICHETTE[k] || "Chiusa"}:</span> ${p.azione === "nuova" ? "" : `<span class="old">${fmtV(k, a)}</span>`}<b>${k === "chiusa" ? "sì" : fmtV(k, b)}</b></div>`).join("")}</td></tr>`).join("");
    const calc = calcolatori.map(p => `<div class="alert info"><b>${esc(p.file)}</b>: calcolatore ${p.tipo.toUpperCase()} riconosciuto, ${p.offerte.length} offerte, storico ${p.tipo === "luce" ? "PUN" : "PSV"} e componenti Autorità. <b>Sostituisce</b> il catalogo ${p.tipo} attuale (lettura esatta, senza AI).</div>`).join("");
    const body = calc + (avvisi.length ? `<div class="alert warn"><b>L'AI segnala:</b><ul>${avvisi.map(a => `<li>${esc(a)}</li>`).join("")}</ul></div>` : "") +
      (cambi.length ? `<p class="small muted">Catalogo: <b>${NOMI_DEST[dest]}</b> · ${cambi.filter(p => p.azione === "nuova").length} nuove · ${cambi.filter(p => p.azione === "aggiorna").length} da aggiornare · ${cambi.filter(p => p.azione === "chiudi").length} da chiudere${inv ? ` · ${inv} già uguali` : ""}. Togli la spunta a quelle che non vuoi applicare.</p>
        <div class="table-wrap ai-off-list"><table><thead><tr><th></th><th>Azione</th><th>Offerta</th><th>Dati</th></tr></thead><tbody>${righe}</tbody></table></div>`
        : (calc ? "" : `<p>${piano.length ? `Le ${piano.length} offerte trovate sono già aggiornate nel catalogo.` : "Nessuna offerta trovata nei documenti."}</p>`));
    const può = cambi.length || calcolatori.length;
    dialog("Offerte trovate", body, può ? [{ label: "Annulla" }, { label: "Applica al catalogo", primary: true, onClick: async () => {
      const scelte = cambi.filter((p, i) => $(`[data-pi="${i}"]`)?.checked);
      for (const p of calcolatori) await Importer.applica(p);
      // dopo un calcolatore le liste sono nuove: ricalcola il piano sulle liste aggiornate
      const finali = calcolatori.length ? pianoModifiche({ offerte: scelte.map(p => p.x) }, dest).filter(p => p.azione !== "invariata") : scelte;
      await applicaPiano(finali.concat(piano.filter(p => p.azione === "invariata")), dest, nomiFile);
      aiFiles = []; $("#aioff-testo").value = ""; renderAiFiles();
      updLabel(); ricalcola(); toast(`Catalogo aggiornato: ${finali.length} offerte${calcolatori.length ? " + calcolatori Excel" : ""}`);
    } }] : null);
  }

  /* ------------------------------------------------ avvio ------------------------------------------------ */
  function applicaPermessi() {
    const online = Store.mode === "online" || Store.mode === "server", ed = Store.canEdit;
    document.body.classList.toggle("server", Store.mode === "server");
    document.body.classList.toggle("online", online);
    document.body.classList.toggle("readonly", !ed);
    $$("[data-only-local]").forEach(el => el.hidden = online);
    $$("[data-only-online]").forEach(el => el.hidden = !online);
    $$("[data-only-editor]").forEach(el => el.hidden = !ed);
    renderBanner();
  }
  function renderBanner() {
    const el = $("#banner"); if (!el) return;
    let msg = "";
    if (Store.mode === "online") {
      if (Store.dbMissing) msg = "Accedi a claude.ai per vedere il catalogo offerte condiviso.";
      else if (Store.dbError) msg = "Il catalogo non è raggiungibile in questo momento. Ricarica la pagina tra poco.";
      else if (Store.catalogoVuoto || !Store.data.luce || !Store.data.gas) msg = Store.canEdit
        ? "Il catalogo condiviso è vuoto: vai in Offerte → Importa calcolatori Excel per caricarlo."
        : "Il catalogo offerte non è ancora stato pubblicato dal responsabile.";
      else if (Store.slow) msg = "Il catalogo potrebbe non essere aggiornato: connessione lenta.";
    }
    el.hidden = !msg; el.textContent = msg;
  }

  async function avvia() {
    $("#upd-label").textContent = "Caricamento catalogo…";
    if (window.Server && Server.attivo) await Server.avvia();   // accesso personale prima di qualsiasi dato
    await Store.init();
    if (window.Rete) await Rete.avvia({ dialog, toast, esc, renderPratiche: () => renderPratiche(), apriPratica: id => apriPraticaDaId(id) });
    Store.onChange = () => {
      updLabel(); renderBanner(); ricalcola();
      if ($("#view-offerte").classList.contains("active") && !document.activeElement?.closest?.("#off-table")) renderOfferte();
      if ($("#view-indici").classList.contains("active") && !document.activeElement?.closest?.("#view-indici")) renderIndici();
    };
    Store.onError = e => toast("Salvataggio non riuscito: " + (e.code === "invalid_argument" ? "non hai i permessi per modificare il catalogo" : e.code || "errore"));
    caricaCorrente();
    applicaPermessi();
    updLabel(); mostraComm(P.luce.attiva || !P.gas.attiva ? "luce" : "gas"); fillForm(); ricalcola();
  }
  avvia();

  window.App = { get pratica() { return P; }, ultimo: () => ultimo, applicaEstrazione, pianoModifiche, mostraPiano, creaPdfBlob };
})();
