/* Stato persistente.
   - Modalità "local" (index.html aperto dal PC): tutto in localStorage, catalogo iniziale da data.js.
   - Modalità "online" (pubblicato su claude.ai): catalogo condiviso nel database dell'artifact
     (lo modifica solo chi ha i permessi di modifica), pratiche private per ogni utente. */
(function () {
  const KEY = "cbp.data.v1";
  const SET_KEY = "cbp.settings.v1";
  const PR_KEY = "cbp.pratiche.v1";
  const E = () => window.Engine;
  let seq = 0;
  const uid = p => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;
  const CAT_DOCS = { luce: ["offerteLuce"], gas: ["offerteGas"], indici: ["pun", "psv", "forecast"], componenti: ["luce", "gas"], meta: ["aggiornato", "seedVersion"], mercato: ["mercatoLuce", "mercatoGas", "mercatoAggiornato"],
    privati: ["offerteLucePrivati", "offerteGasPrivati", "accordiPrivatiAggiornato"], mercatoPrivati: ["mercatoLucePrivati", "mercatoGasPrivati", "mercatoPrivatiAggiornato"], componentiDom: ["luceDom", "gasDom"] };
  /* percorso della pratica, dalla bolletta all'attivazione (codici uguali a quelli del database) */
  const STATI_PRATICA = [
    ["bolletta_ricevuta", "Bolletta ricevuta"], ["dati_da_completare", "Dati da completare"], ["analisi_completata", "Analisi completata"],
    ["preventivo_preparato", "Preventivo preparato"], ["preventivo_inviato", "Preventivo inviato"], ["da_ricontattare", "Da ricontattare"],
    ["proposta_accettata", "Proposta accettata"], ["documentazione_completa", "Documentazione completa"], ["richiesta_inoltrata", "Richiesta inoltrata"],
    ["attivazione_confermata", "Attivazione confermata"], ["rifiutata", "Rifiutata dal cliente"], ["annullata", "Annullata"],
    ["non_attivabile", "Non attivabile"], ["persa", "Persa"]];
  const STATO_LABEL = Object.fromEntries(STATI_PRATICA), STATO_CODICE = Object.fromEntries(STATI_PRATICA.map(([c, l]) => [l, c]));
  const NEGATIVI = ["rifiutata", "annullata", "non_attivabile", "persa"];
  // stati della versione precedente
  const STATI_VECCHI = { "Bozza": "dati_da_completare", "Inviato": "preventivo_inviato", "In trattativa": "da_ricontattare", "Firmato": "proposta_accettata", "Perso": "persa" };
  window.STATI_PRATICA = { elenco: STATI_PRATICA, label: STATO_LABEL, codice: STATO_CODICE, negativi: NEGATIVI, vecchi: STATI_VECCHI };
  const isUuid = s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ""));
  const S = () => window.Server;

  const DEFAULT_SETTINGS = { apiKey: "", model: "claude-opus-5-5", effort: "medium", rememberKey: true, agente: "", mittente: "energia@alcabroker.it", firma: "" };

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  function offertaLuceDaRiga(r) {
    return { id: uid("L"), azienda: r[0], nome: r[1], inizio: E().excelToISO(r[2]), fine: E().excelToISO(r[3]),
      tipologia: r[4], fascia: r[5], p1: r[6], p2: r[7], p3: null, spread: r[8], extra: 0, ccv: r[9],
      operazioni: r[10], pagamento: r[11], canali: r[12], restrizioni: r[13], contratto: null, chiusa: false, disattivata: false, note: "" };
  }
  function offertaGasDaRiga(r) {
    return { id: uid("G"), azienda: r[0], nome: r[1], inizio: E().excelToISO(r[2]), fine: E().excelToISO(r[3]),
      tipologia: r[4], p1: r[5], spread: r[6], extra: 0, ccv: r[7],
      operazioni: r[8], pagamento: r[9], canali: r[10], restrizioni: r[11], contratto: null, chiusa: false, disattivata: false, note: "" };
  }

  function emptyCatalog() {
    return { seedVersion: null, aggiornato: null, offerteLuce: [], offerteGas: [], pun: [], psv: [],
      forecast: { punF0: 0.2, punF1: 0.2, punF23: 0.2, psv: 0.8 }, luce: null, gas: null,
      mercatoLuce: [], mercatoGas: [], mercatoAggiornato: null,
      // privati (dimostrativo): accordi nostri (vuoti finché non li carichiamo), mercato residenziale, componenti domestiche
      offerteLucePrivati: [], offerteGasPrivati: [], mercatoLucePrivati: [], mercatoGasPrivati: [], mercatoPrivatiAggiornato: null,
      luceDom: window.SEED ? JSON.parse(JSON.stringify(window.SEED.luceDom)) : null,
      gasDom: window.SEED ? JSON.parse(JSON.stringify(window.SEED.gasDom)) : null };
  }

  function mercatoPrivatiDaFile() {
    const M = window.MERCATO_PRIVATI;
    if (!M) return { mercatoLucePrivati: [], mercatoGasPrivati: [], mercatoPrivatiAggiornato: null };
    const base = { id: null, inizio: null, p1: null, p2: null, p3: null, spread: null, extra: 0, contratto: null, chiusa: false, disattivata: false,
      operazioni: "", pagamento: "", canali: "", restrizioni: "", mercato: true, privati: true };
    return {
      mercatoPrivatiAggiornato: M.aggiornato,
      mercatoLucePrivati: M.luce.map(o => Object.assign({}, base, o, { id: uid("PL") })),
      mercatoGasPrivati: M.gas.map(o => Object.assign({}, base, o, { id: uid("PG") }))
    };
  }
  /* i nostri accordi privati dal file js/accordi-privati.js (se più recenti di quelli salvati) */
  function accordiDaFile() {
    const A = window.ACCORDI_PRIVATI;
    if (!A) return null;
    const base = { id: null, inizio: null, p1: null, p2: null, p3: null, spread: null, extra: 0, ccvScontata: null, contratto: null, chiusa: false, disattivata: false,
      operazioni: "", pagamento: "", canali: "", restrizioni: "", note: "", privati: true };
    return { accordiPrivatiAggiornato: A.aggiornato,
      offerteLucePrivati: A.luce.map(o => Object.assign({}, base, o, { id: uid("AL") })),
      offerteGasPrivati: (A.gas || []).map(o => Object.assign({}, base, o, { id: uid("AG") })) };
  }
  function aggiornaAccordiPrivati(data) {
    const a = accordiDaFile();
    const vuoti = !(data.offerteLucePrivati || []).length && !(data.offerteGasPrivati || []).length;
    if (a && a.accordiPrivatiAggiornato && (vuoti || !data.accordiPrivatiAggiornato || a.accordiPrivatiAggiornato > data.accordiPrivatiAggiornato)) Object.assign(data, a);
  }
  function aggiornaMercatoPrivati(data) {
    const m = mercatoPrivatiDaFile();
    if (m.mercatoPrivatiAggiornato && (!data.mercatoPrivatiAggiornato || m.mercatoPrivatiAggiornato > data.mercatoPrivatiAggiornato)) Object.assign(data, m);
  }

  /* offerte del resto del mercato (js/mercato.js) */
  function mercatoDaFile() {
    const M = window.MERCATO;
    if (!M) return { mercatoLuce: [], mercatoGas: [], mercatoAggiornato: null };
    const base = { id: null, extra: 0, contratto: null, chiusa: false, disattivata: false, canali: "", p3: null, mercato: true };
    return {
      mercatoAggiornato: M.aggiornato,
      mercatoLuce: M.luce.map(o => Object.assign({}, base, o, { id: uid("ML") })),
      mercatoGas: M.gas.map(o => Object.assign({}, base, o, { id: uid("MG") }))
    };
  }

  function fromSeed() {
    if (!window.SEED) return emptyCatalog();
    const S = JSON.parse(JSON.stringify(window.SEED));
    return {
      seedVersion: S.version, aggiornato: S.version,
      offerteLuce: S.offerteLuce.map(offertaLuceDaRiga),
      offerteGas: S.offerteGas.map(offertaGasDaRiga),
      pun: S.pun.map(r => ({ y: r[0], m: r[1], f0: r[2], f1: r[3], f23: r[4] })),
      psv: S.psv.map(r => ({ y: r[0], m: r[1], psv: r[2] })),
      forecast: S.forecast, luce: S.luce, gas: S.gas,
      ...mercatoDaFile(),
      offerteLucePrivati: [], offerteGasPrivati: [], luceDom: S.luceDom, gasDom: S.gasDom,
      ...mercatoPrivatiDaFile(), ...(accordiDaFile() || {})
    };
  }

  const Store = {
    mode: "local",
    data: null,
    canEdit: true,
    canSavePratiche: true,
    ready: false,
    onChange: null,         // callback quando il catalogo cambia (online)
    _db: null, _user: null, _uid: null, _written: {},

    /* ------------------------------ avvio ------------------------------ */
    async init() {
      if (S() && S().attivo && S().profilo) return this.initServer();
      const online = !!(window.claude && typeof window.claude.use === "function");
      if (!online) { this.loadLocal(); this.ready = true; return; }
      this.mode = "online";
      this.data = Object.assign(emptyCatalog(), { settings: this.loadSettings(), pratiche: [] });
      const [db, user] = await Promise.all([window.claude.use("db"), window.claude.use("user")]);
      this._db = db; this._user = user;
      this.canEdit = user ? !!(await user.canEdit().catch(() => false)) : false;
      this.isOwner = user ? !!(await user.isOwner().catch(() => false)) : false;
      this._uid = user ? await user.id().catch(() => null) : null;
      this.canSavePratiche = !!(db && this._uid);
      if (!db) { this.ready = true; this.dbMissing = true; return; }
      await this.subscribeCatalog();
      // offerte di mercato: se la versione inclusa nella pagina è più recente di quella nel database, usa quella
      const m = mercatoDaFile();
      if (m.mercatoAggiornato && (!this.data.mercatoAggiornato || m.mercatoAggiornato > this.data.mercatoAggiornato)) Object.assign(this.data, m);
      aggiornaMercatoPrivati(this.data); aggiornaAccordiPrivati(this.data);
      const base = emptyCatalog(); if (!this.data.luceDom) this.data.luceDom = base.luceDom; if (!this.data.gasDom) this.data.gasDom = base.gasDom;
      this.ready = true;
    },

    subscribeCatalog() {
      return new Promise(resolve => {
        let pending = Object.keys(CAT_DOCS).length, done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        const timer = setTimeout(() => { this.slow = true; finish(); }, 10000);
        for (const [doc, keys] of Object.entries(CAT_DOCS)) {
          let first = true;
          this._db.doc("catalogo/" + doc).onSnapshot(snap => {
            const d = snap.exists ? snap.data() : null;
            if (d) for (const k of keys) if (d[k] !== undefined) this.data[k] = JSON.parse(JSON.stringify(d[k]));
            this._written[doc] = d ? JSON.stringify(keys.map(k => d[k])) : null;
            if (first && !snap.metadata.fromCache) { first = false; if (--pending === 0) { clearTimeout(timer); this.slow = false; finish(); } }
            if (this.ready && this.onChange) this.onChange(doc);
          }, err => { console.warn("catalogo/" + doc, err); clearTimeout(timer); this.dbError = err.code; finish(); });
        }
      });
    },

    /* ------------------------------ server Alca Energy (Supabase) ------------------------------ */
    async initServer() {
      const prof = S().profilo;
      this.mode = "server"; this.profilo = prof;
      this.canEdit = !!prof.puo_cataloghi; this.isOwner = !!prof.ufficio; this.canSavePratiche = prof.ruolo !== "segnalatore";
      this.data = Object.assign(fromSeed(), { settings: this.loadSettings(), pratiche: [] });
      this._versioni = {};
      await this.caricaCatalogoServer();
      this.ready = true;
    },
    async caricaCatalogoServer() {
      if (this.profilo.ruolo === "segnalatore") return;
      const { data, error } = await S().db().from("catalogo").select("chiave, dati, versione, aggiornato_il");
      if (error) { this.dbError = error.message; return; }
      const presenti = new Set();
      for (const r of data) {
        const keys = CAT_DOCS[r.chiave]; if (!keys) continue;
        presenti.add(r.chiave); this._versioni[r.chiave] = r.versione;
        for (const k of keys) if (r.dati && r.dati[k] !== undefined) this.data[k] = r.dati[k];
        this._written[r.chiave] = JSON.stringify(keys.map(k => this.data[k]));
      }
      this.catalogoVersioni = Object.assign({}, this._versioni);
      // utente senza visibilità del resto del mercato (Utenti e rete): niente offerte esterne, né dal database né dai file dell'app
      const nascosti = this.profilo.vede_mercato === false ? ["mercato", "mercatoPrivati"] : [];
      if (nascosti.length) { for (const c of nascosti) { for (const k of CAT_DOCS[c]) this.data[k] = /Aggiornato$/.test(k) ? null : []; this._written[c] = JSON.stringify(CAT_DOCS[c].map(k => this.data[k])); } }
      // prima apertura: il catalogo condiviso nasce dai file dell'app (migrazione controllata, una volta sola)
      const mancanti = Object.keys(CAT_DOCS).filter(c => !presenti.has(c) && !nascosti.includes(c));
      if (mancanti.length && this.canEdit) {
        for (const c of mancanti) {
          const dati = {}; CAT_DOCS[c].forEach(k => dati[k] = this.data[k] ?? null);
          const { error: e2 } = await S().db().from("catalogo").insert({ chiave: c, dati, origine_modifica: "migrazione_iniziale" });
          if (!e2) { this._written[c] = JSON.stringify(CAT_DOCS[c].map(k => this.data[k])); this._versioni[c] = 1; }
        }
      } else if (mancanti.length) this.catalogoIncompleto = mancanti;
    },
    async saveCatalogServer() {
      for (const [doc, keys] of Object.entries(CAT_DOCS)) {
        if (this.profilo?.vede_mercato === false && (doc === "mercato" || doc === "mercatoPrivati")) continue;
        const s = JSON.stringify(keys.map(k => this.data[k]));
        if (s === this._written[doc]) continue;
        const dati = {}; keys.forEach(k => dati[k] = this.data[k] ?? null);
        const { error } = await S().db().from("catalogo").upsert({ chiave: doc, dati, origine_modifica: "manuale" });
        if (error) { if (this.onError) this.onError({ code: error.message }); return false; }
        this._written[doc] = s;
      }
      return true;
    },
    _praticaDaRiga(r) {
      const p = Object.assign({}, r.dati || {});
      p.id = r.id; p.numero = r.numero; p.segmento = r.segmento; p.serverId = r.id;
      p.cliente = Object.assign({ ragione_sociale: r.clienti?.denominazione || "", partita_iva: r.clienti?.piva || r.clienti?.cf || "" }, p.cliente || {});
      p.crm = Object.assign({ prossimoContatto: "", referente: r.clienti?.referente || "", email: r.clienti?.email || "", telefono: r.clienti?.telefono || "", note: "", storico: [] }, p.crm || {});
      p.crm.stato = STATO_LABEL[r.stato] || r.stato; p.crm.statoCodice = r.stato; p.crm.motivoEsito = r.motivo_esito || "";
      p.crm.prossimoContatto = r.ricontatto || "";
      const nomeOp = o => o ? `${o.nome} ${o.cognome}${o.codice_agente ? " (" + o.codice_agente + ")" : ""}` : "";
      p.origine = Object.assign({}, p.origine || {}, { canale: r.canale || p.origine?.canale || "Diretto", agente: nomeOp(r.produttore), segnalatore: nomeOp(r.segnalatore) || p.origine?.segnalatore || "", emailRisposta: r.email_risposta || p.origine?.emailRisposta || "" });
      p.autore = nomeOp(r.produttore); p.produttoreId = r.produttore_id; p.produttoreCodice = r.produttore_codice;
      p.creataDa = nomeOp(r.creatore); p.backoffice = nomeOp(r.ufficio); p.perContoDi = r.per_conto_di;
      p.creata = p.creata || r.created_at; p.aggiornata = r.updated_at;
      // pratiche arrivate dai link: numero della stima (es. ST-D792D82E) e nome del link, per la ricerca nel CRM
      p.noteRichiesta = r.note_richiesta || ""; p.stimaReferral = (p.noteRichiesta.match(/\bST-[0-9A-F]{6,}\b/i) || [""])[0].toUpperCase();
      return p;
    },
    _selPratiche: "*, clienti(*), produttore:operatori!pratiche_produttore_id_fkey(id,nome,cognome,codice_agente), segnalatore:operatori!pratiche_segnalatore_id_fkey(nome,cognome,codice_agente), creatore:operatori!pratiche_created_by_fkey(nome,cognome,codice_agente), ufficio:operatori!pratiche_backoffice_id_fkey(nome,cognome,codice_agente)",
    _payloadPratica(p) {
      const c = p.cliente || {}, priv = p.segmento === "privati", a = window.Restr ? window.Restr.daIndirizzo(c.indirizzo) : {};
      const punti = [];
      if (p.luce?.attiva) punti.push({ commodity: "luce", codice: p.luce.pod || null, indirizzo: c.indirizzo, cap: a.cap, comune: a.comune, provincia: a.provincia, regione: c.regione || a.regione,
        distributore: p.luce.distributore, potenza_kw: String(p.luce.kw || "").replace(",", ".") || null, residente: priv ? c.residente !== "no" : null, uso: priv ? "domestico" : "altri usi" });
      if (p.gas?.attiva) punti.push({ commodity: "gas", codice: p.gas.pdr || null, indirizzo: c.indirizzo, cap: a.cap, comune: a.comune, provincia: a.provincia, regione: c.regione || a.regione,
        classe_contatore: p.gas.classe, residente: priv ? c.residente !== "no" : null, uso: priv ? "domestico" : "altri usi" });
      const stato = p.crm?.statoCodice || STATO_CODICE[p.crm?.stato] || STATI_VECCHI[p.crm?.stato] || "dati_da_completare";
      return { pratica_id: isUuid(p.serverId || p.id) ? (p.serverId || p.id) : null, segmento: p.segmento || "business", stato,
        motivo_esito: p.crm?.motivoEsito || null, ricontatto: p.crm?.prossimoContatto || "", email_risposta: p.origine?.emailRisposta || null, canale: p.origine?.canale || null,
        cliente: { tipo: priv ? "privato" : "azienda", denominazione: c.ragione_sociale || "", piva: priv ? null : (c.partita_iva || null), cf: priv ? (c.partita_iva || null) : null,
          email: p.crm?.email || null, telefono: p.crm?.telefono || null, referente: p.crm?.referente || null },
        punti, dati: p };
    },

    get catalogoVuoto() { return !this.data.offerteLuce.length && !this.data.offerteGas.length; },

    /* ------------------------------ locale ------------------------------ */
    loadLocal() {
      try {
        const raw = lsGet(KEY);
        if (raw) { this.data = JSON.parse(raw); this.migrate(); return; }
      } catch (e) { console.warn("Impossibile leggere i dati salvati", e); }
      this.data = Object.assign(fromSeed(), { settings: Object.assign({}, DEFAULT_SETTINGS), pratiche: [] });
    },
    migrate() {
      const base = fromSeed();
      for (const k of Object.keys(base)) if (this.data[k] === undefined) this.data[k] = base[k];
      this.data.settings = Object.assign({}, DEFAULT_SETTINGS, this.data.settings);
      if (!this.data.pratiche) this.data.pratiche = [];
      // se mercato.js è stato aggiornato (ricerca ogni 3 giorni) sostituisce le offerte di mercato salvate
      const m = mercatoDaFile();
      if (m.mercatoAggiornato && (!this.data.mercatoAggiornato || m.mercatoAggiornato > this.data.mercatoAggiornato)) Object.assign(this.data, m);
      aggiornaMercatoPrivati(this.data); aggiornaAccordiPrivati(this.data);
    },
    loadSettings() {
      try { return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(lsGet(SET_KEY) || "{}")); } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
    },

    /* ------------------------------ salvataggio ------------------------------ */
    async save() {
      if (this.mode === "local") {
        const copy = Object.assign({}, this.data);
        if (!this.data.settings.rememberKey) copy.settings = Object.assign({}, this.data.settings, { apiKey: "" });
        return lsSet(KEY, JSON.stringify(copy));
      }
      lsSet(SET_KEY, JSON.stringify(Object.assign({}, this.data.settings, { apiKey: "" })));
      if (this.mode === "server") return this.canEdit ? this.saveCatalogServer() : true;
      if (!this._db || !this.canEdit) return true;
      return this.saveCatalog();
    },
    _saving: Promise.resolve(),
    saveCatalog() {
      // una scrittura alla volta, solo dei documenti cambiati
      this._saving = this._saving.then(async () => {
        for (const [doc, keys] of Object.entries(CAT_DOCS)) {
          const s = JSON.stringify(keys.map(k => this.data[k]));
          if (s === this._written[doc]) continue;
          const body = {}; keys.forEach(k => body[k] = this.data[k] ?? null);
          try { await this._db.doc("catalogo/" + doc).set(body); this._written[doc] = s; }
          catch (e) { console.warn("Salvataggio catalogo/" + doc, e); if (this.onError) this.onError(e); return false; }
        }
        return true;
      });
      return this._saving;
    },

    /* ------------------------------ CRM preventivi ------------------------------
       Online: crm/<utente>/preventivi/<id>. Ogni produttore legge e scrive i propri;
       il titolare (e chi ha permessi di modifica) li vede tutti. */
    _crmCol(u) { return this._db.collection("crm/" + u + "/preventivi"); },
    _legacyCol() { return this._db.collection("data/users/" + this._uid); },
    _ordina(l) { return l.sort((a, b) => String(b.aggiornata || b.creata).localeCompare(String(a.aggiornata || a.creata))); },
    async listPratiche() {
      if (this.mode === "local") return this.data.pratiche;
      if (this.mode === "server") {
        this.crmError = null;
        const { data, error } = await S().db().from("pratiche").select(this._selPratiche).order("updated_at", { ascending: false }).limit(2000);
        if (error) { this.crmError = error.message; return []; }
        return data.map(r => this._praticaDaRiga(r));
      }
      let out = [];
      this.crmError = null;
      // i documenti letti dal database sono congelati: vanno sempre copiati prima di modificarli
      const leggi = snap => snap.docs.map(d => d.exists === false ? null : d.data()).filter(Boolean).map(x => JSON.parse(JSON.stringify(x)));
      if (this.canSavePratiche) {
        try {
          const uids = new Set([this._uid]);
          if (this.canEdit) {
            try { (await this._db.collection("crm").get()).docs.forEach(d => uids.add(d.id)); } catch (e) { console.warn("crm", e); }
          }
          for (const u of uids) {
            try { leggi(await this._crmCol(u).get()).forEach(p => { p.autore = p.autore || u; if (!out.some(x => x.id === p.id)) out.push(p); }); }
            catch (e) { console.warn("crm/" + u, e); if (u === this._uid) throw e; }
          }
          // pratiche salvate con la versione precedente
          const old = await this._legacyCol().get().catch(() => null);
          if (old) leggi(old).filter(p => p.cliente && !out.some(x => x.id === p.id)).forEach(p => { p.autore = this._uid; out.push(p); });
        } catch (e) { console.warn(e); this.crmError = e.code || e.message || "errore"; }
      }
      try { JSON.parse(lsGet(PR_KEY) || "[]").forEach(p => { if (!out.some(x => x.id === p.id)) out.push(Object.assign(p, { soloBrowser: true })); }); } catch (e) { }
      return this._ordina(out);
    },
    async savePratica(p) {
      const copy = JSON.parse(JSON.stringify(p));
      delete copy.soloBrowser;
      if (this.mode === "local") {
        const i = this.data.pratiche.findIndex(x => x.id === p.id);
        if (i >= 0) this.data.pratiche[i] = copy; else this.data.pratiche.unshift(copy);
        this.save(); return "locale";
      }
      if (this.mode === "server") {
        const out = await S().rpc("salva_pratica", { payload: this._payloadPratica(copy) });
        p.id = p.serverId = out.pratica_id; p.numero = out.numero;
        return "server";
      }
      if (this.canSavePratiche) {
        const u = copy.autore || this._uid; copy.autore = u;
        try {
          await this._crmCol(u).doc(p.id).set(copy);
          if (u === this._uid && !this._crmReg) { await this._db.doc("crm/" + u).set({ attivo: true }).catch(() => { }); this._crmReg = true; }
          return "account";
        }
        catch (e) { console.warn(e); if (u === this._uid) this.canSavePratiche = false; else throw e; }
      }
      let list = [];
      try { list = JSON.parse(lsGet(PR_KEY) || "[]"); } catch (e) { }
      const i = list.findIndex(x => x.id === p.id);
      if (i >= 0) list[i] = copy; else list.unshift(copy);
      lsSet(PR_KEY, JSON.stringify(list));
      return "browser";
    },
    async deletePratica(p) {
      const id = p.id;
      if (this.mode === "local") { this.data.pratiche = this.data.pratiche.filter(x => x.id !== id); this.save(); return; }
      if (this.mode === "server") {
        const { error, count } = await S().db().from("pratiche").delete({ count: "exact" }).eq("id", id);
        if (error || !count) throw new Error("Solo l'amministratore elimina le pratiche: chiudila con un esito (annullata, persa…).");
        return;
      }
      if (this.canSavePratiche) {
        try { await this._crmCol(p.autore || this._uid).doc(id).delete(); } catch (e) { console.warn(e); }
        try { await this._legacyCol().doc(id).delete(); } catch (e) { }
      }
      try { const l = JSON.parse(lsGet(PR_KEY) || "[]").filter(x => x.id !== id); lsSet(PR_KEY, JSON.stringify(l)); } catch (e) { }
    },
    /* ------------------------------ bollette in arrivo ------------------------------
       Ogni richiesta è una bolletta arrivata (a mano o da un flusso automatico) con chi l'ha mandata:
       { id, ricevuta, canale, agente, segnalatore, emailRisposta, cliente:{ragione_sociale, partita_iva},
         note, allegati:[{nome, url}], stato, praticaId, storico:[{t,e}] }
       Online sta in "richieste/<id>": la vede e la modifica solo il titolare (e chi ha permessi di modifica). */
    get puoRichieste() { return this.mode === "local" || (this.mode === "server" ? !!this.profilo?.ufficio : (!!this._db && this.canEdit)); },
    /* server: le bollette in arrivo sono le pratiche nei primi stati, con i documenti dell'archivio */
    async _richiesteServer() {
      const { data, error } = await S().db().from("pratiche").select(this._selPratiche + ", documenti(nome, storage_path, mime)")
        .in("stato", ["bolletta_ricevuta", "dati_da_completare", "annullata"]).order("created_at", { ascending: false }).limit(500);
      if (error) throw new Error(error.message);
      const out = [];
      for (const r of data) {
        if (r.stato === "annullata" && !(r.canale === "Modulo web" || r.canale === "Segnalatore")) continue;
        const nomeOp = o => o ? `${o.nome} ${o.cognome}${o.codice_agente ? " (" + o.codice_agente + ")" : ""}` : "";
        const allegati = [];
        for (const d of r.documenti || []) { let url = ""; try { url = await S().linkDocumento(d.storage_path); } catch (e) { } allegati.push({ nome: d.nome, tipo: d.mime, url, path: d.storage_path }); }
        out.push({ id: r.id, praticaId: r.id, numero: r.numero, ricevuta: r.created_at, canale: r.canale || "Diretto", agente: nomeOp(r.produttore), segnalatore: nomeOp(r.segnalatore),
          emailRisposta: r.email_risposta || "", cliente: { ragione_sociale: r.clienti?.denominazione || r.dati?.cliente_dichiarato?.denominazione || "", partita_iva: r.clienti?.piva || r.dati?.cliente_dichiarato?.piva || "" },
          note: r.note_richiesta || "", allegati, stato: r.stato === "annullata" ? "Scartata" : r.stato === "bolletta_ricevuta" ? "Nuova" : "In lavorazione", storico: [], _server: true, segmento: r.segmento });
      }
      return out;
    },
    /* le bollette mandate dai produttori col modulo "Invia bolletta" stanno in inbox/<uid>/bollette/<id>:
       ognuno vede solo le proprie, il titolare le vede tutte insieme a quelle in "richieste" */
    _inboxCol(u) { return this._db.collection("inbox/" + u + "/bollette"); },
    _docs(snap) { return snap.docs.map(d => d.exists === false ? null : d.data()).filter(Boolean).map(x => JSON.parse(JSON.stringify(x))); },
    _perData(l) { return l.sort((a, b) => String(b.ricevuta).localeCompare(String(a.ricevuta))); },
    async listRichieste() {
      if (this.mode === "local") return (this.data.richieste ||= []);
      if (!this.puoRichieste) return [];
      if (this.mode === "server") return this._richiesteServer();
      const out = this._docs(await this._db.collection("richieste").get());
      let utenti = [];
      try { utenti = (await this._db.collection("inbox").get()).docs.map(d => d.id); } catch (e) { console.warn("inbox", e); }
      for (const u of utenti) {
        try { this._docs(await this._inboxCol(u).get()).forEach(r => { r._path = "inbox/" + u + "/bollette/" + r.id; r.autore = r.autore || u; out.push(r); }); }
        catch (e) { console.warn("inbox/" + u, e); }
      }
      return this._perData(out);
    },
    async saveRichiesta(r) {
      const copy = JSON.parse(JSON.stringify(r));
      if (!copy.id) copy.id = uid("R");
      if (this.mode === "local") {
        const l = (this.data.richieste ||= []), i = l.findIndex(x => x.id === copy.id);
        if (i >= 0) l[i] = copy; else l.unshift(copy);
        this.save(); return copy;
      }
      if (!this.puoRichieste) throw new Error("Solo il titolare può gestire le bollette in arrivo.");
      if (this.mode === "server") {
        const stato = { "Nuova": "bolletta_ricevuta", "In lavorazione": "dati_da_completare", "Scartata": "annullata" }[copy.stato];
        if (copy.praticaId && stato) {
          const upd = { stato }; if (stato === "annullata") upd.motivo_esito = copy.motivoScarto || "Bolletta scartata dall'ufficio";
          const { error } = await S().db().from("pratiche").update(upd).eq("id", copy.praticaId);
          if (error) throw new Error(error.message);
        }
        return copy;
      }
      const path = copy._path || "richieste/" + copy.id; delete copy._path;
      await this._db.doc(path).set(copy);
      copy._path = r._path; return copy;
    },
    async deleteRichiesta(r) {
      if (this.mode === "local") { this.data.richieste = (this.data.richieste || []).filter(x => x.id !== r.id); this.save(); return; }
      if (this.puoRichieste) await this._db.doc(r._path || "richieste/" + r.id).delete();
    },
    /* modulo "Invia bolletta": carica i file e registra la bolletta in arrivo */
    async inviaBolletta(r, files, onStatus) {
      const copy = JSON.parse(JSON.stringify(r));
      copy.id = uid("R"); copy.ricevuta = new Date().toISOString(); copy.stato = "Nuova";
      copy.storico = [{ t: copy.ricevuta, e: "Inviata dal modulo" }]; copy.allegati = [];
      if (this.mode === "local") {
        for (const f of files) {
          if (f.size > 3e6) throw new Error(`${f.name} è troppo grande per la versione sul PC (max 3 MB)`);
          const url = await new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = ko; fr.readAsDataURL(f); });
          copy.allegati.push({ nome: f.name, tipo: f.type, url });
        }
        (this.data.richieste ||= []).unshift(copy); this.save(); return copy;
      }
      if (this.mode === "server") {
        onStatus && onStatus("Registro la bolletta…");
        const out = await S().rpc("nuova_segnalazione", { payload: { segmento: r.segmento || "business", email_risposta: r.emailRisposta || null, note: r.note || null,
          cliente: { denominazione: r.cliente?.ragione_sociale || null, piva: r.cliente?.partita_iva || null, email: r.cliente?.email || null, telefono: r.cliente?.telefono || null } } });
        let n = 0;
        for (const f of files) { onStatus && onStatus(`Carico ${f.name} (${++n}/${files.length})…`); await S().caricaDocumento(out.pratica_id, f, "bolletta"); }
        return Object.assign(copy, { id: out.pratica_id, numero: out.numero });
      }
      if (!this._db || !this._uid) throw new Error("Per inviare bollette devi essere collegato con il tuo account claude.ai.");
      const assets = await window.claude.use("assets");
      if (!assets) throw new Error("Il caricamento dei file non è disponibile per il tuo account: chiedi al titolare di darti accesso come Collaboratore.");
      let n = 0;
      for (const f of files) {
        onStatus && onStatus(`Carico ${f.name} (${++n}/${files.length})…`);
        const a = await assets.upload(f);
        copy.allegati.push({ nome: f.name, tipo: f.type, url: a.url, assetId: a.id });
      }
      onStatus && onStatus("Registro la bolletta…");
      copy.autore = this._uid;
      if (!this._inboxReg) { await this._db.doc("inbox/" + this._uid).set({ attivo: true }).catch(() => { }); this._inboxReg = true; }
      await this._inboxCol(this._uid).doc(copy.id).set(copy);
      return copy;
    },
    async mieBollette() {
      if (this.mode === "local") return (this.data.richieste || []).filter(r => r.canale === "Modulo web");
      if (this.mode === "server") {
        const l = await S().rpc("mie_segnalazioni");
        return (l || []).map(x => ({ id: x.pratica_id, numero: x.numero, ricevuta: x.ricevuta, cliente: { ragione_sociale: x.cliente }, stato: STATO_LABEL[x.stato] || x.stato, aggiornata: x.aggiornata }));
      }
      if (!this._db || !this._uid) return [];
      return this._perData(this._docs(await this._inboxCol(this._uid).get()));
    },
    async nomeUtente() {
      if (this.mode === "server") return `${this.profilo.nome} ${this.profilo.cognome}`;
      if (!this._user) return "";
      try { const me = await this._user.me(); return me?.name || ""; } catch (e) { return ""; }
    },

    /* nomi dei produttori (solo online, se l'artifact concede i profili) */
    async nomiUtenti(ids) {
      if (!this._user || !ids.length) return {};
      try { const ps = await this._user.profiles(ids); const o = {}; for (const id of ids) o[id] = ps?.[id]?.name || ""; return o; } catch (e) { return {}; }
    },

    /* ------------------------------ backup ------------------------------ */
    async exportJSON() {
      const copy = JSON.parse(JSON.stringify(this.data));
      copy.settings = Object.assign({}, copy.settings, { apiKey: "" });
      copy.pratiche = await this.listPratiche().catch(() => []);
      return JSON.stringify(copy, null, 2);
    },
    async importJSON(txt) {
      const d = JSON.parse(txt);
      if (!d.offerteLuce || !d.offerteGas) throw new Error("File di backup non valido");
      if (this.mode === "local") {
        const key = this.data.settings.apiKey;
        this.data = d; this.migrate();
        if (!this.data.settings.apiKey) this.data.settings.apiKey = key;
        this.save(); return;
      }
      if (!this.canEdit) throw new Error("Solo chi gestisce il catalogo può ripristinare un backup.");
      for (const keys of Object.values(CAT_DOCS)) for (const k of keys) if (d[k] !== undefined) this.data[k] = d[k];
      await this.save();
    },
    async resetCatalogo() {
      const base = fromSeed();
      // nel sito pubblicato i listini non sono nei file (si leggono dal database dopo l'accesso): niente ripristino che li svuoterebbe
      if (!base.offerteLuce.length && !base.offerteGas.length) throw new Error("Il ripristino dei dati iniziali non è disponibile online: il catalogo resta quello salvato.");
      for (const k of ["offerteLuce", "offerteGas", "pun", "psv", "forecast", "luce", "gas", "seedVersion", "aggiornato"]) this.data[k] = base[k];
      await this.save();
    },
    uid,
    newOffertaLuce() { return offertaLuceDaRiga(["", "", null, null, "Fissa", "Monoraria", null, null, null, 0, "Switch-in", "RID", "Call Center, Store, FP", ""]); },
    newOffertaGas() { return offertaGasDaRiga(["", "", null, null, "Fissa", null, null, 0, "Switch-in", "RID", "Call Center, Store, FP", ""]); },
    newOffertaMercato(c) {
      const o = c === "luce" ? this.newOffertaLuce() : this.newOffertaGas();
      return Object.assign(o, { id: uid(c === "luce" ? "ML" : "MG"), operazioni: "", pagamento: "", canali: "", mercato: true, fonte: "", verificata: E().todayISO() });
    },
    mercatoDaFile
  };

  window.Store = Store;
})();
