/* Alca Energy · menu "Referral": link personali con QR, personalizzazione della pagina "Il prezzo giusto per te",
   preventivi arrivati dai link, destinazioni (solo amministratore). Solo nella versione con server. */
(function () {
  if (!window.Server || !Server.attivo) { window.Referral = null; return; }
  const $ = s => document.querySelector(s);
  const db = () => Server.db();
  let U = {};
  const esc = s => U.esc ? U.esc(s) : String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dtIt = d => d ? new Date(d).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" }) : "—";
  const eur = v => v == null ? "—" : Number(v).toLocaleString("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  // i link da condividere usano sempre il dominio ufficiale (config.js → appUrl), anche se il portale è aperto da un altro indirizzo
  const BASE = () => (window.ALCA_CONFIG?.appUrl || location.origin).replace(/\/$/, "");
  const urlLink = c => `${BASE()}/prezzo-giusto/${c}`;
  const nomeOp = o => o ? `${o.nome} ${o.cognome}${o.codice_agente ? " (" + o.codice_agente + ")" : ""}` : "—";
  const FUNZIONE = "referral-v11";
  const CANALE = { email: "email", telefono: "telefono", whatsapp: "WhatsApp" };
  const STATI = { in_attesa_conferma: ["Email da confermare", "warn"], confermata: ["Confermata", ""], in_elaborazione: ["In analisi", ""], stima_pronta: ["Stima inviata", "good"],
    non_disponibile: ["Stima non disponibile", "warn"], errore: ["Errore analisi", "bad"], scaduta: ["Non confermata (scaduta)", ""], verifica_documento: ["Documento da verificare", "warn"],
    oscuramento_richiesto: ["Attende versione oscurata", "warn"], integrazione_richiesta: ["Servono altri dati", "warn"], chiusa: ["Chiusa (termini scaduti)", ""] };
  const GESTIONE = { da_gestire: "Da gestire", in_lavorazione: "In lavorazione", completato: "Completato" };
  const NOTIFICA = { conferma_inviata: "email di conferma inviata", stima_inviata: "stima inviata", email_non_configurata: "email non ancora configurata sul server", email_credenziali_errate: "email NON inviata: Google rifiuta utente/password SMTP", monitoraggio_inviato: "avviso di monitoraggio inviato" };

  /* stessi valori predefiniti della funzione server referral-v11 */
  const PRED = {
    intestazione: { titolo: "il prezzo giusto per te", sottotitolo: "Il tuo referente luce e gas" },
    testata: { etichetta: "Luce e gas · stima orientativa", titolo: "Il prezzo giusto\nper le tue", evidenziato: "bollette.", descrizione: "Carica una bolletta di luce o gas e ricevi gratuitamente una stima personalizzata del possibile risparmio con le offerte attivabili. Se lo desideri, puoi attivare anche il monitoraggio periodico." },
    modello: "fiducia", modelli: {}, videoLink: {}, // modello della pagina; modelli e videoLink = scelte diverse per singolo link (codice → valore)
    referente: { nome: "", ruolo: "Il tuo referente", telefono: "", whatsapp: "", email: "", presentazione: "", foto: "" },
    colori: { accento: "#0a6b5c", barra: "#0b2e2a", sfondo: "#f2f5f5", modulo: "#ffffff", sezioni: "#ffffff" },
    sezioni: { fiducia: true, trePassi: true, video: false },
    email: { accento: "#0a6b5c", sfondo: "#f2f5f5", card: "#ffffff", intestazione: "il prezzo giusto per te.",
      conferma: { oggetto: "Conferma l'email per la tua richiesta Alca Energy", titolo: "Conferma la tua email", messaggio: "" },
      stima: { oggetto: "La tua stima Alca Energy è disponibile", titolo: "La tua stima è disponibile", messaggio: "" },
      monitoraggio: { oggetto: "Un aggiornamento dal monitoraggio Alca Energy", titolo: "Un aggiornamento dal monitoraggio", messaggio: "" }, firma: "" }
  };
  const getP = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
  const setP = (o, p, v) => { const ks = p.split("."); let x = o; ks.slice(0, -1).forEach(k => x = x[k] ??= {}); x[ks.at(-1)] = v; };
  const unisci = (a, b) => { const o = { ...a }; for (const [k, v] of Object.entries(b || {})) o[k] = v && typeof v === "object" && !Array.isArray(v) && a?.[k] && typeof a[k] === "object" ? unisci(a[k], v) : v; return o; };

  /* modelli grafici delle pagine dei referenti (css/link.css) */
  const MODELLI = {
    fiducia: { nome: "Fiducia", nota: "Verde e lime. Referente e titolo a sinistra, modulo subito a destra.", sfondo: "#0e3b2e", testo: "#ffffff", risalto: "#d6f26b", su: "#0e3b2e", bottone: "#0e3b2e", suBottone: "#ffffff" },
    vicino: { nome: "Vicino", nota: "Crema e corallo. Foto tonda grande al centro, come un messaggio personale.", sfondo: "#ffe7d8", testo: "#33182a", risalto: "#b8402a", su: "#ffffff", bottone: "#b8402a", suBottone: "#ffffff" },
    energia: { nome: "Energia", nota: "Blu e giallo. Titolo enorme, poi referente e modulo: il più d'impatto.", sfondo: "#1a2bc4", testo: "#ffffff", risalto: "#ffd60a", su: "#0d1440", bottone: "#ffd60a", suBottone: "#0d1440" }
  };
  const modOk = m => Object.hasOwn(MODELLI, m || "");
  const iniz = n => (n || "").split(/\s+/).map(x => x[0] || "").join("").slice(0, 2).toUpperCase();
  const fotoOk = f => /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(f || "");
  const miniatura = k => { const m = MODELLI[k], o = `<i class="o" style="background:${m.risalto}"></i>`, b = `<i class="b" style="background:${m.testo}"></i>`, c = `<i class="c"></i>`;
    return `<span class="rf-mini ${k}" style="background:${m.sfondo}">${k === "fiducia" ? `<span>${o}${b}${b}</span>${c}` : k === "vicino" ? `${o}${b}${c}` : `<span>${b}${b}</span>${o}${c}`}</span>`; };
  /* foto del referente: qualsiasi immagine che il browser sa aprire (JPG, PNG, WebP, GIF, BMP, AVIF, SVG…), riconosciuta dal contenuto e non dall'estensione.
     Ritaglio quadrato (un po' verso l'alto, dove di solito c'è il viso), riduzione a 480 px e conversione in JPEG su fondo bianco. */
  async function riduciFoto(file) {
    if (file.size > 25 * 1048576) throw new Error("La foto supera 25 MB: usane una più leggera.");
    const est = (file.name || "").split(".").pop().toLowerCase(), img = new Image(), url = URL.createObjectURL(file);
    try {
      await new Promise((ok, ko) => { img.onload = ok; img.src = url; img.onerror = () => ko(new Error(
        /^hei[cf]$/.test(est) || /hei[cf]/.test(file.type) ? "Le foto HEIC dell'iPhone non si aprono in questo browser: caricala dall'iPhone con Safari, oppure apri la foto sul computer, fai uno screenshot e incollalo qui con Ctrl+V."
          : /^tiff?$/.test(est) || /tiff/.test(file.type) ? "Il formato TIFF non si apre nel browser: salva la foto in JPG o PNG, oppure incolla uno screenshot con Ctrl+V."
          : "Questo file non è un'immagine leggibile. Prova con JPG o PNG, oppure incolla uno screenshot con Ctrl+V.")); });
      const w = img.naturalWidth || 480, h = img.naturalHeight || 480, l = Math.min(w, h);
      if (l < 60) throw new Error(`L'immagine è troppo piccola (${w}×${h} pixel): servono almeno 60 pixel per lato.`);
      const c = document.createElement("canvas"); c.width = c.height = Math.min(480, l);
      const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.imageSmoothingQuality = "high";
      g.drawImage(img, (w - l) / 2, (h - l) * .25, l, l, 0, 0, c.width, c.height);
      return { dati: c.toDataURL("image/jpeg", .86), piccola: l < 200 ? l : 0 };
    } finally { URL.revokeObjectURL(url); }
  }
  // salva una scelta per un singolo link (campo "modelli" o "videoLink") senza toccare il resto della pagina; undefined = come la pagina.
  // Una alla volta: due modifiche ravvicinate non si sovrascrivono.
  let coda = Promise.resolve();
  const salvaSceltaLink = (...a) => { const p = coda.then(() => scriviSceltaLink(...a)); coda = p.catch(() => { }); return p; };
  async function scriviSceltaLink(opId, codice, campo, valore) {
    const { data: x, error: e1 } = await db().from("referral_config").select("config").eq("operatore_id", opId).maybeSingle(); if (e1) throw e1;
    const config = x?.config || {}, m = { ...(config[campo] || {}) };
    if (valore === undefined) delete m[codice]; else m[codice] = valore;
    config[campo] = m;
    const q = x ? db().from("referral_config").update({ config }).eq("operatore_id", opId).select("operatore_id") : db().from("referral_config").insert({ operatore_id: opId, config }).select("operatore_id");
    const { data, error } = await q; if (error) throw error;
    if (!data?.length) throw new Error("Non puoi cambiare questo link");
  }

  /* QR (libreria qrcode-generator da cdnjs, caricata solo quando serve) */
  let _qr;
  const libQR = () => _qr ||= new Promise((ok, ko) => { const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js"; s.onload = () => ok(window.qrcode); s.onerror = () => ko(new Error("Libreria QR non caricata")); document.head.appendChild(s); });
  async function qrSvg(testo, lato = 8, margine = 4) {
    const qrcode = await libQR(); const q = qrcode(0, "M"); q.addData(testo); q.make();
    const n = q.getModuleCount(), dim = (n + margine * 2) * lato; let p = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${(c + margine) * lato},${(r + margine) * lato}h${lato}v${lato}h-${lato}z`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" width="${dim}" height="${dim}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${p}" fill="#000"/></svg>`;
  }
  const scarica = (blob, nome) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nome; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };

  const Referral = {
    sez: "link",
    async disegna(sec, util) {
      U = util || U; this.sec = sec;
      const pr = Server.profilo, admin = pr.ruolo === "admin";
      const SEZ = [["link", "I miei link"], ["pagina", "Personalizza pagina"], ["preventivi", "Preventivi referral"]].concat(admin ? [["destinazioni", "Destinazioni"]] : []);
      if (!SEZ.some(s => s[0] === this.sez)) this.sez = "link";
      sec.innerHTML = `<div class="card"><div class="card-head"><div><h2>Referral · il prezzo giusto per te</h2><div class="muted small">Il cliente apre il tuo link, carica la bolletta e riceve la stima via email; la richiesta entra nel CRM a tuo nome (canale Referral).</div></div>
        <div class="seg" id="rf-seg">${SEZ.map(([k, t]) => `<button data-s="${k}" class="${k === this.sez ? "active" : ""}">${t}</button>`).join("")}</div></div><div id="rf-corpo"><div class="empty"><span class="spinner"></span>Caricamento…</div></div></div>`;
      sec.querySelectorAll("#rf-seg button").forEach(b => b.onclick = () => { this.sez = b.dataset.s; this.disegna(sec); });
      try { await this[this.sez]($("#rf-corpo")); } catch (e) { $("#rf-corpo").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; }
    },

    async operatori() {
      if (!Server.profilo.ufficio) return [Server.profilo];
      const { data } = await db().from("operatori").select("id, nome, cognome, codice_agente, ruolo, stato").neq("ruolo", "segnalatore").neq("stato", "disattivato").order("cognome");
      return data || [];
    },

    /* ------------------------------ link + QR ------------------------------ */
    async link(el) {
      const pr = Server.profilo;
      const [{ data: links, error }, { data: conti }, ops, { data: confs }] = await Promise.all([
        db().from("referral_link").select("id, codice, nome, attivo, created_at, operatore_id, operatore:operatori!referral_link_operatore_id_fkey(nome, cognome, codice_agente)").order("created_at", { ascending: false }),
        db().from("richieste_referral").select("link_id, stato").limit(5000), this.operatori(),
        db().from("referral_config").select("operatore_id, modello:config->>modello, modelli:config->modelli, video:config->sezioni->video, videoLink:config->videoLink")]);
      const conf = {}; (confs || []).forEach(c => conf[c.operatore_id] = c);
      const selVid = (l, c) => { const v = c?.videoLink?.[l.codice], o = (val, et, si) => `<option value="${val}" ${si ? "selected" : ""}>${et}</option>`;
        return `<select data-vid="${esc(l.codice)}" data-op="${l.operatore_id}" aria-label="Video nel link" style="margin-top:6px">${o("", `Video: come la pagina (${c?.video === true ? "sì" : "no"})`, typeof v !== "boolean")}${o("si", "Video: sì", v === true)}${o("no", "Video: no", v === false)}</select>`; };
      const selMod = l => { const mio = pr.ufficio || l.operatore_id === pr.id, c = conf[l.operatore_id], gen = MODELLI[modOk(c?.modello) ? c.modello : "fiducia"].nome, v = c?.modelli?.[l.codice] || "";
        if (l.codice === (window.ALCA_CONFIG?.codiceSito || "ALCASITO")) return `<span class="muted">Home del sito</span>`;
        return mio ? `<select data-mod="${esc(l.codice)}" data-op="${l.operatore_id}" aria-label="Modello della pagina"><option value="">Come la pagina (${gen})</option>${Object.entries(MODELLI).map(([k, m]) => `<option value="${k}" ${k === v ? "selected" : ""}>${m.nome}</option>`).join("")}</select>${selVid(l, c)}` : MODELLI[modOk(v) ? v : "fiducia"].nome; };
      if (error) throw error;
      const n = {}; (conti || []).forEach(r => { const x = n[r.link_id] ||= { tot: 0, ok: 0 }; x.tot++; if (r.stato === "stima_pronta") x.ok++; });
      el.innerHTML = `<div class="rf-nuovo">
          <div class="rf-nuovo-tit"><b>Crea un nuovo link</b><span class="muted small">Un link per ogni uso (biglietti, vetrina, partner): così vedi da dove arrivano le richieste. Per fare un test crea due link, cambia solo il modello o solo il video e confronta richieste e stime.</span></div>
          <div class="rf-nuovo-campi${pr.ufficio ? " con-op" : ""}">
            <label class="f">Nome del link (lo vedi solo tu)<input id="rf-nome" placeholder="es. Biglietto da visita, Studio Rossi, Fiera 2026" maxlength="80"></label>
            ${pr.ufficio ? `<label class="f">Collaboratore a cui arrivano le richieste<select id="rf-op">${ops.map(o => `<option value="${o.id}" ${o.id === pr.id ? "selected" : ""}>${esc(nomeOp(o))}</option>`).join("")}</select></label>` : ""}
            <button class="btn primary" id="rf-crea">+ Crea link</button>
          </div></div>
        ${links.length ? `<div class="table-wrap"><table><thead><tr><th>Link</th>${pr.ufficio ? "<th>Collaboratore</th>" : ""}<th>Modello e video</th><th>Richieste</th><th>Stato</th><th></th></tr></thead><tbody>
          ${links.map(l => `<tr><td><b>${esc(l.nome)}</b><div class="small"><a href="${esc(urlLink(l.codice))}" target="_blank" rel="noopener">${esc(urlLink(l.codice))}</a></div><div class="muted small">creato ${dtIt(l.created_at)}</div></td>
            ${pr.ufficio ? `<td class="small">${esc(nomeOp(l.operatore))}</td>` : ""}
            <td class="small">${selMod(l)}</td>
            <td class="small">${n[l.id]?.tot || 0} richieste<div class="muted">${n[l.id]?.ok || 0} stime inviate</div></td>
            <td>${l.attivo ? '<span class="pill good">Attivo</span>' : '<span class="pill">Disattivato</span>'}</td>
            <td><div class="btn-row nowrap"><button class="btn sm" data-copia="${esc(l.codice)}">Copia</button><button class="btn sm" data-qr="${esc(l.codice)}" data-nome="${esc(l.nome)}">QR code</button>
              <button class="btn sm" data-att="${l.id}" data-v="${l.attivo ? "0" : "1"}">${l.attivo ? "Disattiva" : "Riattiva"}</button></div></td></tr>`).join("")}</tbody></table></div>`
          : `<div class="empty">Non hai ancora link. Dai un nome e premi <b>Crea link</b>: poi condividilo o stampa il QR code.</div>`}`;
      $("#rf-crea").onclick = async () => {
        const nome = $("#rf-nome").value.trim(); if (!nome) { U.toast("Dai un nome al link"); return; }
        const { error } = await db().from("referral_link").insert({ nome, operatore_id: $("#rf-op")?.value || pr.id });
        if (error) { U.toast(error.message); return; }
        U.toast("Link creato"); this.disegna(this.sec);
      };
      el.querySelectorAll("[data-copia]").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(urlLink(b.dataset.copia)); U.toast("Link copiato"); } catch { U.toast(urlLink(b.dataset.copia)); } });
      el.querySelectorAll("[data-att]").forEach(b => b.onclick = async () => {
        const { error } = await db().from("referral_link").update({ attivo: b.dataset.v === "1" }).eq("id", b.dataset.att);
        if (error) U.toast(error.message); else this.disegna(this.sec);
      });
      el.querySelectorAll("[data-vid]").forEach(s => s.onchange = async () => {
        s.disabled = true; try { await salvaSceltaLink(s.dataset.op, s.dataset.vid, "videoLink", s.value === "" ? undefined : s.value === "si"); U.toast("Video del link salvato"); } catch (e) { U.toast(e.message); this.disegna(this.sec); }
        s.disabled = false;
      });
      el.querySelectorAll("[data-mod]").forEach(s => s.onchange = async () => {
        s.disabled = true; try { await salvaSceltaLink(s.dataset.op, s.dataset.mod, "modelli", modOk(s.value) ? s.value : undefined); U.toast("Modello del link salvato"); } catch (e) { U.toast(e.message); this.disegna(this.sec); }
        s.disabled = false;
      });
      el.querySelectorAll("[data-qr]").forEach(b => b.onclick = () => this.qr(b.dataset.qr, b.dataset.nome));
    },

    async qr(codice, nome) {
      const url = urlLink(codice);
      let svg; try { svg = await qrSvg(url); } catch (e) { U.toast(e.message); return; }
      const file = "qr-prezzo-giusto-" + codice;
      U.dialog("QR code · " + nome, `<div style="text-align:center"><div id="rf-qr" style="width:240px;margin:0 auto">${svg.replace(/width="\d+" height="\d+"/, 'width="240" height="240"')}</div>
        <p class="small" style="word-break:break-all">${esc(url)}</p><p class="muted small">Stampalo su biglietti, volantini o in vetrina: chi lo inquadra apre la tua pagina.</p></div>`,
        [{ label: "Chiudi" },
         { label: "Scarica SVG", onClick: () => { scarica(new Blob([svg], { type: "image/svg+xml" }), file + ".svg"); return false; } },
         { label: "Scarica PNG", onClick: async () => {
             const img = new Image(); img.src = "data:image/svg+xml;base64," + btoa(svg); await img.decode();
             const c = document.createElement("canvas"); c.width = c.height = 1024; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, 1024, 1024);
             c.toBlob(b => scarica(b, file + ".png"), "image/png"); return false; } },
         { label: "Stampa", primary: true, onClick: () => {
             const w = window.open("", "_blank", "width=600,height=800"); if (!w) { U.toast("Consenti le finestre popup per stampare"); return false; }
             w.document.write(`<!doctype html><title>${esc(nome)}</title><body style="font-family:Arial,sans-serif;text-align:center;padding:40px"><h2>Il prezzo giusto per le tue bollette</h2><p>Inquadra il codice e carica la bolletta: ricevi gratis la stima.</p>${svg.replace(/width="\d+" height="\d+"/, 'width="320" height="320"')}<p style="font-size:12px;word-break:break-all">${esc(url)}</p><script>onload=()=>{print()}<\/script></body>`);
             w.document.close(); return false; } }]);
    },

    /* ------------------------------ personalizzazione ------------------------------ */
    async pagina(el) {
      const pr = Server.profilo, ops = await this.operatori();
      if (pr.ufficio) { // anche chi ha un link ma non è tra i collaboratori (es. Team Energia, il referente della home)
        const { data: lk } = await db().from("referral_link").select("operatore:operatori!referral_link_operatore_id_fkey(id, nome, cognome, codice_agente, stato)").eq("attivo", true);
        for (const { operatore: o } of lk || []) if (o && o.stato !== "disattivato" && !ops.some(x => x.id === o.id)) ops.push(o);
      }
      const opId = this._op && ops.some(o => o.id === this._op) ? this._op : pr.id;
      const op = ops.find(o => o.id === opId) || pr;
      const [{ data: conf }, { data: link }, { data: opInfo }] = await Promise.all([
        db().from("referral_config").select("config, logo_path, versione, updated_at").eq("operatore_id", opId).maybeSingle(),
        db().from("referral_link").select("codice").eq("operatore_id", opId).eq("attivo", true).order("created_at").limit(1).maybeSingle(),
        db().from("operatori").select("nome, cognome, email, telefono").eq("id", opId).maybeSingle()]);
      const base = unisci(PRED, { referente: { nome: `${opInfo?.nome || ""} ${opInfo?.cognome || ""}`.trim(), email: opInfo?.email || "", telefono: opInfo?.telefono || "" } });
      const C = unisci(base, conf?.config || {});
      let logoPath = conf?.logo_path || null, logoNuovo = null;
      const logoUrl = () => logoNuovo ? URL.createObjectURL(logoNuovo) : logoPath ? Server.sb.storage.from("energy-loghi").getPublicUrl(logoPath).data.publicUrl : "assets/logo-alca.png";
      const t = (p, et, opz = {}) => `<label class="f ${opz.largo ? "span2" : ""}">${et}${opz.area ? `<textarea data-p="${p}" rows="${opz.area}">${esc(getP(C, p))}</textarea>` : `<input data-p="${p}" value="${esc(getP(C, p))}" ${opz.ph ? `placeholder="${esc(opz.ph)}"` : ""}>`}</label>`;
      const col = (p, et) => `<label class="f">${et}<input type="color" data-p="${p}" value="${esc(getP(C, p))}"></label>`;
      const chk = (p, et) => `<label class="check"><input type="checkbox" data-p="${p}" ${getP(C, p) !== false ? "checked" : ""}> ${et}</label>`;
      el.innerHTML = `
        ${pr.ufficio ? `<label class="f" style="max-width:360px">Pagina del collaboratore<select id="rf-pop">${ops.map(o => `<option value="${o.id}" ${o.id === opId ? "selected" : ""}>${esc(nomeOp(o))}</option>`).join("")}</select></label>` : ""}
        <div class="rf-layout">
        <div>
          <h3 style="margin-top:8px">Modello della pagina</h3>
          <div class="rf-modelli" role="radiogroup" aria-label="Modello della pagina">${Object.entries(MODELLI).map(([k, m]) => `<label class="rf-modello"><input type="radio" name="rf-modello" value="${k}" ${k === (modOk(C.modello) ? C.modello : "fiducia") ? "checked" : ""}>${miniatura(k)}<b>${m.nome}</b><small>${m.nota}</small>${link?.codice ? `<a href="${esc(urlLink(link.codice))}?modello=${k}" target="_blank" rel="noopener">Prova dal vivo</a>` : ""}</label>`).join("")}</div>
          <p class="muted small" style="margin-top:6px">Vale per tutti i link di questo referente; nella scheda «I miei link» puoi dare a un link un modello diverso, per fare i test. «Prova dal vivo» usa i dati già salvati. La home del sito ha una grafica sua.</p>
          <h3>Foto del referente</h3>
          <div class="rf-fotobox"><span id="rf-foto" class="rf-foto"></span><div><div class="btn-row"><label class="btn sm">Carica foto<input type="file" id="rf-fotof" accept="image/*,.heic,.heif,.avif,.bmp,.jfif,.tif,.tiff" hidden></label><button class="btn sm" id="rf-fotox" type="button">Togli foto</button></div>
            <p class="small rf-fotomsg" id="rf-fotomsg" role="status" hidden></p>
            <p class="muted small" style="margin:6px 0 0">Puoi anche <b>trascinarla qui</b> o <b>incollare uno screenshot con Ctrl+V</b>. Va bene quasi ogni formato (JPG, PNG, WebP, GIF, BMP, AVIF…). Prende il posto delle iniziali. Viene ritagliata quadrata: meglio un primo piano con il viso al centro. Carica solo la foto della persona indicata, con il suo consenso: la vede chiunque apra il link.</p></div></div>
          <h3>Logo e intestazione</h3>
          <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px"><img id="rf-logo" src="${esc(logoUrl())}" alt="" style="height:48px;max-width:160px;object-fit:contain;border:1px solid #dfe6e5;border-radius:8px;padding:4px;background:#fff">
            <label class="btn sm">Carica logo<input type="file" id="rf-logof" accept="image/png,image/jpeg" hidden></label>${logoPath ? `<button class="btn sm" id="rf-logox">Usa logo Alca</button>` : ""}</div>
          <p class="muted small" style="margin-top:0">PNG o JPG, massimo 512 KB. Compare nella pagina e nelle email.</p>
          <div class="rf-campi">${t("intestazione.titolo", "Titolo in alto")}${t("intestazione.sottotitolo", "Sottotitolo in alto")}</div>
          <h3>Testata</h3>
          <div class="rf-campi">${t("testata.etichetta", "Etichetta")}${t("testata.evidenziato", "Parola evidenziata")}${t("testata.titolo", "Titolo (vai a capo con Invio)", { largo: 1, area: 2 })}${t("testata.descrizione", "Descrizione", { largo: 1, area: 3 })}</div>
          <h3>Referente</h3>
          <div class="rf-campi">${t("referente.nome", "Nome")}${t("referente.ruolo", "Ruolo")}${t("referente.telefono", "Telefono")}${t("referente.whatsapp", "WhatsApp", { ph: "es. 333 1234567" })}${t("referente.email", "Email (riceve le risposte)")}${t("referente.presentazione", "Presentazione", { largo: 1, area: 3 })}</div>
          <h3>Sezioni</h3>${chk("sezioni.trePassi", "Come funziona (3 passi)")} ${chk("sezioni.fiducia", "Punti di fiducia")} ${chk("sezioni.video", "Mostra il video (sotto il modulo)")}
          <p class="muted small" style="margin:4px 0 0">Il video è quello della home. In «I miei link» puoi accenderlo o spegnerlo su un singolo link.${link?.codice ? ` <a href="${esc(urlLink(link.codice))}?video=si" target="_blank" rel="noopener">Prova dal vivo con il video</a>` : ""}</p>
          <h3>Email al cliente</h3>
          <p class="muted small" style="margin-top:0">Partono da energia@alcabroker.it; le risposte arrivano all'email del referente.</p>
          <div class="rf-campi rf-c3">${col("email.accento", "Accento")}${col("email.sfondo", "Sfondo")}${col("email.card", "Riquadro")}</div>
          <div class="rf-campi">${t("email.intestazione", "Intestazione", { largo: 1 })}
            ${t("email.conferma.oggetto", "Conferma · oggetto", { largo: 1 })}${t("email.conferma.titolo", "Conferma · titolo", { area: 2 })}${t("email.conferma.messaggio", "Conferma · messaggio", { area: 2 })}
            ${t("email.stima.oggetto", "Stima · oggetto", { largo: 1 })}${t("email.stima.titolo", "Stima · titolo", { area: 2 })}${t("email.stima.messaggio", "Stima · messaggio", { area: 2 })}
            ${t("email.monitoraggio.oggetto", "Offerta migliore · oggetto", { largo: 1 })}${t("email.monitoraggio.titolo", "Offerta migliore · titolo", { area: 2 })}${t("email.monitoraggio.messaggio", "Offerta migliore · messaggio", { area: 2 })}
            ${t("email.firma", "Firma", { largo: 1, area: 3 })}</div>
          <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="rf-salva">Salva</button><button class="btn" id="rf-pred">Ripristina testi predefiniti</button>
            ${link?.codice ? `<a class="btn" href="${esc(urlLink(link.codice))}" target="_blank" rel="noopener">Apri la pagina</a>` : ""}</div>
          ${conf?.updated_at ? `<p class="muted small">Ultimo salvataggio ${dtIt(conf.updated_at)}</p>` : ""}
        </div>
        <div style="position:sticky;top:12px"><h3>Anteprima</h3><div id="rf-ante"></div><h3 style="margin-top:16px">Anteprima email</h3><div id="rf-ante-mail"></div></div></div>`;
      const leggi = () => { const o = JSON.parse(JSON.stringify(C)); el.querySelectorAll("[data-p]").forEach(i => setP(o, i.dataset.p, i.type === "checkbox" ? i.checked : i.value)); o.modello = el.querySelector("[name=rf-modello]:checked")?.value || "fiducia"; o.referente.foto = foto; return o; };
      let foto = fotoOk(C.referente.foto) ? C.referente.foto : "";
      const ante = () => {
        const c = leggi(), e = c.email, logo = esc($("#rf-logo").src), m = MODELLI[c.modello], centro = c.modello === "vicino" ? "text-align:center;" : "";
        const ritratto = px => foto ? `<img src="${foto}" alt="" style="width:${px}px;height:${px}px;object-fit:cover;border-radius:${c.modello !== "fiducia" ? "50%" : "16px"};flex:none">` : `<span style="width:${px}px;height:${px}px;border-radius:${c.modello !== "fiducia" ? "50%" : "16px"};background:${m.risalto};color:${m.su};display:inline-grid;place-items:center;font-weight:800;font-size:${px / 3}px;flex:none">${esc(iniz(c.referente.nome))}</span>`;
        $("#rf-foto").innerHTML = foto ? `<img src="${foto}" alt="Foto del referente">` : esc(iniz(c.referente.nome)); $("#rf-fotox").style.display = foto ? "" : "none";
        const persona = c.referente.nome ? `<div style="display:flex;gap:10px;align-items:center;${c.modello === "vicino" ? "flex-direction:column;" : ""}margin-bottom:12px">${ritratto(c.modello === "vicino" ? 92 : 72)}<div><b style="font-size:16px">Ciao, sono ${esc(c.referente.nome.split(/\s+/)[0])}.</b><div style="color:${m.risalto};font-weight:600;font-size:12px">${esc(c.referente.ruolo)}</div></div></div>` : "";
        const testo = `<div style="font-size:${c.modello === "energia" ? 30 : 22}px;font-weight:800;line-height:1.05;margin:4px 0 12px">${esc(c.testata.titolo).replace(/\n/g, "<br>")} <span style="color:${m.risalto}">${esc(c.testata.evidenziato)}</span></div>`;
        $("#rf-ante").innerHTML = `<div style="border-radius:14px;overflow:hidden;background:${m.sfondo};color:${m.testo};font-size:13px;padding:16px;${centro}">${c.modello === "energia" ? testo + persona : persona + testo}
          <div style="background:#fff;color:#222;border-radius:12px;padding:12px"><b>Iniziamo dalla tua bolletta.</b><div style="border:1.5px dashed #bbb;border-radius:8px;padding:8px;margin:8px 0;text-align:center">Carica la bolletta</div>
            <div style="background:${m.bottone};color:${m.suBottone};border-radius:99px;padding:9px;text-align:center;font-weight:700">Ricevi la stima gratuita</div></div></div>`;
        $("#rf-ante-mail").innerHTML = `<div style="background:${esc(e.sfondo)};padding:12px;border-radius:12px;font-size:13px"><div style="background:${esc(e.card)};border-radius:10px;overflow:hidden">
          <div style="padding:8px 12px;border-bottom:3px solid ${esc(e.accento)}"><img src="${logo}" style="height:20px;vertical-align:middle"> <b>${esc(e.intestazione)}</b></div>
          <div style="padding:12px"><div class="muted small">Oggetto: ${esc(e.conferma.oggetto)}</div><div style="font-size:17px;font-weight:800;margin:6px 0">${esc(e.conferma.titolo).replace(/\n/g, "<br>")}</div><div>${esc(e.conferma.messaggio)}</div>
          <span style="display:inline-block;margin-top:10px;background:${esc(e.accento)};color:#fff;border-radius:8px;padding:7px 14px;font-weight:700">Confermo la mia email</span>
          ${e.firma ? `<div style="white-space:pre-line;margin-top:10px;color:#5b6b6e">${esc(e.firma)}</div>` : ""}</div></div></div>`;
      };
      el.querySelectorAll("[data-p], [name=rf-modello]").forEach(i => i.addEventListener("input", ante));
      const box = el.querySelector(".rf-fotobox"), msgFoto = (m, ok) => { const p = $("#rf-fotomsg"); p.textContent = m; p.hidden = !m; p.classList.toggle("errore", !ok); };
      const usaFoto = async f => {
        if (!f) return;
        msgFoto("Preparo la foto…", true);
        try { const x = await riduciFoto(f); foto = x.dati; ante();
          msgFoto(x.piccola ? `Foto pronta, ma è piccola (${x.piccola} pixel): potrebbe vedersi sfocata. Premi «Salva» in fondo alla pagina.` : "Foto pronta: premi «Salva» in fondo alla pagina per pubblicarla.", true); }
        catch (x) { msgFoto(x.message, false); }
      };
      $("#rf-fotof").onchange = async e => { const f = e.target.files[0]; await usaFoto(f); e.target.value = ""; };
      ["dragenter", "dragover"].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.add("sopra"); }));
      ["dragleave", "drop"].forEach(ev => box.addEventListener(ev, e => { e.preventDefault(); box.classList.remove("sopra"); }));
      box.addEventListener("drop", e => usaFoto(e.dataTransfer.files[0]));
      const incolla = e => {
        if (!box.isConnected) return document.removeEventListener("paste", incolla);
        const f = [...(e.clipboardData?.files || [])].find(x => x.type.startsWith("image/"));
        if (f) { e.preventDefault(); usaFoto(f); box.scrollIntoView({ block: "nearest" }); }
      };
      document.addEventListener("paste", incolla);
      $("#rf-fotox").onclick = () => { foto = ""; ante(); msgFoto("Foto tolta: premi «Salva» in fondo alla pagina.", true); };
      ante();
      $("#rf-pop") && ($("#rf-pop").onchange = e => { this._op = e.target.value; this.pagina(el); });
      $("#rf-logof").onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        if (!["image/png", "image/jpeg"].includes(f.type)) { U.toast("Usa un PNG o un JPG"); return; }
        if (f.size > 512 * 1024) { U.toast("Il logo supera 512 KB"); return; }
        logoNuovo = f; $("#rf-logo").src = logoUrl(); ante();
      };
      $("#rf-logox") && ($("#rf-logox").onclick = () => { logoPath = null; logoNuovo = null; $("#rf-logo").src = logoUrl(); ante(); U.toast("Torna al logo Alca: premi Salva"); });
      $("#rf-pred").onclick = () => { el.querySelectorAll("[data-p]").forEach(i => { const v = getP(base, i.dataset.p); if (i.type === "checkbox") i.checked = v !== false; else i.value = v ?? ""; }); ante(); U.toast("Valori predefiniti: premi Salva per confermare"); };
      $("#rf-salva").onclick = async () => {
        const c = leggi();
        for (const p of ["email.accento", "email.sfondo", "email.card"]) if (!/^#[0-9a-f]{6}$/i.test(getP(c, p))) { U.toast("Colore non valido"); return; }
        if (c.referente.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.referente.email)) { U.toast("Email del referente non valida"); return; }
        try {
          if (logoNuovo) {
            const path = `${opId}/logo-${Date.now().toString(36)}.${logoNuovo.type === "image/png" ? "png" : "jpg"}`;
            const up = await Server.sb.storage.from("energy-loghi").upload(path, logoNuovo, { contentType: logoNuovo.type });
            if (up.error) throw new Error(opId !== pr.id ? "Il logo di un collaboratore lo carica il collaboratore stesso." : up.error.message);
            logoPath = path; logoNuovo = null;
          }
          // si salvano solo le differenze dai valori predefiniti: un cambio dei predefiniti vale per chi non ha personalizzato
          const diff = (a, b) => { const o = {}; for (const k of Object.keys(a)) { if (a[k] && typeof a[k] === "object") { const d = diff(a[k], b?.[k] || {}); if (Object.keys(d).length) o[k] = d; } else if (a[k] !== b?.[k]) o[k] = a[k]; } return o; };
          const config = diff(c, base);
          // modelli e video dei singoli link si cambiano in «I miei link»: qui si tengono quelli attuali
          const { data: ora } = await db().from("referral_config").select("modelli:config->modelli, videoLink:config->videoLink").eq("operatore_id", opId).maybeSingle();
          for (const k of ["modelli", "videoLink"]) { delete config[k]; if (ora?.[k] && Object.keys(ora[k]).length) config[k] = ora[k]; }
          const q = conf ? db().from("referral_config").update({ config, logo_path: logoPath }).eq("operatore_id", opId) : db().from("referral_config").insert({ operatore_id: opId, config, logo_path: logoPath });
          const { error } = await q; if (error) throw error;
          U.toast("Pagina salvata"); this.pagina(el);
        } catch (e) { U.toast(e.message); }
      };
    },

    /* ------------------------------ preventivi referral ------------------------------ */
    async preventivi(el) {
      const pr = Server.profilo, f = this._f ||= { gestione: "aperti" };
      let q = db().from("richieste_referral").select("id, codice, created_at, email, telefono, ricontatto, ricontatto_canale, ricontatto_scade, ricontatto_tentativi, ricontatto_chiuso_il, marketing, legittimazione, monitoraggio, monitoraggio_scade, stato, gestione, segmento, stima, errore, notifica, documenti_esito, dati_mancanti, pratica_id, confermata_il, file_eliminati_il, interesse, interesse_il, link:referral_link(nome), operatore:operatori!richieste_referral_operatore_id_fkey(nome, cognome, codice_agente), pratica:pratiche(numero, stato)")
        .order("created_at", { ascending: false }).limit(300);
      if (f.gestione === "aperti") q = q.neq("gestione", "completato"); else if (f.gestione !== "tutti") q = q.eq("gestione", f.gestione);
      const { data, error } = await q; if (error) throw error;
      const SP = window.STATI_PRATICA, ufficio = !!pr.ufficio;
      const stima = s => {
        if (!s?.forniture) return "";
        return Object.entries(s.forniture).map(([c, x]) => x.errore ? `<div class="muted">${c === "luce" ? "Luce" : "Gas"}: ${esc(x.errore)}${x.mancanti?.length ? " · " + esc(x.mancanti.join("; ")) : ""}</div>`
          : `<div>${c === "luce" ? "Luce" : "Gas"} ${Number(x.consumoAnnuo).toLocaleString("it-IT")} ${esc(x.unita)}/anno · ${x.offerte?.[0]?.risparmioAnnuo > 0 ? `<b class="pos saving">${eur(x.offerte[0].risparmioAnnuo)}/anno</b> con ${esc(x.offerte[0].azienda)} ${esc(x.offerte[0].nome)}` : "nessuna differenza favorevole"} <span class="muted">(${x.nAlca ?? "?"} offerte Alca confrontate)</span></div>`).join("");
      };
      const ric = r => {
        if (!r.ricontatto) return '<span class="pill">Nessun ricontatto</span>';
        const att = !r.ricontatto_chiuso_il && r.ricontatto_scade && new Date(r.ricontatto_scade) > new Date();
        return att ? `<span class="pill good">Ricontatto via ${esc(CANALE[r.ricontatto_canale] || r.ricontatto_canale)}</span> <span class="muted">tentativi ${r.ricontatto_tentativi}/3 · entro ${dtIt(r.ricontatto_scade).split(",")[0]}</span>`
          : `<span class="pill">Ricontatto chiuso</span>`;
      };
      el.innerHTML = `<div class="btn-row" style="margin:6px 0 12px"><label class="f" style="min-width:200px">Mostra<select id="rf-fg">
          ${[["aperti", "Da gestire e in lavorazione"], ["da_gestire", "Da gestire"], ["in_lavorazione", "In lavorazione"], ["completato", "Completati"], ["tutti", "Tutti"]].map(([k, t]) => `<option value="${k}" ${f.gestione === k ? "selected" : ""}>${t}</option>`).join("")}</select></label></div>
        <p class="muted small">Usa i contatti del cliente solo per la richiesta e il canale che ha scelto: il ricontatto vale al massimo 3 tentativi entro 30 giorni e non autorizza promozioni. Il cellulare da solo non autorizza telefonate o WhatsApp.</p>
        ${data.length ? `<div class="table-wrap"><table><thead><tr><th>Richiesta</th><th>Cliente e scelte</th><th>Stima</th>${pr.ruolo !== "agente" ? "<th>Collaboratore</th>" : ""}<th>Gestione</th><th></th></tr></thead><tbody>
          ${data.map(r => { const [et, cl] = STATI[r.stato] || [r.stato, ""];
            return `<tr><td class="small"><b>${esc(r.codice)}</b><div class="muted">${dtIt(r.created_at)}</div><div class="muted">link: ${esc(r.link?.nome || "")}</div>${r.legittimazione && r.legittimazione !== "intestatario" ? `<div class="pill warn">${r.legittimazione === "azienda" ? "per un'azienda" : "per un altro intestatario"}</div>` : ""}</td>
              <td class="small"><div>${esc(r.email)}${r.telefono ? ` · ${esc(r.telefono)}` : ""}</div>
                ${r.interesse ? `<div class="alert warn" style="margin:4px 0;padding:6px 8px"><b>Mi interessa</b> · ${dtIt(r.interesse_il)}: vuole essere chiamato per <b>${esc(r.interesse.azienda)} · ${esc(r.interesse.nome)}</b> (${r.interesse.commodity === "gas" ? "gas" : "luce"}${r.interesse.risparmioAnnuo > 0 ? `, ${eur(r.interesse.risparmioAnnuo)}/anno` : ""}) al <a href="tel:${esc(String(r.interesse.telefono).replace(/[^\d+]/g, ""))}">${esc(r.interesse.telefono)}</a></div>` : ""}
                <div>${ric(r)}</div>
                <div>${r.monitoraggio ? `<span class="pill">Monitoraggio fino al ${dtIt(r.monitoraggio_scade).split(",")[0]}</span>` : '<span class="muted">monitoraggio non attivo</span>'}${r.marketing ? ' <span class="pill">Promozioni: vedi consensi</span>' : ""}</div>${r.segmento ? `<div class="muted">${r.segmento === "privati" ? "Uso domestico" : "Uso non domestico"}</div>` : ""}</td>
              <td class="small"><span class="pill ${cl}">${esc(et)}</span>${stima(r.stima)}${r.dati_mancanti?.length && r.stato === "integrazione_richiesta" ? `<div class="muted">mancano: ${esc(r.dati_mancanti.join("; "))}</div>` : ""}${r.errore ? `<div class="neg saving">${esc(r.errore)}</div>` : ""}${r.notifica ? `<div class="muted">${esc(NOTIFICA[r.notifica] || r.notifica)}</div>` : ""}${r.documenti_esito ? `<div class="muted">conferma servizio: ${esc(r.documenti_esito)}</div>` : ""}${r.file_eliminati_il ? `<div class="muted">bolletta eliminata il ${dtIt(r.file_eliminati_il).split(",")[0]}</div>` : ""}
                ${r.pratica ? `<div class="muted">pratica ${esc(r.pratica.numero)} · ${esc(SP?.label?.[r.pratica.stato] || r.pratica.stato)}</div>` : ""}</td>
              ${pr.ruolo !== "agente" ? `<td class="small">${esc(nomeOp(r.operatore))}</td>` : ""}
              <td><select class="pill-select" data-g="${r.id}">${Object.entries(GESTIONE).map(([k, t]) => `<option value="${k}" ${r.gestione === k ? "selected" : ""}>${t}</option>`).join("")}</select></td>
              <td><div class="btn-row nowrap">${r.pratica_id && ["stima_pronta", "non_disponibile", "integrazione_richiesta"].includes(r.stato) ? `<button class="btn sm primary" data-quota="${r.pratica_id}" title="Apre la pratica nel Preventivo Aziende o Privati, con i dati letti dalla bolletta">Apri nella quotazione</button>` : ""}${r.pratica_id ? `<button class="btn sm" data-scheda="${r.pratica_id}">Pratica</button>` : ""}
                ${r.ricontatto && !r.ricontatto_chiuso_il && r.ricontatto_tentativi < 3 && new Date(r.ricontatto_scade) > new Date() ? `<button class="btn sm" data-tent="${r.id}">Registra tentativo</button>` : ""}
                ${ufficio && r.stato === "verifica_documento" ? `<button class="btn sm primary" data-verok="${r.id}">Documento verificato</button><button class="btn sm" data-verno="${r.id}">Chiedi versione oscurata</button>` : ""}
                ${["errore", "non_disponibile", "stima_pronta", "confermata", "integrazione_richiesta"].includes(r.stato) ? `<button class="btn sm" data-rielabora="${r.id}">Rifai stima</button>` : ""}${["in_attesa_conferma", "scaduta"].includes(r.stato) ? `<button class="btn sm" data-reinvia="${r.id}">Reinvia conferma</button>` : ""}</div></td></tr>`; }).join("")}</tbody></table></div>`
          : `<div class="empty">Nessuna richiesta${f.gestione === "aperti" ? " da gestire" : ""}. ${ufficio ? "" : "Le richieste referral sono visibili alla rete solo dopo la validazione dell'incarico da parte dell'amministratore e con l'accesso a due fattori."}</div>`}`;
      $("#rf-fg").onchange = e => { f.gestione = e.target.value; this.preventivi(el); };
      el.querySelectorAll("[data-g]").forEach(s => s.onchange = async () => { const { error } = await db().from("richieste_referral").update({ gestione: s.value }).eq("id", s.dataset.g); U.toast(error ? error.message : "Aggiornato"); });
      el.querySelectorAll("[data-scheda]").forEach(b => b.onclick = () => window.Rete?.scheda(b.dataset.scheda));
      el.querySelectorAll("[data-quota]").forEach(b => b.onclick = () => U.apriPratica ? U.apriPratica(b.dataset.quota) : U.toast("Apri la pratica dal CRM"));
      const fn = (azione, id) => Server.funzione(FUNZIONE, { azione, id });
      el.querySelectorAll("[data-reinvia]").forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await fn("reinvia", b.dataset.reinvia); U.toast("Email di conferma inviata di nuovo"); this.preventivi(el); }
        catch (e) { U.toast(e.message); b.disabled = false; }
      });
      el.querySelectorAll("[data-rielabora]").forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await fn("rielabora", b.dataset.rielabora); U.toast("Nuova stima in corso: aggiorna tra un minuto"); }
        catch (e) { U.toast(e.message); b.disabled = false; }
      });
      el.querySelectorAll("[data-tent]").forEach(b => b.onclick = async () => {
        const esito = prompt("Esito del tentativo di contatto (facoltativo):", "") ?? null; if (esito === null) return;
        const { data: n, error } = await db().rpc("ricontatto_tentativo", { p_richiesta: b.dataset.tent, p_esito: esito });
        U.toast(error ? error.message : `Tentativo ${n} di 3 registrato`); if (!error) this.preventivi(el);
      });
      el.querySelectorAll("[data-verok],[data-verno]").forEach(b => b.onclick = async () => {
        const ok = !!b.dataset.verok, id = b.dataset.verok || b.dataset.verno;
        if (ok && !confirm("Confermi di aver aperto il documento e che non contiene dati sanitari (es. disagio fisico, apparecchiature elettromedicali)? Solo dopo verrà inviato al servizio AI.")) return;
        const { error } = await db().rpc("referral_verifica_documento", { p_richiesta: id, p_ok: ok });
        if (error) return U.toast(error.message);
        if (ok) { try { await fn("rielabora", id); } catch (e) { return U.toast(e.message); } U.toast("Documento verificato: analisi avviata"); }
        else U.toast("Il cliente vedrà la richiesta di caricare una versione oscurata nella sua area");
        this.preventivi(el);
      });
    },

    /* ------------------------------ impostazioni del servizio (amministratore) ------------------------------ */
    async destinazioni(el) {
      const [{ data: I, error }, { data: ops }] = await Promise.all([db().from("referral_impostazioni").select("*").eq("id", 1).maybeSingle(),
        db().from("operatori").select("id, nome, cognome, codice_agente, ruolo, stato, incarico_referral_il, incarico_referral_note").in("ruolo", ["agente", "subagente", "responsabile"]).order("cognome")]);
      if (error) throw error;
      setTimeout(() => { const b = $("#rf-motore"); if (b) b.onclick = async () => {
        b.disabled = true; $("#rf-motore-esito").textContent = "Aggiornamento in corso…";
        try { const r = await Server.funzione(FUNZIONE, { azione: "approva_motore" });
          $("#rf-motore-esito").textContent = (r.file || []).map(f => `${f.file}.js ${f.cambiato ? "aggiornato" : "invariato"}`).join(" · "); }
        catch (e) { $("#rf-motore-esito").textContent = e.message; }
        b.disabled = false; }; }, 0);
      const sw = (id, v, testo, nota) => `<label class="check" style="margin-top:8px"><input type="checkbox" id="${id}" ${v ? "checked" : ""}> <span><b>${testo}</b>${nota ? `<br><span class="muted small">${nota}</span>` : ""}</span></label>`;
      el.innerHTML = `<div style="max-width:760px">
        <h3 style="margin:4px 0 6px">Funzioni attive</h3>
        <p class="muted small">Secondo il parere di conformità del 20/11/2026, una funzione si attiva solo dopo averne collaudato scelte, avvisi e revoche e completato i relativi documenti.</p>
        ${sw("rf-imon", I?.monitoraggio_attivo, "Monitoraggio facoltativo (12 mesi, controlli ogni 3 giorni)", "La casella nel modulo resta vuota: si attiva solo se il cliente la sceglie.")}
        ${sw("rf-imkt", I?.marketing_attivo, "Comunicazioni promozionali (energia / assicurazioni, per canale)", "Tenere spento finché non sono collaudati consensi, canali e revoche e verificata la disciplina del Registro delle opposizioni.")}
        ${sw("rf-iter", I?.legittimazione_terzi, "Scelta dell'intestatario nel modulo (azienda o altra persona)", "Le bollette aziendali sono già riconosciute dalla partita IVA. Tenere spento finché non sono approvati campi, dichiarazione di legittimazione e informativa all'intestatario.")}
        ${sw("rf-ifoto", I?.verifica_manuale_foto !== false, "Verifica di una persona per foto e PDF senza testo prima dell'AI", "Le foto non si possono controllare in automatico: l'ufficio conferma che non ci sono dati sanitari.")}
        <label class="f" style="margin-top:12px">Trasparenza commerciale mostrata nella pagina e accanto ai risultati (descrizione verificata dei compensi)<textarea id="rf-icomp" rows="3" placeholder="Lascia vuoto per il testo standard: «Alca può ricevere compensi dai fornitori o dai partner commerciali per le attivazioni effettuate tramite la propria rete…»">${esc(I?.compensi_testo || "")}</textarea></label>
        <h3 style="margin:18px 0 6px">Motore di calcolo del server</h3>
        <p class="muted small" style="margin-top:0">Per sicurezza il server non usa più i file del sito appena pubblicati: usa una copia approvata. Dopo una pubblicazione che cambia calcoli, istruzioni dell'analisi AI o testi legali, premi qui: il server scarica i quattro file da alcaenergia.it, li controlla e li adotta.</p>
        <button class="btn" id="rf-motore" type="button">Aggiorna il motore dal sito</button> <span class="muted small" id="rf-motore-esito"></span>
        <h3 style="margin:18px 0 6px">Avvisi interni</h3>
        <label class="f">Email dell'ufficio che ricevono gli avvisi (una per riga)<textarea id="rf-dem" rows="3" placeholder="es. backoffice@alcabroker.it">${esc((I?.email_ufficio || []).join("\n"))}</textarea></label>
        <label class="check" style="margin-top:8px"><input type="checkbox" id="rf-dop" ${I?.avvisa_operatore !== false ? "checked" : ""}> Avvisa anche il collaboratore del link (solo se l'accesso della rete è aperto e il suo incarico è validato)</label>
        <label class="f" style="margin-top:10px;max-width:300px">Monitoraggio: avvisa il cliente se la differenza migliora di almeno (€/anno)<input id="rf-dsg" type="number" min="0" step="1" value="${esc(I?.soglia_monitoraggio ?? 20)}"></label>
        <label class="f" style="margin-top:10px">Siti ammessi per le pagine (pubblicato e collaudo, uno per riga)<textarea id="rf-isiti" rows="2">${esc((I?.siti || []).join("\n"))}</textarea></label>
        <h3 style="margin:18px 0 6px">Accesso della rete alle richieste referral</h3>
        <p class="muted small">Il link attribuisce la richiesta al collaboratore ma non gli dà accesso ai dati. Prima di aprire l'accesso qualifica il ruolo (dipendente, collaboratore sotto l'autorità di Alca, responsabile art. 28, titolare autonomo), firma l'accordo e annota qui il riferimento. Il collaboratore deve accedere con il secondo fattore.</p>
        ${sw("rf-irete", I?.accesso_rete, "Accesso della rete aperto", "Se spento, richieste e pratiche referral sono visibili solo a ufficio e amministratore.")}
        <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Collaboratore</th><th>Incarico referral</th><th>Riferimento accordo</th><th></th></tr></thead><tbody>
          ${(ops || []).map(o => `<tr><td class="small">${esc(nomeOp(o))}<div class="muted">${esc(o.ruolo)} · ${esc(o.stato)}</div></td>
            <td class="small">${o.incarico_referral_il ? `<span class="pill good">validato il ${dtIt(o.incarico_referral_il).split(",")[0]}</span>` : '<span class="pill">non validato</span>'}</td>
            <td><input class="rf-inote" data-op="${o.id}" value="${esc(o.incarico_referral_note || "")}" placeholder="es. accordo art. 28 del…" style="min-width:180px"></td>
            <td><button class="btn sm" data-inc="${o.id}" data-v="${o.incarico_referral_il ? "0" : "1"}">${o.incarico_referral_il ? "Revoca" : "Valida"}</button></td></tr>`).join("") || '<tr><td colspan="4" class="muted">Nessun collaboratore</td></tr>'}</tbody></table></div>
        <div class="btn-row" style="margin-top:14px"><button class="btn primary" id="rf-dsalva">Salva impostazioni</button></div>
        ${I?.aggiornato_il ? `<p class="muted small">Ultima modifica ${dtIt(I.aggiornato_il)}</p>` : ""}</div>`;
      $("#rf-dsalva").onclick = async () => {
        const email_ufficio = $("#rf-dem").value.split(/[\s,;]+/).map(s => s.trim()).filter(Boolean);
        const bad = email_ufficio.filter(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)); if (bad.length) { U.toast("Email non valida: " + bad[0]); return; }
        const siti = $("#rf-isiti").value.split(/\s+/).map(s => s.trim().replace(/\/$/, "")).filter(Boolean);
        if (!siti.length || siti.some(s => !/^https:\/\/[a-z0-9.-]+$/i.test(s))) { U.toast("Indica almeno un sito, nel formato https://indirizzo"); return; }
        if ($("#rf-imkt").checked && !I?.marketing_attivo && !confirm("Attivare le comunicazioni promozionali? Fallo solo dopo il collaudo di consensi, canali e revoche.")) return;
        if ($("#rf-irete").checked && !I?.accesso_rete && !confirm("Aprire l'accesso della rete? Vedranno le richieste solo i collaboratori con incarico validato e accesso a due fattori.")) return;
        const { error } = await db().from("referral_impostazioni").update({ avvisa_operatore: $("#rf-dop").checked, email_ufficio, soglia_monitoraggio: Number($("#rf-dsg").value || 0),
          monitoraggio_attivo: $("#rf-imon").checked, marketing_attivo: $("#rf-imkt").checked, legittimazione_terzi: $("#rf-iter").checked, verifica_manuale_foto: $("#rf-ifoto").checked,
          accesso_rete: $("#rf-irete").checked, compensi_testo: $("#rf-icomp").value.trim() || null, siti }).eq("id", 1);
        U.toast(error ? error.message : "Impostazioni salvate"); if (!error) this.destinazioni(el);
      };
      el.querySelectorAll("[data-inc]").forEach(b => b.onclick = async () => {
        const v = b.dataset.v === "1", note = el.querySelector(`.rf-inote[data-op="${b.dataset.inc}"]`).value;
        if (v && !note.trim()) { U.toast("Annota il riferimento dell'accordo o dell'inquadramento prima di validare"); return; }
        const { error } = await db().rpc("rete_incarico", { p_operatore: b.dataset.inc, p_valido: v, p_note: note });
        U.toast(error ? error.message : v ? "Incarico validato" : "Incarico revocato: l'accesso alle richieste referral è bloccato"); if (!error) this.destinazioni(el);
      });
    }
  };  window.Referral = Referral;
})();
