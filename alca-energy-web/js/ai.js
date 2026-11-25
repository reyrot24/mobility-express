/* Estrazione automatica dei dati dalla bolletta con Claude (chiamata diretta dal browser). */
(function () {
  const API_URL = "https://api.anthropic.com/v1/messages";
  const FALLBACK_MODELS = ["claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-2", "claude-fable-5-1", "claude-opus-5"];

  const N = t => ({ type: [t, "null"] });
  const obj = props => ({ type: "object", additionalProperties: false, required: Object.keys(props), properties: props });
  const nullable = o => ({ anyOf: [o, { type: "null" }] });
  const E = v => nullable({ type: "string", enum: v });

  const SCHEMA = obj({
    cliente: obj({
      ragione_sociale: N("string"), partita_iva: N("string"), codice_fiscale: N("string"),
      indirizzo_fornitura: N("string"), fornitore_attuale: N("string"), nome_offerta_attuale: N("string"),
      numero_fattura: N("string"), data_emissione: N("string"),
      tipo_cliente: E(["societa", "ditta_individuale", "condominio", "pertinenza", "pa", "domestico"])
    }),
    luce: nullable(obj({
      pod: N("string"), distributore: N("string"), periodo_da: N("string"), periodo_a: N("string"),
      totale_fornitura_eur: N("number"), spesa_materia_energia_eur: N("number"), quota_fissa_vendita_eur: N("number"),
      spesa_trasporto_eur: N("number"), spesa_oneri_eur: N("number"), imposte_eur: N("number"), iva_aliquota_pct: N("number"),
      consumo_periodo_kwh: N("number"), consumo_f1_kwh: N("number"), consumo_f2_kwh: N("number"), consumo_f3_kwh: N("number"),
      consumo_annuo_kwh: N("number"), potenza_impegnata_kw: N("number"), potenza_disponibile_kw: N("number"),
      tipo_prezzo_attuale: E(["Fissa", "Variabile"]),
      struttura_fasce_attuale: E(["Monoraria", "Bioraria", "Trioraria"]),
      prezzo_energia_attuale_eur_kwh: N("number"), uso: N("string"), consumi_stimati: N("boolean"), residente: N("boolean")
    })),
    gas: nullable(obj({
      pdr: N("string"), periodo_da: N("string"), periodo_a: N("string"),
      totale_fornitura_eur: N("number"), spesa_materia_gas_eur: N("number"), quota_fissa_vendita_eur: N("number"),
      spesa_trasporto_eur: N("number"), spesa_oneri_eur: N("number"), imposte_eur: N("number"), iva_aliquota_pct: N("number"),
      consumo_periodo_smc: N("number"), consumo_annuo_smc: N("number"),
      classe_contatore: N("string"), coefficiente_c: N("number"),
      tipo_prezzo_attuale: E(["Fissa", "Variabile"]),
      prezzo_gas_attuale_eur_smc: N("number"), uso: N("string"), consumi_stimati: N("boolean")
    })),
    confidenza: { type: "string", enum: ["alta", "media", "bassa"] },
    // da dove viene ogni dato importante, e quali dati sono incerti (vanno confermati prima del preventivo)
    fonti: { type: "array", items: obj({ campo: { type: "string" }, file: N("string"), pagina: N("number") }) },
    campi_incerti: { type: "array", items: { type: "string" } },
    avvisi: { type: "array", items: { type: "string" } }
  });

  const PROMPT = `Sei un analista esperto di bollette energetiche italiane per clienti business (partita IVA, usi diversi dall'abitazione) e domestici (privati).
Leggi la bolletta allegata (può essere composta da più pagine o file) ed estrai i dati richiesti dallo schema JSON.

Regole:
- Importi in euro come numeri con il punto decimale (es. 1234.56). Date in formato YYYY-MM-DD.
- Se un dato non è presente o non è leggibile, usa null. Non inventare valori.
- "periodo_da"/"periodo_a": il periodo di fornitura fatturato in questa bolletta (non le date di emissione o scadenza).
- "totale_fornitura_eur": il totale da pagare relativo a quella fornitura, IVA inclusa. In una bolletta dual (luce+gas) usa il totale di ciascuna fornitura; se la bolletta riporta solo il totale complessivo, calcolalo come somma delle voci di quella fornitura più la relativa IVA e segnalalo negli avvisi.
- Escludi dal totale canone RAI, bollo, rate di altre fatture, depositi cauzionali e servizi non energetici (segnalali negli avvisi se presenti).
- "spesa_materia_energia_eur" / "spesa_materia_gas_eur": il totale della sezione "Spesa per la materia energia" / "Spesa per la materia gas naturale" (quota energia/gas, quota fissa e commercializzazione, dispacciamento, sbilanciamento, capacità), IVA esclusa. Non includere trasporto e gestione contatore, oneri di sistema, imposte, IVA.
- "quota_fissa_vendita_eur": dentro la spesa per la materia, la parte FISSA del periodo che non dipende dai consumi (quota fissa, commercializzazione/PCV, €/mese o €/giorno × periodo), IVA esclusa; null se la bolletta non la distingue. Non includere la quota fissa di trasporto o di oneri.
- "indirizzo_fornitura": l'indirizzo del PUNTO DI FORNITURA (non quello di recapito/fatturazione), nel formato "Via e civico, CAP Comune (Sigla provincia)", es. "Via Roma 1, 80121 Napoli (NA)". Serve a controllare le restrizioni territoriali delle offerte.
- "distributore" (luce): il distributore locale indicato in bolletta (es. "e-distribuzione", "Areti", "Unareti", "Ireti", "Edyna"); null se non indicato.
- Consumi del periodo: i kWh o Smc fatturati nel periodo (effettivi o stimati). Indica "consumi_stimati": true se sono stimati.
- Consumi per fascia F1/F2/F3 se presenti; se la bolletta riporta F23 in un unico valore mettilo in consumo_f2_kwh e lascia F3 null.
- "consumo_annuo_kwh"/"consumo_annuo_smc": il consumo annuo degli ultimi 12 mesi se riportato in bolletta.
- "potenza_impegnata_kw": potenza contrattualmente impegnata in kW.
- "classe_contatore": classe del misuratore gas se indicata (es. G4, G6, G10, G16, G25, G40...).
- "tipo_cliente": "condominio" se l'intestatario è un condominio, "pa" se pubblica amministrazione, "ditta_individuale" se è una persona fisica con P.IVA, "societa" per società, "pertinenza" se la fornitura è una pertinenza (box, cantina...). Prima di scegliere controlla se l'INTESTATARIO ha una partita IVA: se c'è, è un cliente business ("societa" o "ditta_individuale"; "condominio" o "pa" se lo è) e non "domestico", salvo che la bolletta indichi espressamente una fornitura per uso domestico. Un codice fiscale numerico di 11 cifre indica una società, un ente o un condominio, non una persona. Se l'intestatario è una persona fisica senza partita IVA e nulla indica un'attività, usa "domestico". null solo se l'intestatario non è leggibile.
- "partita_iva": solo quella dell'intestatario della fornitura (11 cifre); mai quella del venditore, del distributore o del Gruppo IVA del venditore; null se non c'è. (uso domestico, intestata a una persona senza attività); in quel caso "residente" (luce) = true se la bolletta indica "domestico residente", false se "non residente", null se non indicato.
- Se la bolletta contiene conguagli, ricalcoli, rimborsi o periodi anomali, scrivilo negli avvisi: falsano il confronto.
- Se manca la fornitura luce o gas, metti null nel relativo oggetto.
- "confidenza": quanto sei sicuro dei dati principali (totale, spesa materia, consumi, periodo).
- "fonti": per totale, spesa materia, consumi, consumo annuo, periodo, POD/PDR, potenza, indirizzo: il nome del file e il numero di pagina da cui hai letto il dato (campo con i nomi dello schema, es. "luce.totale_fornitura_eur").
- "campi_incerti": i nomi dei campi (es. "luce.spesa_materia_energia_eur", "gas.consumo_periodo_smc", "luce.pod") che hai letto con difficoltà, dedotto o calcolato, o che sono incoerenti tra loro.
- Se in bolletta ci sono canone RAI, arretrati, rate, depositi, ricalcoli o conguagli, NON includerli nei totali confrontabili e segnalali negli avvisi con l'importo.`;

  function readAsBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1]);
      r.onerror = () => rej(new Error(`Impossibile leggere ${file.name}`));
      r.readAsDataURL(file);
    });
  }

  function mediaType(file) {
    const n = file.name.toLowerCase();
    if (file.type === "application/pdf" || n.endsWith(".pdf")) return "application/pdf";
    if (file.type && file.type.startsWith("image/")) return file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (/\.(jpe?g)$/.test(n)) return "image/jpeg";
    if (n.endsWith(".png")) return "image/png";
    if (n.endsWith(".webp")) return "image/webp";
    throw new Error(`Formato non supportato: ${file.name} (usa PDF, JPG, PNG o WEBP)`);
  }

  const suServer = () => window.Store && Store.mode === "server";
  async function call(settings, body, tipo) {
    if (suServer()) {
      // la chiave resta sul server Alca: qui passa solo la richiesta dell'operatore autenticato
      const b = Object.assign({}, body); delete b.fallbacks; delete b.model;
      try { return await Server.funzione("energy-ai", { tipo, body: b }); }
      catch (e) { const err = new Error(e.message); err.status = /schema|format|output_config/i.test(e.message) ? 400 : 0; throw err; }
    }
    const headers = {
      "content-type": "application/json",
      "x-api-key": settings.apiKey,
      "anthropic-version": "2026-10-21",
      "anthropic-dangerous-direct-browser-access": "true"
    };
    if (body.fallbacks) headers["anthropic-beta"] = "server-side-fallback-2026-07-01";
    const resp = await fetch(API_URL, { method: "POST", headers, body: JSON.stringify(body) });
    const json = await resp.json().catch(() => null);
    if (!resp.ok) {
      const msg = json?.error?.message || `HTTP ${resp.status}`;
      const err = new Error(msg); err.status = resp.status; throw err;
    }
    return json;
  }

  function parseRisposta(msg) {
    if (msg.stop_reason === "refusal") throw new Error("Il modello ha rifiutato la richiesta. Riprova o compila i dati a mano.");
    if (msg.stop_reason === "max_tokens") throw new Error("Risposta troncata: riprova con meno pagine.");
    const text = (msg.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Risposta dell'AI non interpretabile.");
    return JSON.parse(m[0]);
  }

  async function estraiBolletta(files, settings, onStatus) {
    if (!settings.apiKey && !suServer()) throw new Error("Inserisci la chiave API di Anthropic in Impostazioni.");
    if (!files.length) throw new Error("Carica almeno un file della bolletta.");
    onStatus?.("Lettura dei file…");
    const content = [];
    for (const f of files) {
      const mt = mediaType(f);
      const data = await readAsBase64(f);
      content.push(mt === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: mt, data }, title: f.name }
        : { type: "image", source: { type: "base64", media_type: mt, data } });
    }
    // lo schema ha più di 16 campi facoltativi (limite degli output strutturati dell'API): la struttura JSON si chiede nel testo
    content.push({ type: "text", text: PROMPT + "\n\nRispondi SOLO con un oggetto JSON (senza testo prima o dopo) con questa struttura JSON Schema; usa null per i dati non presenti:\n" + JSON.stringify(SCHEMA) });

    const body = {
      model: settings.model || "claude-opus-5-5",
      max_tokens: 16000,
      output_config: { effort: settings.effort || "medium" },
      messages: [{ role: "user", content }]
    };
    if (FALLBACK_MODELS.includes(body.model)) body.fallbacks = "default";

    onStatus?.("Analisi della bolletta con l'AI…");
    let msg;
    try {
      msg = await call(settings, body, "bolletta");
    } catch (e) {
      if (e.status === 400 && /schema|format|output_config|fallback/i.test(e.message)) {
        // ripiego: niente output strutturato, JSON chiesto nel testo
        delete body.output_config.format; delete body.fallbacks;
        content[content.length - 1] = { type: "text", text: PROMPT + "\n\nRispondi SOLO con un oggetto JSON con questa struttura:\n" + JSON.stringify(SCHEMA) };
        msg = await call(settings, body, "bolletta");
      } else if (e.status === 401) {
        throw new Error("Chiave API non valida (401). Controlla Impostazioni.");
      } else throw e;
    }
    onStatus?.("Dati estratti.");
    return parseRisposta(msg);
  }

  /* ---------------- Modalità online (artifact su claude.ai): usa l'account Claude di chi visualizza ---------------- */
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
  const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  function loadScript(src) {
    return new Promise((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) return res();
      const s = document.createElement("script"); s.src = src; s.onload = res;
      s.onerror = () => rej(new Error("Impossibile caricare il lettore PDF."));
      document.head.appendChild(s);
    });
  }
  async function pdfjs() {
    if (!window.pdfjsLib) { await loadScript(PDFJS); }
    if (!window.pdfjsWorker) { await loadScript(PDFJS_WORKER); }  // worker nel thread principale
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return window.pdfjsLib;
  }

  /* PDF → testo (se digitale) + immagini delle pagine */
  async function leggiPdf(file, maxPagine) {
    const lib = await pdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    let testo = ""; const immagini = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const tc = await page.getTextContent();
      let riga = "", lastY = null;
      for (const it of tc.items) {
        const y = it.transform ? Math.round(it.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 2) riga += "\n";
        riga += it.str + (it.hasEOL ? "\n" : " ");
        lastY = y;
      }
      testo += `\n--- ${file.name} · pagina ${i} ---\n` + riga.replace(/[ \t]+/g, " ");
      if (immagini.length < maxPagine) {
        const vp1 = page.getViewport({ scale: 1 });
        const scale = Math.min(2.2, 1500 / vp1.width);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        immagini.push(await new Promise(r => canvas.toBlob(r, "image/jpeg", 0.85)));
      }
    }
    return { testo, immagini, pagine: doc.numPages };
  }

  function scheletro(s) {
    if (s.anyOf) { const x = scheletro(s.anyOf[0]); return typeof x === "string" && s.anyOf.some(a => a.type === "null") ? x + " | null" : x; }
    if (s.type === "object" || (Array.isArray(s.type) && s.type[0] === "object")) {
      const o = {}; for (const [k, v] of Object.entries(s.properties)) o[k] = scheletro(v); return o;
    }
    if (s.type === "array") return [scheletro(s.items)];
    if (s.enum) return s.enum.filter(x => x !== null).join(" | ") + (s.enum.includes(null) ? " | null" : "");
    const t = Array.isArray(s.type) ? s.type.join(" | ") : s.type;
    return t;
  }

  async function estraiOnline(files, onStatus) {
    const sample = await window.claude.use("sample");
    if (!sample) throw new Error("L'analisi AI non è disponibile in questa visualizzazione: accedi a claude.ai oppure compila i dati a mano.");
    if (!files.length) throw new Error("Carica almeno un file della bolletta.");
    const lim = await sample.limits().catch(() => null);
    const maxImg = lim?.images?.maxCount || 0;
    let testo = "", immagini = [];
    for (const f of files) {
      const mt = mediaType(f);
      if (mt === "application/pdf") {
        onStatus?.(`Lettura di ${f.name}…`);
        const r = await leggiPdf(f, Math.max(0, maxImg - immagini.length));
        testo += r.testo; immagini.push(...r.immagini);
      } else if (immagini.length < maxImg) immagini.push(f);
    }
    if (!immagini.length && testo.replace(/\s|-|pagina|\d|·/g, "").length < 200)
      throw new Error("Non riesco a leggere la bolletta: in questa visualizzazione non si possono inviare immagini. Prova con il PDF originale.");
    const prompt = PROMPT +
      `\n\nTi passo ${immagini.length ? `le immagini di ${immagini.length} pagine` : "nessuna immagine"}` +
      (testo.trim() ? " e il testo estratto dal PDF (usa il testo per i numeri, le immagini per capire la struttura delle tabelle)." : ".") +
      (testo.trim() ? `\n\n<testo_bolletta>\n${testo.slice(0, 120000)}\n</testo_bolletta>` : "") +
      `\n\nRispondi SOLO con un oggetto JSON con esattamente questa struttura (i valori indicano il tipo atteso; usa null dove manca il dato; luce o gas interi a null se assenti):\n` +
      JSON.stringify(scheletro(SCHEMA), null, 1);
    onStatus?.("Analisi della bolletta con l'AI… (di solito 20-60 secondi)");
    try {
      const out = await sample.json(prompt, { images: immagini.length ? immagini : undefined, modelTier: "default", effort: "medium", cache: false });
      if (!out || typeof out !== "object") throw { code: "invalid_json" };
      return out;
    } catch (e) {
      const msg = {
        not_granted: "Non hai autorizzato l'uso di Claude per questa pagina. Compila i dati a mano.",
        sampling_disabled: "Claude non è disponibile per il tuo account.",
        rate_limited: "Hai raggiunto il limite di utilizzo di Claude. Riprova più tardi.",
        session_expired: "Sessione scaduta: accedi di nuovo a claude.ai.",
        image_rejected: "Una delle immagini non è stata accettata. Prova con un altro file.",
        images_unavailable: "Questa visualizzazione non può inviare immagini: usa il PDF originale.",
        invalid_json: "L'AI non ha restituito dati leggibili. Riprova.",
        refused: "Claude non ha elaborato questo documento. Compila i dati a mano.",
        prompt_too_large: "La bolletta è troppo lunga: carica solo le pagine con i riepiloghi."
      }[e && e.code];
      throw new Error(msg || (e && e.message) || "Errore durante l'analisi. Riprova.");
    }
  }

  async function estrai(files, settings, onStatus) {
    if (window.Store && Store.mode === "online") return estraiOnline(files, onStatus);
    // server o PC: stesso percorso; sul server la chiave è quella aziendale custodita da Alca
    return estraiBolletta(files, settings, onStatus);
  }

  /* ================= Import offerte (Excel / PDF / foto) con l'AI ================= */
  const isXlsx = f => /\.(xlsx|xlsm|xls|csv|txt)$/i.test(f.name);
  async function xlsxTesto(file) {
    if (/\.(csv|txt)$/i.test(file.name)) return `\n--- ${file.name} ---\n` + (await file.text());
    const XLSX = await window.Importer.loadXLSX();
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", cellDates: true });
    let out = "";
    for (const n of wb.SheetNames) {
      const csv = XLSX.utils.sheet_to_csv(wb.Sheets[n], { FS: " ; ", blankrows: false, dateNF: "yyyy-mm-dd" }).replace(/( ; )+$/gm, "");
      if (csv.trim()) out += `\n--- ${file.name} · foglio "${n}" ---\n${csv}\n`;
    }
    return out;
  }

  const ENUM = (v) => (E([...v]));
  const SCHEMA_OFFERTE = obj({
    offerte: { type: "array", items: obj({
      commodity: { type: "string", enum: ["luce", "gas"] },
      azione: { type: "string", enum: ["nuova", "aggiorna", "chiudi"] },
      corrisponde_a: N("string"),
      azienda: { type: "string" }, nome: { type: "string" },
      inizio: N("string"), fine: N("string"),
      tipologia: ENUM(["Fissa", "Variabile"]), fascia: ENUM(["Monoraria", "Bioraria", "Trioraria"]),
      p1: N("number"), p2: N("number"), p3: N("number"), spread: N("number"), ccv: N("number"), ccvScontata: N("number"),
      contratto: ENUM(["single", "dual"]), operazioni: N("string"), pagamento: N("string"), canali: N("string"), restrizioni: N("string"), note: N("string"),
      unita_prezzo: N("string")
    }) },
    avvisi: { type: "array", items: { type: "string" } }
  });

  function promptOfferte(catalogo, destinazione) {
    return `Sei un esperto di offerte luce e gas del mercato libero italiano, per clienti business (partita IVA) e domestici (privati).
Ti passo uno o più documenti (testo incollato, Excel convertiti in testo, PDF di schede offerta / condizioni economiche / comunicazioni commerciali, foto) e l'elenco delle offerte già presenti nel catalogo "${destinazione}".
Estrai TUTTE le offerte luce e gas presenti nei documenti e confrontale con il catalogo.

Per ogni offerta:
- "commodity": "luce" o "gas".
- "azione": "nuova" se non è nel catalogo; "aggiorna" se è già nel catalogo (stesso fornitore e stessa offerta, anche con nome scritto in modo leggermente diverso) e qualche dato è cambiato o va confermato; "chiudi" se il documento comunica che l'offerta è chiusa/ritirata/sospesa.
- "corrisponde_a": l'id dell'offerta del catalogo che corrisponde (per "aggiorna" e "chiudi"), altrimenti null.
- "azienda": nome del fornitore come scritto nel catalogo se già presente (es. "Sorgenia", "Eni Plenitude", "IREN Mercato S.p.A.").
- "inizio"/"fine": date di validità (sottoscrizione) in formato YYYY-MM-DD, null se non indicate.
- "tipologia": "Fissa" (prezzo bloccato) o "Variabile" (indicizzata PUN/PSV).
- "fascia" (solo luce): "Monoraria", "Bioraria" (F1 / F23) o "Trioraria"; null per il gas.
- Prezzi IVA e imposte escluse, in €/kWh per la luce e €/Smc per il gas, numeri con il punto decimale:
  - offerte fisse: "p1" = prezzo F0 o F1 (o prezzo unico gas), "p2" = F2 o F23, "p3" = F3; "spread" null;
  - offerte variabili: "spread" = maggiorazione sull'indice PUN/PSV (es. PUN + 0,019 → 0.019); p1/p2/p3 null.
  - Converti SOLO in base all'unità DICHIARATA nel documento: €/MWh → dividi per 1000; c€/kWh o centesimi → dividi per 100. Indica in "unita_prezzo" l'unità scritta nel documento.
  - Se l'unità non è scritta o è in contrasto con la grandezza del valore (es. 184,91 "€/kWh"), NON convertire: riporta il valore com'è, metti "unita_prezzo": "non dichiarata" o "incoerente" e segnalalo negli avvisi.
- "ccv": quota fissa / commercializzazione di LISTINO in €/ANNO per punto di fornitura (se è €/mese moltiplica per 12; se è €/giorno per 365).
- "ccvScontata": se il documento riporta anche la quota fissa al netto di sconti/bonus (es. "CCV 13,25 €/mese 4,25 €/mese - 159 €/anno 51 €/anno": listino 159, scontata 51), il valore scontato in €/anno; altrimenti null.
- "contratto": "dual" se l'offerta vale solo in abbinamento luce+gas (nome con "Dual", bundle), "single" se solo singola; null se vale per entrambi.
- "operazioni": tra "Switch-in, Switch con Voltura, Prima Attivazione, Subentro, Voltura, Posa Contatore" quelle ammesse, separate da virgola ("Switch" = "Switch-in"; ignora le varianti "Dual", "Bundle", "Altri Usi", "Firma Digitale"); null se non indicato.
- "pagamento": "RID", "Bollettino" o "RID, Bollettino"; null se non indicato.
- "canali": canali di vendita (es. "Call Center, Store, FP"); null se non indicato.
- "restrizioni": limitazioni (es. "NO CONDOMINI", "ALTRI USI, INTESTATO A PERSONA FISICA", "fino a 16,5 kW"); null se nessuna. Scrivi UNA condizione per frase, separate da ". ", con queste formule che l'app controlla in automatico sui dati della bolletta: "Non vendibile in Campania, Puglia" / "Solo Sardegna" (regioni per esteso); "Non vendibile ad Acerra, Casoria, Napoli 80126/80145" (comuni e CAP); "Max 6.000 kWh/anno", "Max 10 kW", "Da 3 a 25 kW"; "No clienti uscenti da Egea, Sev"; "Solo POD e-distribuzione, Areti"; "Campania, Sicilia solo SDD". Le altre condizioni (età, morosità, bolletta digitale…) scrivile brevi.
- "note": sconti, bonus, durata del prezzo, vincoli/oneri di recesso, limiti di consumo o potenza, scaglioni di prezzo (breve, max 300 caratteri).
- Listini in formato tabellare/testo (es. portali partner con colonne Offerta, Tipologia, Attivazione, Validità "Attivo dal … al …", Prezzo "PUN 0,254 € Spread 0,009 €", Costi aggiuntivi variabili, CCV, Note, Metodo di pagamento, Durata prezzo, Restrizioni, Limitazioni geografiche): la riga che inizia con il nome del fornitore apre una nuova offerta; "Attivo dal 1 nov 2026 al 30 nov 2026" → inizio 2026-11-01, fine 2026-11-30; per le indicizzate prendi lo SPREAD (non il PUN del mese); per le biorarie/triorarie con spread uguale su tutte le fasce usa quello spread; "Costi aggiuntivi variabili" e il deposito cauzionale vanno nelle note, non nel prezzo. Restrizioni = restrizioni di vendita + limitazioni geografiche (riassunte). Offerte a CANONE fisso mensile (senza prezzo per kWh/Smc) non sono confrontabili: non inserirle e segnalale negli avvisi.
Usa null per i dati che non trovi: non inventare. Se un documento contiene la stessa offerta in versione "single" e "dual", crea due offerte distinte (nomi diversi, es. "… Single" e "… Dual").
Negli "avvisi" scrivi in italiano incongruenze, dati mancanti importanti, pagine illeggibili.

CATALOGO ATTUALE (id | commodity | azienda | offerta | tipologia | fascia | prezzi | ccv €/anno | valida fino):
${catalogo}`;
  }

  async function estraiOfferte(files, settings, catalogo, destinazione, onStatus) {
    if (!files.length) throw new Error("Carica almeno un file.");
    const online = window.Store && Store.mode === "online";
    if (!online && !settings.apiKey && !suServer()) throw new Error("Inserisci la chiave API di Anthropic in Impostazioni.");
    let testo = "";
    const allegati = [];  // file PDF/immagini
    for (const f of files) {
      if (isXlsx(f)) { onStatus?.(`Lettura di ${f.name}…`); testo += await xlsxTesto(f); }
      else { mediaType(f); allegati.push(f); }
    }
    if (testo.length > 150000) testo = testo.slice(0, 150000) + "\n[...testo troncato...]";
    const prompt = promptOfferte(catalogo, destinazione) + (testo ? `\n\n<documenti_excel>\n${testo}\n</documenti_excel>` : "");

    if (!online) {
      const content = [];
      for (const f of allegati) {
        const mt = mediaType(f), data = await readAsBase64(f);
        content.push(mt === "application/pdf" ? { type: "document", source: { type: "base64", media_type: mt, data }, title: f.name } : { type: "image", source: { type: "base64", media_type: mt, data } });
      }
      content.push({ type: "text", text: prompt });
      const body = { model: settings.model || "claude-opus-5-5", max_tokens: 32000,
        output_config: { effort: settings.effort || "medium", format: { type: "json_schema", schema: SCHEMA_OFFERTE } }, messages: [{ role: "user", content }] };
      if (FALLBACK_MODELS.includes(body.model)) body.fallbacks = "default";
      onStatus?.("L'AI sta leggendo le offerte… (può richiedere 1-2 minuti)");
      let msg;
      try { msg = await call(settings, body, "offerte"); }
      catch (e) {
        if (e.status === 400 && /schema|format|output_config|fallback/i.test(e.message)) {
          delete body.output_config.format; delete body.fallbacks;
          content[content.length - 1] = { type: "text", text: prompt + "\n\nRispondi SOLO con un oggetto JSON con questa struttura:\n" + JSON.stringify(SCHEMA_OFFERTE) };
          msg = await call(settings, body, "offerte");
        } else if (e.status === 401) throw new Error("Chiave API non valida (401). Controlla Impostazioni.");
        else throw e;
      }
      return parseRisposta(msg);
    }

    const sample = await window.claude.use("sample");
    if (!sample) throw new Error("L'AI non è disponibile in questa visualizzazione: accedi a claude.ai.");
    const lim = await sample.limits().catch(() => null);
    const maxImg = lim?.images?.maxCount || 0;
    let testoPdf = "", immagini = [];
    for (const f of allegati) {
      if (mediaType(f) === "application/pdf") {
        onStatus?.(`Lettura di ${f.name}…`);
        const r = await leggiPdf(f, Math.max(0, maxImg - immagini.length));
        testoPdf += r.testo; immagini.push(...r.immagini);
      } else if (immagini.length < maxImg) immagini.push(f);
    }
    const full = prompt + (testoPdf.trim() ? `\n\n<testo_pdf>\n${testoPdf.slice(0, 120000)}\n</testo_pdf>` : "") +
      (immagini.length ? `\n\nTi passo anche le immagini di ${immagini.length} pagine.` : "") +
      `\n\nRispondi SOLO con un oggetto JSON con esattamente questa struttura (i valori indicano il tipo atteso):\n` + JSON.stringify(scheletro(SCHEMA_OFFERTE), null, 1);
    onStatus?.("L'AI sta leggendo le offerte… (può richiedere 1-2 minuti)");
    try {
      const out = await sample.json(full, { images: immagini.length ? immagini : undefined, modelTier: "default", effort: "medium", cache: false });
      if (!out || typeof out !== "object" || !Array.isArray(out.offerte)) throw { code: "invalid_json" };
      return out;
    } catch (e) {
      const msg = { not_granted: "Non hai autorizzato l'uso di Claude per questa pagina.", rate_limited: "Hai raggiunto il limite di utilizzo di Claude. Riprova più tardi.",
        invalid_json: "L'AI non ha restituito dati leggibili. Riprova.", prompt_too_large: "Documenti troppo lunghi: carica meno file o meno pagine.",
        images_unavailable: "Questa visualizzazione non può inviare immagini: usa PDF digitali o Excel." }[e && e.code];
      throw new Error(msg || (e && e.message) || "Errore durante l'analisi. Riprova.");
    }
  }

  window.AI = { estraiBolletta: estrai, estraiOfferte, SCHEMA, SCHEMA_OFFERTE, PROMPT };   // PROMPT e SCHEMA li usa anche il server (referral pubblici)
})();
