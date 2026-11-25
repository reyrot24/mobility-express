/* Alca Energy · area personale, cruscotto, "Utenti e rete", scheda pratica e stato del mercato (solo con il server).
   Tutto ciò che si vede qui arriva dal database già filtrato dai permessi del ruolo (RLS). */
(function () {
  if (!window.Server || !Server.attivo) { window.Rete = null; return; }
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  let U = {};   // utilità dell'app: dialog, toast, esc, renderPratiche, apriPratica
  const esc = s => U.esc ? U.esc(s) : String(s ?? "");
  const SP = () => window.STATI_PRATICA;
  const dIt = d => d ? new Date(d).toLocaleDateString("it-IT") : "—";
  const dtIt = d => d ? new Date(d).toLocaleString("it-IT", { timeZone: "Europe/Rome", dateStyle: "short", timeStyle: "short" }) : "—";
  const db = () => Server.db();
  const RUOLI = { admin: "Amministratore", backoffice: "Back office", responsabile: "Responsabile di rete", agente: "Agente / subagente", segnalatore: "Segnalatore" };
  const STATI_ACC = { da_invitare: "Da invitare", invitato: "Invitato", attivo: "Attivo", sospeso: "Sospeso", disattivato: "Disattivato" };
  const nome = o => o ? `${o.nome} ${o.cognome}${o.codice_agente ? " (" + o.codice_agente + ")" : ""}` : "—";

  function vista(id, titolo, dopo) {
    const nav = $("#tabs");
    const b = document.createElement("button"); b.className = "tab"; b.dataset.view = id; b.textContent = titolo;
    const rif = dopo ? nav.querySelector(`[data-view="${dopo}"]`) : null;
    rif ? rif.after(b) : nav.prepend(b);
    const sec = document.createElement("section"); sec.className = "view"; sec.id = "view-" + id; $("main").appendChild(sec);
    b.addEventListener("click", () => {
      $$("#tabs .tab").forEach(x => x.classList.toggle("active", x === b));
      $$(".view").forEach(v => v.classList.toggle("active", v === sec));
      document.body.classList.remove("seg-privati");
      Rete.mostra(id);
    });
    // le schede originali nascondono anche le nuove viste
    return { b, sec };
  }

  const Rete = {
    async avvia(util) {
      U = util; const pr = Server.profilo;
      // utente in alto a destra
      const chip = document.createElement("div"); chip.className = "user-chip";
      chip.innerHTML = `<span>${esc(pr.nome)} ${esc(pr.cognome)}<small>${esc(RUOLI[pr.ruolo])}${pr.codice_agente ? " · " + esc(pr.codice_agente) : ""}</small></span><button class="btn sm" id="btn-esci" type="button">Esci</button>`;
      $(".topbar-inner").appendChild(chip); $("#btn-esci").onclick = () => Server.esci();
      const nomeChip = chip.querySelector("span"); nomeChip.classList.add("user-chip-nome"); nomeChip.title = "I miei dati (indirizzo, partita IVA, dati per le provvigioni)";
      nomeChip.setAttribute("role", "button"); nomeChip.tabIndex = 0;
      nomeChip.onclick = () => this.datiFatturazione(pr.id, "I miei dati");
      nomeChip.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); nomeChip.click(); } };
      document.title = "Alca Energy";
      // impostazioni locali non pertinenti al server (chiave API: è sul server)
      $$("[data-only-local]").forEach(el => el.hidden = true);
      if (pr.ruolo === "segnalatore") {
        // il segnalatore vede solo l'invio delle bollette e lo stato delle sue segnalazioni
        $$("#tabs .tab").forEach(t => { if (t.dataset.view !== "invia") t.hidden = true; });
        $$("#tabs .tab-sep").forEach(t => t.hidden = true);
        $('#tabs [data-view="invia"]').click();
        return;
      }
      // «Invia bolletta» serve solo ai segnalatori (che non fanno preventivi): per gli altri ruoli doppia Preventivo e CRM
      $('#tabs [data-view="invia"]').hidden = true;
      this.area = vista("area", "La mia area");
      if (pr.ufficio) this.rich = vista("richieste", "Richieste", "pratiche");
      if (pr.ufficio || pr.ruolo === "responsabile") this.crus = vista("cruscotto", "Cruscotto", "pratiche");
      if (window.Referral) this.ref = vista("referral", "Referral", "pratiche");
      // solo l'amministratore vede Impostazioni, Indici e Utenti e rete
      const admin = pr.ruolo === "admin";
      if (admin && pr.puo_utenti) this.rete = vista("rete", "Utenti e rete", "impostazioni");
      if (!admin) $$('#tabs [data-view="indici"], #tabs [data-view="impostazioni"]').forEach(t => t.hidden = true);
      this.mercatoCard();
      this.avvisi();
      this.area.b.click();
    },
    /* palline di avviso: CRM = nuove pratiche dai link referral dall'ultima apertura del CRM (su questo dispositivo);
       Richieste = richieste di contratto da valutare (solo ufficio); Utenti e rete = candidature partner nuove. Si aggiornano ogni minuto; ognuno vede solo ciò che i permessi gli mostrano. */
    avvisi() {
      const pr = Server.profilo, chiave = "ae.crm.visto." + pr.id, crm = $('#tabs [data-view="pratiche"]');
      const leggi = () => { try { return localStorage.getItem(chiave); } catch { return null; } };
      const scrivi = v => { try { localStorage.setItem(chiave, v); } catch { } };
      if (!leggi()) scrivi(new Date().toISOString());   // primo accesso: si parte da adesso
      const pallina = (tab, n, titolo) => {
        if (!tab) return; let s = tab.querySelector(".tab-pallina");
        if (!n) { s?.remove(); return; }
        if (!s) { s = document.createElement("span"); s.className = "tab-pallina"; tab.appendChild(s); }
        s.textContent = n > 99 ? "99+" : n; s.title = titolo;
      };
      const controlla = async () => {
        if (document.hidden) return;
        try {
          const [{ count }, { count: ni }] = await Promise.all([
            db().from("pratiche").select("id", { count: "exact", head: true }).eq("canale", "Referral").gt("created_at", leggi()),
            // clienti che nell'area personale hanno cliccato «Mi interessa, voglio essere contattato»
            db().from("richieste_referral").select("id", { count: "exact", head: true }).gt("interesse_il", leggi())]);
          const tot = (count || 0) + (ni || 0);
          pallina(crm, tot, [count ? `${count} ${count === 1 ? "nuova bolletta" : "nuove bollette"} dai link referral` : "", ni ? `${ni} ${ni === 1 ? "cliente vuole" : "clienti vogliono"} essere contattati per un'offerta` : ""].filter(Boolean).join(" · "));
          if (this.rich) {
            const { count: n } = await db().from("richieste_contratto").select("id", { count: "exact", head: true }).eq("stato", "richiesta");
            pallina(this.rich.b, n || 0, `${n} ${n === 1 ? "richiesta" : "richieste"} da valutare`);
          }
          if (this.rete) {   // candidature dalla pagina /partner ancora da gestire (Utenti e rete → Candidature partner)
            const { count: nc } = await db().from("candidature").select("id", { count: "exact", head: true }).eq("stato", "nuova").neq("privacy_versione", "importazione");
            pallina(this.rete.b, nc || 0, `${nc} ${nc === 1 ? "nuova candidatura" : "nuove candidature"} partner`);
          }
        } catch (e) { console.warn("avvisi", e); }
      };
      crm?.addEventListener("click", () => { scrivi(new Date().toISOString()); pallina(crm, 0); });
      $("#crm-refresh")?.addEventListener("click", () => { scrivi(new Date().toISOString()); pallina(crm, 0); });
      this._ctrlAvvisi = controlla;
      controlla(); setInterval(controlla, 60e3);
      document.addEventListener("visibilitychange", () => { if (!document.hidden) controlla(); });
    },
    mostra(id) { if (id === "area") this.disegnaArea(); if (id === "cruscotto") this.disegnaCruscotto(); if (id === "rete") this.disegnaRete(); if (id === "richieste") this.disegnaRichieste(); if (id === "referral") window.Referral.disegna(this.ref.sec, U); },

    /* ------------------------------ Richieste di contratto (ufficio) ------------------------------ */
    async disegnaRichieste() {
      const el = this.rich.sec, pr = Server.profilo, sez = this._sr ||= "aperte";
      el.innerHTML = `<div class="card"><div class="card-head"><div><h2>Richieste di contratto</h2><div class="muted small">Offerte richieste dalla rete: valuta, contatta il cliente e segna il contratto firmato.</div></div>
        <div class="seg" id="rc-seg"><button data-s="aperte" class="${sez === "aperte" ? "active" : ""}">Preventivi richiesti</button><button data-s="firmati" class="${sez === "firmati" ? "active" : ""}">Contratti finalizzati</button><button data-s="annullate" class="${sez === "annullate" ? "active" : ""}">Annullate</button></div></div>
        <div id="rc-list"><div class="empty"><span class="spinner"></span>Caricamento…</div></div></div>`;
      el.querySelectorAll("#rc-seg button").forEach(b => b.onclick = () => { this._sr = b.dataset.s; this.disegnaRichieste(); });
      const stati = { aperte: ["richiesta", "in_valutazione", "cliente_contattato"], firmati: ["contratto_firmato"], annullate: ["annullata"] }[sez];
      const { data, error } = await db().from("richieste_contratto").select("*, pratiche(numero), produttore:operatori!richieste_contratto_produttore_id_fkey(nome,cognome,codice_agente), richiedente:operatori!richieste_contratto_richiesto_da_fkey(nome,cognome,codice_agente), segnalatore:operatori!richieste_contratto_segnalatore_id_fkey(nome,cognome), provvigioni(importo,stato)")
        .in("stato", stati).order(sez === "firmati" ? "contratto_il" : "created_at", { ascending: false }).limit(500);
      if (error) { $("#rc-list").innerHTML = `<div class="alert bad">${esc(error.message)}</div>`; return; }
      const ST = { richiesta: "Da valutare", in_valutazione: "In valutazione", cliente_contattato: "Cliente contattato", contratto_firmato: "Contratto firmato", annullata: "Annullata" };
      const eur = v => v == null ? "—" : Number(v).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
      const prov = r => { const p = (r.provvigioni || []).find(x => x.stato !== "stornata"); return p ? `${eur(p.importo)} · ${p.stato}` : r.stato === "contratto_firmato" ? '<span class="pill warn">da impostare</span>' : "—"; };
      $("#rc-list").innerHTML = data.length ? `<div class="table-wrap"><table><thead><tr><th>Richiesta</th><th>Cliente</th><th>Offerta</th><th>Provenienza</th><th>${sez === "firmati" ? "Firmato il · provvigione" : "Stato"}</th><th></th></tr></thead><tbody>
        ${data.map(r => `<tr><td class="small"><b>${esc(r.numero)}</b><div class="muted">${dtIt(r.created_at)}</div><div class="muted">pratica ${esc(r.pratiche?.numero || "")}</div></td>
          <td><b>${esc(r.cliente_denominazione || "—")}</b> ${r.segmento === "privati" ? '<span class="pill">Privato</span>' : '<span class="pill">Azienda</span>'}<div class="small">${esc(r.cliente_email || "")}${r.cliente_telefono ? " · " + esc(r.cliente_telefono) : ""}</div></td>
          <td class="small"><b>${r.commodity === "luce" ? "Luce" : "Gas"}</b>: ${esc(r.offerta?.offerta?.azienda || "")} · ${esc(r.offerta?.offerta?.nome || "")}<div class="muted">risparmio ${eur(r.risparmio_annuo)}/anno</div></td>
          <td class="small">Produttore: ${esc(nome(r.produttore))}<div class="muted">richiesta da ${esc(nome(r.richiedente))}${r.segnalatore ? " · segnalatore " + esc(nome(r.segnalatore)) : ""}</div></td>
          <td class="small">${sez === "firmati" ? `${dIt(r.contratto_il)}<div>${prov(r)}</div>` : `<span class="pill ${r.stato === "annullata" ? "bad" : "warn"}">${ST[r.stato]}</span>${r.motivo ? `<div class="muted">${esc(r.motivo)}</div>` : ""}`}${r.note_ufficio ? `<div class="muted">${esc(r.note_ufficio)}</div>` : ""}</td>
          <td><div class="btn-row nowrap">
            ${sez === "aperte" ? `<select class="pill-select" data-st="${r.id}"><option value="">Aggiorna…</option><option value="in_valutazione">In valutazione</option><option value="cliente_contattato">Cliente contattato</option></select>
              <button class="btn sm primary" data-firma="${r.id}">Contratto firmato</button><button class="btn sm danger" data-annulla="${r.id}">Annulla</button>` : ""}
            ${sez === "firmati" && pr.puo_provvigioni ? `${(r.provvigioni || []).some(x => x.stato !== "stornata") ? ((r.provvigioni || []).some(x => x.stato === "maturata") ? `<button class="btn sm" data-liq="${r.id}">Segna liquidata</button>` : "") : `<button class="btn sm" data-imp="${r.id}">Imposta provvigione</button>`}<button class="btn sm danger" data-annulla="${r.id}">Storna</button>` : ""}
            <button class="btn sm" data-scheda="${r.pratica_id}">Pratica</button></div></td></tr>`).join("")}</tbody></table></div>`
        : `<div class="empty">${sez === "aperte" ? "Nessuna richiesta da lavorare." : sez === "firmati" ? "Nessun contratto finalizzato." : "Nessuna richiesta annullata."}</div>`;
      const lavora = async (id, stato, nota, motivo) => { try { await Server.rpc("lavora_richiesta_contratto", { rid: id, nuovo: stato, nota: nota || null, motivo: motivo || null }); U.toast("Richiesta aggiornata"); this.disegnaRichieste(); } catch (e) { U.toast(e.message); } };
      el.querySelectorAll("[data-st]").forEach(s => s.onchange = () => s.value && lavora(s.dataset.st, s.value));
      el.querySelectorAll("[data-scheda]").forEach(b => b.onclick = () => this.scheda(b.dataset.scheda));
      el.querySelectorAll("[data-firma]").forEach(b => b.onclick = () => U.dialog("Contratto firmato", `<p>Confermi che il cliente ha firmato il contratto? La richiesta passa nei <b>contratti finalizzati</b> e la provvigione del produttore viene fissata con l'importo impostato oggi.</p><label class="f">Note (facoltative)<input id="rc-nota" placeholder="es. firmato in sede, codice contratto…"></label>`,
        [{ label: "Annulla" }, { label: "Conferma firma", primary: true, onClick: () => lavora(b.dataset.firma, "contratto_firmato", $("#rc-nota").value) }]));
      el.querySelectorAll("[data-annulla]").forEach(b => b.onclick = () => U.dialog(sez === "firmati" ? "Storna il contratto" : "Annulla la richiesta", `<label class="f">Motivo (obbligatorio)<input id="rc-mot" placeholder="es. il cliente ha rinunciato"></label>${sez === "firmati" ? '<p class="small muted">La provvigione non ancora liquidata viene stornata.</p>' : ""}`,
        [{ label: "Chiudi" }, { label: "Conferma", primary: true, onClick: () => { const m = $("#rc-mot").value.trim(); if (!m) { U.toast("Indica il motivo"); return false; } lavora(b.dataset.annulla, "annullata", null, m); } }]));
      el.querySelectorAll("[data-imp]").forEach(b => b.onclick = () => U.dialog("Imposta la provvigione", `<label class="f">Importo per questo contratto (€)<input id="rc-imp" type="number" min="0" step="1" inputmode="decimal"></label>`,
        [{ label: "Chiudi" }, { label: "Salva", primary: true, onClick: async () => { const v = Number($("#rc-imp").value); if (!(v >= 0) || $("#rc-imp").value === "") { U.toast("Inserisci l'importo"); return false; }
          try { await Server.rpc("gestisci_provvigione", { rid: b.dataset.imp, importo: v, liquida: false }); this.disegnaRichieste(); } catch (e) { U.toast(e.message); return false; } } }]));
      el.querySelectorAll("[data-liq]").forEach(b => b.onclick = async () => { try { await Server.rpc("gestisci_provvigione", { rid: b.dataset.liq, importo: null, liquida: true }); U.toast("Provvigione segnata come liquidata"); this.disegnaRichieste(); } catch (e) { U.toast(e.message); } });
    },

    /* ------------------------------ La mia area ------------------------------ */
    async disegnaArea() {
      const el = this.area.sec, pr = Server.profilo;
      el.innerHTML = `<div class="card"><div class="card-head"><div><h2>Ciao ${esc(pr.nome)}</h2><div class="muted small">Le tue attività${pr.ufficio ? " e quelle dell'ufficio" : pr.ruolo === "responsabile" ? " e della tua struttura" : ""}.</div></div>
        <div class="btn-row"><button class="btn primary" data-go="preventivo">Nuovo preventivo</button></div></div>
        <div class="kpis" id="ar-kpi"><div class="empty"><span class="spinner"></span>Caricamento…</div></div></div>
        <div class="grid grid-2" style="margin-top:18px"><div class="card"><h2 style="margin-bottom:10px">Richieste dell'ufficio</h2><div id="ar-rich"></div></div>
        <div class="card"><h2 style="margin-bottom:10px">Ricontatti e scadenze</h2><div id="ar-ric"></div></div></div>
        <div class="card"><div class="card-head"><h2>Pratiche recenti</h2><button class="btn sm" data-go="pratiche">Apri il CRM</button></div><div id="ar-prat"></div></div>
        <div class="card"><div class="card-head"><div><h2>Contratti e guadagni</h2><div class="muted small">${pr.ufficio ? "Tutta la rete" : pr.ruolo === "responsabile" ? "Tu e la tua struttura" : "Le tue richieste di contratto, i contratti firmati e le tue provvigioni"}</div></div></div>
          <div id="ar-prov"></div><h3 style="margin:16px 0 8px">Contratti richiesti</h3><div id="ar-rc"></div></div>`;
      el.querySelectorAll("[data-go]").forEach(b => b.onclick = () => $(`#tabs [data-view="${b.dataset.go}"]`).click());
      const oggi = new Date().toISOString().slice(0, 10);
      const [cr, rich, ric, prat, prov, rcon] = await Promise.all([
        Server.rpc("cruscotto", { produttore: pr.ufficio || pr.ruolo === "responsabile" ? null : pr.id }).catch(e => ({ errore: e.message })),
        db().from("richieste_ufficio").select("id, testo, tipo, stato, at, pratica_id, pratiche(numero, clienti(denominazione))").eq("stato", "aperta").order("at", { ascending: false }).limit(50),
        db().from("pratiche").select("id, numero, ricontatto, stato, clienti(denominazione)").not("ricontatto", "is", null).lte("ricontatto", new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)).order("ricontatto").limit(50),
        db().from("pratiche").select("id, numero, stato, segmento, updated_at, clienti(denominazione), preventivi(numero, stato_email, emesso_il)").order("updated_at", { ascending: false }).limit(15),
        db().from("provvigioni").select("importo, stato").limit(5000),
        db().from("richieste_contratto").select("id, numero, stato, commodity, segmento, offerta, risparmio_annuo, cliente_denominazione, contratto_il, provvigione, created_at, motivo, pratica_id").order("created_at", { ascending: false }).limit(200)
      ]);
      const k = cr || {};
      $("#ar-kpi").innerHTML = k.errore ? `<div class="alert bad">${esc(k.errore)}</div>` : `
        <div class="kpi"><div class="l">Pratiche</div><div class="v">${k.pratiche ?? 0}</div><div class="s">${k.bollette ?? 0} bollette ricevute</div></div>
        <div class="kpi"><div class="l">Preventivi emessi</div><div class="v">${k.preventivi ?? 0}</div><div class="s">${k.inviati ?? 0} inviati al cliente</div></div>
        <div class="kpi ${k.ricontatti_scaduti ? "bad" : ""}"><div class="l">Ricontatti scaduti</div><div class="v">${k.ricontatti_scaduti ?? 0}</div><div class="s">da gestire oggi</div></div>
        <div class="kpi good"><div class="l">Attivazioni</div><div class="v">${k.attivazioni ?? 0}</div><div class="s">${k.conversione != null ? Math.round(k.conversione * 100) + "% delle pratiche chiuse" : "nessuna pratica chiusa"}</div></div>`;
      $("#ar-rich").innerHTML = rich.data?.length ? `<ul class="lista">${rich.data.map(r => `<li><div><b>${esc(r.tipo === "documento" ? "Documento mancante" : "Richiesta")}</b> · ${esc(r.pratiche?.clienti?.denominazione || r.pratiche?.numero || "")}<div class="small">${esc(r.testo)}</div><div class="small muted">${dIt(r.at)}</div></div>
        <div class="btn-row"><button class="btn sm" data-scheda="${r.pratica_id}">Apri</button><button class="btn sm" data-evasa="${r.id}">Fatto</button></div></li>`).join("")}</ul>` : `<div class="muted small">Nessuna richiesta aperta.</div>`;
      $("#ar-ric").innerHTML = ric.data?.length ? `<ul class="lista">${ric.data.map(p => `<li><div><b>${esc(p.clienti?.denominazione || p.numero)}</b><div class="small ${p.ricontatto <= oggi ? "neg saving" : "muted"}">${p.ricontatto <= oggi ? "Scaduto il " : "Entro il "}${dIt(p.ricontatto)} · ${esc(SP().label[p.stato] || p.stato)}</div></div><button class="btn sm" data-scheda="${p.id}">Apri</button></li>`).join("")}</ul>` : `<div class="muted small">Nessun ricontatto nei prossimi 7 giorni.</div>`;
      const em = { non_inviato: "non inviato", email_preparata: "email preparata (non confermata)", bozza_creata: "bozza creata", inviato_confermato: "inviato", invio_dichiarato_manualmente: "inviato (dichiarato)" };
      $("#ar-prat").innerHTML = prat.data?.length ? `<div class="table-wrap"><table><thead><tr><th>Pratica</th><th>Cliente</th><th>Stato</th><th>Ultimo preventivo</th><th></th></tr></thead><tbody>${prat.data.map(p => {
        const q = (p.preventivi || []).sort((a, b) => String(b.emesso_il).localeCompare(a.emesso_il))[0];
        return `<tr><td class="small">${esc(p.numero)}</td><td>${esc(p.clienti?.denominazione || "—")}${p.segmento === "privati" ? ' <span class="pill">Privato</span>' : ""}</td><td class="small">${esc(SP().label[p.stato] || p.stato)}</td>
          <td class="small">${q ? esc(q.numero) + " · " + esc(em[q.stato_email] || q.stato_email) : "—"}</td><td><button class="btn sm" data-scheda="${p.id}">Scheda</button></td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">Nessuna pratica ancora. Carica una bolletta per iniziare.</div>`;
      {
        const L = prov.data || [], RC = rcon.data || [];
        const t = s => L.filter(x => x.stato === s).reduce((a, x) => a + Number(x.importo), 0);
        const e = v => Number(v || 0).toLocaleString("it-IT", { style: "currency", currency: "EUR" });
        const firmati = RC.filter(r => r.stato === "contratto_firmato"), aperte = RC.filter(r => ["richiesta", "in_valutazione", "cliente_contattato"].includes(r.stato));
        const daImpostare = firmati.filter(r => r.provvigione == null).length;
        $("#ar-prov").innerHTML = `<div class="kpis">
          <div class="kpi"><div class="l">Contratti richiesti</div><div class="v">${aperte.length}</div><div class="s">in lavorazione dall'ufficio</div></div>
          <div class="kpi"><div class="l">Contratti finalizzati</div><div class="v">${firmati.length}</div><div class="s">${daImpostare ? daImpostare + " con provvigione da impostare" : "firmati dal cliente"}</div></div>
          <div class="kpi good"><div class="l">Guadagni maturati</div><div class="v">${e(t("maturata") + t("liquidata"))}</div><div class="s">di cui liquidati ${e(t("liquidata"))}</div></div>
          <div class="kpi"><div class="l">Da liquidare</div><div class="v">${e(t("maturata"))}</div><div class="s">${t("stornata") ? "stornati " + e(t("stornata")) : "nessuno storno"}</div></div></div>`;
        const ST = { richiesta: "Inviata all'ufficio", in_valutazione: "In valutazione", cliente_contattato: "Cliente contattato", contratto_firmato: "Contratto firmato", annullata: "Annullata" };
        $("#ar-rc").innerHTML = RC.length ? `<div class="table-wrap"><table><thead><tr><th>Richiesta</th><th>Cliente</th><th>Offerta</th><th>Stato</th><th class="num">Provvigione</th><th></th></tr></thead><tbody>
          ${RC.map(r => `<tr><td class="small">${esc(r.numero)}<div class="muted">${dIt(r.created_at)}</div></td><td>${esc(r.cliente_denominazione || "—")} <span class="pill">${r.segmento === "privati" ? "Privato" : "Azienda"}</span></td>
            <td class="small">${r.commodity === "luce" ? "Luce" : "Gas"}: ${esc(r.offerta?.offerta?.azienda || "")} · ${esc(r.offerta?.offerta?.nome || "")}</td>
            <td><span class="pill ${r.stato === "contratto_firmato" ? "ok" : r.stato === "annullata" ? "bad" : "warn"}">${ST[r.stato]}</span>${r.stato === "contratto_firmato" ? `<div class="small muted">${dIt(r.contratto_il)}</div>` : r.motivo ? `<div class="small muted">${esc(r.motivo)}</div>` : ""}</td>
            <td class="num">${r.stato === "contratto_firmato" ? (r.provvigione != null ? e(r.provvigione) : '<span class="muted small">da impostare</span>') : "—"}</td>
            <td><button class="btn sm" data-scheda="${r.pratica_id}">Pratica</button></td></tr>`).join("")}</tbody></table></div>`
          : `<div class="muted small">Nessun contratto richiesto. Nel preventivo spunta un'offerta e premi «Richiedi contratto».</div>`;
      }
      el.querySelectorAll("[data-scheda]").forEach(b => b.onclick = () => this.scheda(b.dataset.scheda));
      el.querySelectorAll("[data-evasa]").forEach(b => b.onclick = async () => { await db().from("richieste_ufficio").update({ stato: "evasa", evasa_il: new Date().toISOString() }).eq("id", b.dataset.evasa); this.disegnaArea(); });
    },

    /* ------------------------------ Scheda pratica (storico, documenti, ricontatti, richieste, riassegnazione) ------------------------------ */
    async scheda(id) {
      const pr = Server.profilo;
      const { data: p, error } = await db().from("pratiche").select(Store._selPratiche + ", documenti(*), eventi(*), ricontatti(*), richieste_ufficio(*), preventivi(id, numero, versione, emesso_il, stato_email)").eq("id", id).maybeSingle();
      if (error || !p) { U.toast("Pratica non trovata o non visibile per il tuo ruolo"); return; }
      const ops = pr.ufficio || pr.ruolo === "responsabile" ? (await db().from("operatori").select("id, nome, cognome, codice_agente, ruolo, stato").in("ruolo", ["agente", "responsabile", "backoffice", "admin"]).neq("stato", "disattivato").order("cognome")).data || [] : [];
      const ev = (p.eventi || []).sort((a, b) => String(b.at).localeCompare(a.at));
      const nomeOp = idOp => { const o = ops.find(x => x.id === idOp); return o ? nome(o) : ""; };
      U.dialog(`Pratica ${p.numero}`, `
        <div class="fields">
          <div class="full"><b>${esc(p.clienti?.denominazione || "(cliente da completare)")}</b> · ${esc(SP().label[p.stato] || p.stato)}${p.motivo_esito ? ` <span class="muted small">(${esc(p.motivo_esito)})</span>` : ""}</div>
          <div class="small"><span class="muted">Produttore</span><br>${esc(nome(p.produttore))}</div>
          <div class="small"><span class="muted">Creata da</span><br>${esc(nome(p.creatore))}${p.per_conto_di ? " (per conto del produttore)" : ""}</div>
          <div class="small"><span class="muted">Segnalatore</span><br>${esc(p.segnalatore ? nome(p.segnalatore) : "—")}</div>
          <div class="small"><span class="muted">Back office</span><br>${esc(p.ufficio ? nome(p.ufficio) : "non assegnato")}</div>
        </div>
        <h3 style="margin:16px 0 6px">Documenti</h3>
        ${(p.documenti || []).length ? `<ul class="lista">${p.documenti.map(d => `<li><span>${esc(d.nome)} <span class="muted small">${esc(d.tipo_doc)} · ${dIt(d.at)}</span></span>${d.tipo_doc === "bolletta" && !pr.puo_bollette ? `<span class="muted small" title="Lo attiva un amministratore in Utenti e rete">serve il permesso</span>` : `<button class="btn sm" data-doc="${esc(d.storage_path)}">Apri</button>`}</li>`).join("")}</ul>` : `<div class="muted small">Nessun documento.</div>`}
        <div class="btn-row" style="margin-top:6px"><label class="btn sm">Carica documento<input type="file" id="sc-file" hidden multiple accept=".pdf,image/*"></label><select id="sc-tipo" class="pill-select"><option value="bolletta">Bolletta</option><option value="documento_identita">Documento d'identità</option><option value="contratto">Contratto firmato</option><option value="altro">Altro</option></select></div>
        <h3 style="margin:16px 0 6px">Preventivi emessi</h3>
        ${(p.preventivi || []).length ? `<ul class="lista">${p.preventivi.sort((a, b) => b.versione - a.versione).map(q => `<li><span>${esc(q.numero)} <span class="muted small">${dtIt(q.emesso_il)} · email: ${esc(q.stato_email.replace(/_/g, " "))}</span></span></li>`).join("")}</ul>` : `<div class="muted small">Nessun preventivo emesso.</div>`}
        <h3 style="margin:16px 0 6px">Ricontatti</h3>
        ${(p.ricontatti || []).length ? `<ul class="lista">${p.ricontatti.map(r => `<li><span>${dIt(r.scadenza)} · ${esc(r.nota || "")}</span>${r.fatto_il ? '<span class="pill ok">fatto</span>' : `<button class="btn sm" data-fatto="${r.id}">Fatto</button>`}</li>`).join("")}</ul>` : ""}
        <div class="btn-row"><input type="date" id="sc-ric-d" style="width:auto"><input id="sc-ric-n" placeholder="nota" style="width:auto;flex:1"><button class="btn sm" id="sc-ric">Aggiungi</button></div>
        ${pr.ufficio ? `<h3 style="margin:16px 0 6px">Richiedi alla rete</h3><div class="btn-row"><select id="sc-rq-t" class="pill-select"><option value="documento">Documento mancante</option><option value="informazione">Informazione</option></select><input id="sc-rq" placeholder="es. carta d'identità del cliente" style="flex:1;width:auto"><button class="btn sm" id="sc-rq-b">Invia richiesta</button></div>` : ""}
        <h3 style="margin:16px 0 6px">Note</h3>
        <div class="btn-row"><input id="sc-nota" placeholder="nota sulla pratica" style="flex:1;width:auto">${pr.ufficio ? '<label class="check"><input type="checkbox" id="sc-int"> interna (non visibile alla rete)</label>' : ""}<button class="btn sm" id="sc-nota-b">Aggiungi</button></div>
        ${ops.length ? `<h3 style="margin:16px 0 6px">Attribuzione</h3>
          <div class="fields"><label class="f">Riassegna al produttore<select id="sc-prod">${ops.filter(o => o.ruolo !== "backoffice").map(o => `<option value="${o.id}" ${o.id === p.produttore_id ? "selected" : ""}>${esc(nome(o))}</option>`).join("")}</select></label>
          <label class="f">Motivazione<input id="sc-mot" placeholder="obbligatoria"></label>
          ${pr.ufficio ? `<label class="f">Operatore di back office<select id="sc-bo"><option value="">— nessuno —</option>${ops.filter(o => ["backoffice", "admin"].includes(o.ruolo)).map(o => `<option value="${o.id}" ${o.id === p.backoffice_id ? "selected" : ""}>${esc(nome(o))}</option>`).join("")}</select></label>` : ""}</div>
          <div class="btn-row" style="margin-top:6px"><button class="btn sm" id="sc-riass">Riassegna</button>${pr.ufficio ? '<button class="btn sm" id="sc-bo-b">Assegna back office</button>' : ""}</div>` : ""}
        <h3 style="margin:16px 0 6px">Storico</h3>
        <ul class="timeline">${ev.map(e => `<li><span class="muted small">${dtIt(e.at)}</span> · ${esc(descriviEvento(e, nomeOp))}${e.interno ? ' <span class="pill">interna</span>' : ""}</li>`).join("") || "<li class='muted'>—</li>"}</ul>`,
        [{ label: "Chiudi" }, { label: "Apri nel preventivo", primary: true, onClick: () => { U.apriPratica(id); $(`#tabs [data-view="preventivo"][data-seg="${p.segmento === "privati" ? "privati" : "business"}"]`)?.classList.add("active"); } }]);
      const ri = () => setTimeout(() => this.scheda(id), 0);
      const fatto = async fn => { try { await fn(); $("#dlg").close(); ri(); } catch (e) { U.toast(e.message); } };
      const chk = r => { if (r.error) throw new Error(r.error.message); return r; };
      $$("#dlg [data-doc]").forEach(b => b.onclick = async () => { try { window.open(await Server.linkDocumento(b.dataset.doc), "_blank", "noopener"); } catch (e) { U.toast(e.message); } });
      $("#sc-file").onchange = e => fatto(async () => { for (const f of e.target.files) await Server.caricaDocumento(id, f, $("#sc-tipo").value); chk(await db().from("eventi").insert({ pratica_id: id, tipo: "documento", testo: "Caricati " + e.target.files.length + " documenti", autore_id: pr.id })); });
      $$("#dlg [data-fatto]").forEach(b => b.onclick = () => fatto(async () => chk(await db().from("ricontatti").update({ fatto_il: new Date().toISOString() }).eq("id", b.dataset.fatto))));
      $("#sc-ric").onclick = () => fatto(async () => { const d = $("#sc-ric-d").value; if (!d) throw new Error("Scegli la data del ricontatto");
        chk(await db().from("ricontatti").insert({ pratica_id: id, scadenza: d, nota: $("#sc-ric-n").value, assegnato_a: p.produttore_id, created_by: pr.id }));
        chk(await db().from("pratiche").update({ ricontatto: d }).eq("id", id)); });
      $("#sc-nota-b").onclick = () => fatto(async () => { const t = $("#sc-nota").value.trim(); if (!t) throw new Error("Scrivi la nota"); const int = !!$("#sc-int")?.checked;
        chk(await db().from("eventi").insert({ pratica_id: id, tipo: int ? "nota_interna" : "nota", testo: t, interno: int, autore_id: pr.id })); });
      $("#sc-rq-b")?.addEventListener("click", () => fatto(async () => { const t = $("#sc-rq").value.trim(); if (!t) throw new Error("Scrivi la richiesta");
        chk(await db().from("richieste_ufficio").insert({ pratica_id: id, tipo: $("#sc-rq-t").value, testo: t, destinatario_id: p.produttore_id, richiesto_da: pr.id })); }));
      $("#sc-riass")?.addEventListener("click", () => fatto(async () => { await Server.rpc("riassegna_pratica", { pid: id, nuovo_produttore: $("#sc-prod").value, motivo: $("#sc-mot").value }); }));
      $("#sc-bo-b")?.addEventListener("click", () => fatto(async () => chk(await db().from("pratiche").update({ backoffice_id: $("#sc-bo").value || null }).eq("id", id))));
    },

    /* ------------------------------ Cruscotto ------------------------------ */
    async disegnaCruscotto() {
      const el = this.crus.sec;
      const strutture = (await db().from("strutture").select("id, nome").order("nome")).data || [];
      const ops = (await db().from("operatori").select("id, nome, cognome, codice_agente, ruolo").in("ruolo", ["agente", "responsabile"]).order("cognome")).data || [];
      const f = this._fc ||= { dal: new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10), al: new Date().toISOString().slice(0, 10), struttura: "", produttore: "" };
      el.innerHTML = `<div class="card"><div class="card-head"><div><h2>Cruscotto</h2><div class="muted small">Calcolato dal database sulle sole pratiche che il tuo ruolo può vedere.</div></div></div>
        <div class="filters"><label class="f">Dal<input type="date" id="cr-dal" value="${f.dal}"></label><label class="f">Al<input type="date" id="cr-al" value="${f.al}"></label>
        <label class="f">Struttura<select id="cr-str"><option value="">Tutte</option>${strutture.map(s => `<option value="${s.id}" ${s.id === f.struttura ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}</select></label>
        <label class="f">Produttore<select id="cr-prod"><option value="">Tutti</option>${ops.map(o => `<option value="${o.id}" ${o.id === f.produttore ? "selected" : ""}>${esc(nome(o))}</option>`).join("")}</select></label></div>
        <div id="cr-out" style="margin-top:14px"><div class="empty"><span class="spinner"></span>Calcolo…</div></div></div>`;
      ["#cr-dal", "#cr-al", "#cr-str", "#cr-prod"].forEach(s => $(s).onchange = () => { f.dal = $("#cr-dal").value; f.al = $("#cr-al").value; f.struttura = $("#cr-str").value; f.produttore = $("#cr-prod").value; this.disegnaCruscotto(); });
      let k;
      try { k = await Server.rpc("cruscotto", { dal: f.dal || null, al: f.al || null, struttura: f.struttura || null, produttore: f.produttore || null }); }
      catch (e) { $("#cr-out").innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; return; }
      const ps = k.per_stato || {}, tot = k.pratiche || 0;
      $("#cr-out").innerHTML = `<div class="kpis">
          <div class="kpi"><div class="l">Bollette ricevute</div><div class="v">${k.bollette}</div><div class="s">${tot} pratiche nel periodo</div></div>
          <div class="kpi"><div class="l">Preventivi</div><div class="v">${k.preventivi}</div><div class="s">${k.inviati} inviati</div></div>
          <div class="kpi"><div class="l">Ricontatti scaduti</div><div class="v">${k.ricontatti_scaduti}</div></div>
          <div class="kpi"><div class="l">Richieste inoltrate</div><div class="v">${k.richieste_inoltrate}</div></div>
          <div class="kpi good"><div class="l">Attivazioni</div><div class="v">${k.attivazioni}</div><div class="s">conversione ${k.conversione != null ? Math.round(k.conversione * 100) + "%" : "—"}</div></div></div>
        <div class="grid grid-2"><div><h3 style="margin-bottom:8px">Pratiche per stato</h3><div class="table-wrap"><table><tbody>${SP().elenco.filter(([c]) => ps[c]).map(([c, l]) => `<tr><td>${esc(l)}</td><td class="num">${ps[c]}</td><td style="width:45%"><div class="barra"><span style="width:${Math.round(ps[c] / Math.max(tot, 1) * 100)}%"></span></div></td></tr>`).join("") || '<tr><td class="muted">Nessuna pratica</td></tr>'}</tbody></table></div>
          <h3 style="margin:16px 0 8px">Motivi di mancata conclusione</h3><div class="table-wrap"><table><tbody>${Object.entries(k.motivi_negativi || {}).sort((a, b) => b[1] - a[1]).map(([m, n]) => `<tr><td>${esc(m)}</td><td class="num">${n}</td></tr>`).join("") || '<tr><td class="muted">Nessuno</td></tr>'}</tbody></table></div></div>
          <div><h3 style="margin-bottom:8px">Per produttore</h3><div class="table-wrap"><table><thead><tr><th>Produttore</th><th class="num">Pratiche</th><th class="num">Attivazioni</th></tr></thead><tbody>${(k.per_produttore || []).map(r => `<tr><td>${esc(r.nome)}${r.codice_agente ? ` <span class="muted small">${esc(r.codice_agente)}</span>` : ""}</td><td class="num">${r.pratiche}</td><td class="num">${r.attivazioni}</td></tr>`).join("") || '<tr><td class="muted">—</td></tr>'}</tbody></table></div></div></div>`;
    },

    /* ------------------------------ Utenti e rete ------------------------------ */
    async disegnaRete() {
      const el = this.rete.sec, pr = Server.profilo;
      const [{ data: ops, error }, { data: strutture }] = await Promise.all([
        db().from("operatori").select("*").order("cognome"), db().from("strutture").select("*").order("nome")]);
      if (error) { el.innerHTML = `<div class="alert bad">${esc(error.message)}</div>`; return; }
      const f = this._fr ||= { q: "", ruolo: "", stato: "" };
      const L = ops.filter(o => (!f.ruolo || o.ruolo === f.ruolo) && (!f.stato || o.stato === f.stato) &&
        (!f.q || [o.nome, o.cognome, o.email, o.codice_agente, o.ragione_sociale].join(" ").toLowerCase().includes(f.q.toLowerCase())));
      const strNome = id => strutture.find(s => s.id === id)?.nome || "—";
      // candidature arrivate dalla pagina pubblica /partner (solo ufficio)
      const cand = pr.ufficio ? ((await db().from("candidature").select("*").order("created_at", { ascending: false }).limit(3000)).data || []) : [];
      const fc = this._fc ||= "aperte", cq = (this._cq || "").trim().toLowerCase();
      const importata = c => c.privacy_versione === "importazione";   // caricate dall'elenco degli utenti della piattaforma precedente
      const candV = cand.filter(c => (fc === "tutte" || (fc === "aperte" ? ["nuova", "contattata"].includes(c.stato) && !importata(c) : fc === "importate" ? importata(c) && ["nuova", "contattata"].includes(c.stato) : c.stato === fc))
        && (!cq || [c.nome, c.cognome, c.cognome + " " + c.nome, c.nome + " " + c.cognome, c.email, c.telefono, String(c.telefono || "").replace(/\D/g, ""), c.ragione_sociale, c.piva, c.zona, c.tipo_altro, c.note].join(" ").toLowerCase().includes(cq)));
      const nImp = cand.filter(c => importata(c) && ["nuova", "contattata"].includes(c.stato)).length;
      const TIPO_C = { agente: "Agente", subagente: "Subagente", produttore: "Produttore / segnalatore", agenzia: "Agenzia o struttura", altro: "Altro" };
      const STATO_C = { nuova: ["Nuova", "warn"], contattata: ["Contattata", ""], attivata: ["Attivata", "ok"], scartata: ["Scartata", "bad"] };
      const nNuove = cand.filter(c => c.stato === "nuova" && !importata(c)).length;
      const boxCand = pr.ufficio ? `<div class="card" style="margin-bottom:18px"><div class="card-head"><div><h2>Candidature partner <span class="pill ${nNuove ? "warn" : ""}">${nNuove} nuove</span>${nImp ? ` <span class="pill">${nImp} importate da attivare</span>` : ""}</h2>
          <div class="muted small">Arrivano dalla pagina pubblica alcaenergia.it/partner o dall'elenco degli utenti della piattaforma precedente («Importate»). «Attiva» crea l'utente con questi dati e gli invia l'invito personale al portale.</div></div>
          <div class="btn-row"><label class="f">Cerca<input id="cd-q" value="${esc(this._cq || "")}" placeholder="nome, cognome, email, telefono, P.IVA, zona"></label>
          <label class="f">Mostra<select id="cd-f">${[["aperte", "Da gestire (dal sito)"], ["importate", `Importate da attivare (${nImp})`], ["attivata", "Attivate"], ["scartata", "Scartate"], ["tutte", "Tutte"]].map(([k, v]) => `<option value="${k}" ${k === fc ? "selected" : ""}>${v}</option>`).join("")}</select></label></div></div>
        ${candV.length > 60 ? `<div class="muted small" style="margin-bottom:6px">${candV.length} candidature in elenco: usa «Cerca» per trovarne una.</div>` : ""}
        <div class="table-wrap"><table><thead><tr><th>Ricevuta</th><th>Candidato</th><th>Figura</th><th>Contatti</th><th>Zona · esperienza</th><th>Stato</th><th></th></tr></thead><tbody>
        ${candV.map(c => `<tr><td class="small">${dtIt(c.created_at)}</td><td><a href="#" class="o-link" data-cd-mod="${c.id}" title="Apri e modifica la candidatura"><b>${esc(c.cognome)} ${esc(c.nome)}</b></a>${c.ragione_sociale ? `<div class="small muted">${esc(c.ragione_sociale)}${c.piva ? " · P.IVA " + esc(c.piva) : ""}</div>` : c.piva ? `<div class="small muted">P.IVA ${esc(c.piva)}</div>` : ""}</td>
          <td class="small">${esc(TIPO_C[c.tipo] || c.tipo)}${c.tipo_altro ? `<div class="muted">${esc(c.tipo_altro)}</div>` : ""}</td>
          <td class="small"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a><div><a href="tel:${esc(c.telefono.replace(/[^\d+]/g, ""))}">${esc(c.telefono)}</a></div></td>
          <td class="small">${esc(c.zona || "—")}${c.esperienza ? `<div class="muted">${esc(c.esperienza)}</div>` : ""}${c.messaggio ? `<div class="muted">«${esc(c.messaggio)}»</div>` : ""}${c.note ? `<div><b>Note:</b> ${esc(c.note)}</div>` : ""}</td>
          <td><span class="pill ${STATO_C[c.stato][1]}">${STATO_C[c.stato][0]}</span>${c.gestita_il ? `<div class="small muted">${dIt(c.gestita_il)}</div>` : ""}</td>
          <td><div class="btn-row"><button class="btn sm" data-cd-mod="${c.id}">Modifica</button>${["nuova", "contattata"].includes(c.stato) ? `<button class="btn sm primary" data-cd-att="${c.id}">Attiva</button>${c.stato === "nuova" ? `<button class="btn sm" data-cd-st="contattata" data-cd="${c.id}">Contattata</button>` : ""}<button class="btn sm danger" data-cd-st="scartata" data-cd="${c.id}">Scarta</button>` : c.stato === "scartata" ? `<button class="btn sm" data-cd-st="contattata" data-cd="${c.id}">Ripristina</button>` : ""}</div></td></tr>`).join("") || `<tr><td colspan="7" class="muted">Nessuna candidatura ${fc === "aperte" ? "da gestire" : "in questo elenco"}.</td></tr>`}
        </tbody></table></div></div>` : "";
      el.innerHTML = boxCand + `<div class="card"><div class="card-head"><div><h2>Utenti e rete</h2><div class="muted small">Prepara gli account, controllali e poi invia gli inviti personali. Le password non sono mai visibili all'amministrazione.</div></div>
          <div class="btn-row"><button class="btn" id="rt-modello">Scarica modello CSV</button><label class="btn">Importa Excel/CSV<input type="file" id="rt-file" hidden accept=".csv,.xlsx,.xls,.txt"></label><button class="btn primary" id="rt-nuovo">Nuovo utente</button></div></div>
        ${ops.length ? "" : `<div class="alert warn">Nessun utente ancora: importa l'elenco reale di agenti e subagenti dal modello CSV/Excel. Non vengono creati utenti di esempio.</div>`}
        <div class="filters"><label class="f">Cerca<input id="rt-q" value="${esc(f.q)}" placeholder="nome, email, codice"></label>
          <label class="f">Ruolo<select id="rt-ruolo"><option value="">Tutti</option>${Object.entries(RUOLI).map(([k, v]) => `<option value="${k}" ${k === f.ruolo ? "selected" : ""}>${v}</option>`).join("")}</select></label>
          <label class="f">Stato<select id="rt-stato"><option value="">Tutti</option>${Object.entries(STATI_ACC).map(([k, v]) => `<option value="${k}" ${k === f.stato ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
        <div class="btn-row" style="margin:12px 0"><span class="muted small" id="rt-n">0 selezionati</span><button class="btn sm" data-az="invita">Invia invito per email</button><button class="btn sm" data-az="link_invito">Crea link di invito</button><button class="btn sm" data-az="sospendi">Sospendi</button><button class="btn sm" data-az="riattiva">Riattiva</button><button class="btn sm danger" data-az="disattiva">Disattiva</button><button class="btn sm" id="rt-port">Riassegna pratiche…</button></div>
        <div class="table-wrap"><table><thead><tr><th><input type="checkbox" id="rt-all"></th><th>Codice</th><th>Nome</th><th>Email</th><th>Ruolo</th><th>Struttura / responsabile</th><th>Stato</th><th>Invito · attivazione · ultimo accesso</th><th></th></tr></thead><tbody>
        ${L.map(o => `<tr><td><input type="checkbox" data-op="${o.id}"></td><td class="small">${esc(o.codice_agente || "—")}</td><td><b>${esc(o.cognome)} ${esc(o.nome)}</b>${o.ragione_sociale ? `<div class="small muted">${esc(o.ragione_sociale)}</div>` : ""}</td>
          <td class="small">${esc(o.email)}${o.telefono ? `<div class="muted">${esc(o.telefono)}</div>` : ""}</td><td class="small">${esc(RUOLI[o.ruolo])}${o.permessi?.length ? `<div class="muted">${esc(o.permessi.join(", "))}</div>` : ""}</td>
          <td class="small">${esc(strNome(o.struttura_id))}${o.responsabile_id ? `<div class="muted">→ ${esc(nome(ops.find(x => x.id === o.responsabile_id)))}</div>` : ""}</td>
          <td><span class="pill ${o.stato === "attivo" ? "ok" : o.stato === "sospeso" || o.stato === "disattivato" ? "bad" : "warn"}">${STATI_ACC[o.stato]}</span></td>
          <td class="small muted">${dIt(o.invitato_il)} · ${dIt(o.attivato_il)} · ${o.ultimo_accesso ? dtIt(o.ultimo_accesso) : "—"}</td><td><button class="btn sm" data-mod="${o.id}">Modifica</button></td></tr>`).join("") || `<tr><td colspan="9" class="muted">Nessun utente con questi filtri.</td></tr>`}
        </tbody></table></div></div>
        <div class="grid grid-2" style="margin-top:18px"><div class="card"><div class="card-head"><h2>Strutture</h2><button class="btn sm" id="rt-str">Nuova struttura</button></div>
          ${(strutture || []).length ? `<ul class="lista">${strutture.map(s => `<li><span><b>${esc(s.nome)}</b> <span class="muted small">responsabile: ${esc(nome(ops.find(o => o.id === s.responsabile_id)))}${s.parent_id ? " · dentro " + esc(strNome(s.parent_id)) : ""}</span></span><button class="btn sm" data-str="${s.id}">Modifica</button></li>`).join("")}</ul>` : '<div class="muted small">Nessuna struttura.</div>'}</div>
          ${pr.admin_attivo ? `<div class="card"><h2 style="margin-bottom:10px">Registro modifiche</h2><div id="rt-audit" class="small"><span class="spinner"></span></div></div>` : ""}</div>`;
      const sel = () => $$("#view-rete [data-op]:checked").map(c => c.dataset.op);
      const aggN = () => $("#rt-n").textContent = sel().length + " selezionati";
      $$("#view-rete [data-op]").forEach(c => c.onchange = aggN);
      $("#rt-all").onchange = e => { $$("#view-rete [data-op]").forEach(c => c.checked = e.target.checked); aggN(); };
      $("#rt-q").oninput = e => { f.q = e.target.value; clearTimeout(this._t); this._t = setTimeout(() => this.disegnaRete(), 300); };
      $("#rt-ruolo").onchange = e => { f.ruolo = e.target.value; this.disegnaRete(); };
      $("#rt-stato").onchange = e => { f.stato = e.target.value; this.disegnaRete(); };
      $("#rt-modello").onclick = () => this.modello();
      $("#rt-file").onchange = e => { const file = e.target.files[0]; e.target.value = ""; if (file) this.importa(file); };
      $("#rt-nuovo").onclick = () => this.modifica(null, ops, strutture);
      $$("#view-rete [data-mod]").forEach(b => b.onclick = () => this.modifica(ops.find(o => o.id === b.dataset.mod), ops, strutture));
      $("#rt-str").onclick = () => this.struttura(null, ops, strutture);
      $$("#view-rete [data-str]").forEach(b => b.onclick = () => this.struttura(strutture.find(s => s.id === b.dataset.str), ops, strutture));
      $$("#view-rete [data-az]").forEach(b => b.onclick = () => this.azione(b.dataset.az, sel(), ops));
      $("#rt-port").onclick = () => this.portafoglio(ops);
      if (pr.ufficio) {
        $("#cd-f").onchange = e => { this._fc = e.target.value; this.disegnaRete(); };
        $("#cd-q").oninput = e => { this._cq = e.target.value; clearTimeout(this._tq); this._tq = setTimeout(async () => { await this.disegnaRete(); const q = $("#cd-q"); if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 350); };
        $$("#view-rete [data-cd-st]").forEach(b => b.onclick = async () => {
          const st = b.dataset.cdSt, c = cand.find(x => x.id === b.dataset.cd);
          const note = st === "scartata" ? prompt("Motivo dello scarto (facoltativo, resta nelle note):", c.note || "") : c.note;
          if (note === null) return;
          const { error } = await db().from("candidature").update({ stato: st, note: note || null, gestita_da: pr.id, gestita_il: new Date().toISOString() }).eq("id", c.id);
          if (error) U.toast(error.message); else this.disegnaRete();
        });
        $$("#view-rete [data-cd-att]").forEach(b => b.onclick = () => this.attivaCandidatura(cand.find(x => x.id === b.dataset.cdAtt), ops, strutture));
        $$("#view-rete [data-cd-mod]").forEach(b => b.onclick = e => { e.preventDefault(); this.modificaCandidatura(cand.find(x => x.id === b.dataset.cdMod)); });
      }
      if (pr.admin_attivo) {
        const { data: au } = await db().from("audit").select("at, azione, tabella, record_id, motivazione, autore_id, prima, dopo").order("at", { ascending: false }).limit(40);
        $("#rt-audit").innerHTML = (au || []).length ? `<ul class="timeline">${au.map(a => `<li>${dtIt(a.at)} · <b>${esc(a.azione)}</b> ${esc(a.tabella)} ${esc(a.dopo?.email || a.prima?.email || a.dopo?.nome || "")} ${a.prima && a.dopo && a.prima.ruolo !== a.dopo.ruolo ? `· ruolo ${esc(a.prima.ruolo)} → ${esc(a.dopo.ruolo)}` : ""}${a.prima && a.dopo && a.prima.stato !== a.dopo.stato ? ` · ${esc(a.prima.stato)} → ${esc(a.dopo.stato)}` : ""} <span class="muted">${esc(nome(ops.find(o => o.id === a.autore_id)))}${a.motivazione ? " · " + esc(a.motivazione) : ""}</span></li>`).join("")}</ul>` : "—";
      }
    },
    /* dati di fatturazione (provvigioni): l'utente compila i propri dal suo nome in alto; l'ufficio li vede e li corregge da Utenti e rete */
    async datiFatturazione(opId, titolo) {
      const { data: d0, error: e0 } = await db().from("operatori_fatturazione").select("*").eq("operatore_id", opId).maybeSingle();
      if (e0) { U.toast(e0.message); return; }
      const d = d0 || {}, v = k => esc(d[k] || "");
      const sel = (id, opz, cur) => `<select id="${id}"><option value="">—</option>${opz.map(([k, t]) => `<option value="${k}" ${k === cur ? "selected" : ""}>${t}</option>`).join("")}</select>`;
      U.dialog(titolo, `<p class="small muted" style="margin-top:0">Servono per la fatturazione delle provvigioni. Li vedono solo tu e l'ufficio Alca.</p>
        <div class="fields">
          <label class="f">Tipo${sel("fa-tipo", [["persona", "Persona fisica"], ["ditta_individuale", "Ditta individuale"], ["societa", "Società"]], d.tipo_soggetto)}</label>
          <label class="f">Regime fiscale${sel("fa-regime", [["ordinario", "Ordinario"], ["forfettario", "Forfettario"], ["occasionale", "Prestazione occasionale"], ["altro", "Altro"]], d.regime_fiscale)}</label>
          <label class="f full">Ragione sociale / nome per la fattura<input id="fa-rs" maxlength="160" value="${v("ragione_sociale")}"></label>
          <label class="f">Partita IVA<input id="fa-piva" inputmode="numeric" maxlength="13" value="${v("partita_iva")}" placeholder="11 cifre"></label>
          <label class="f">Codice fiscale<input id="fa-cf" maxlength="16" value="${v("codice_fiscale")}"></label>
          <label class="f full">Indirizzo<input id="fa-ind" maxlength="200" value="${v("indirizzo")}" placeholder="via e numero civico"></label>
          <label class="f">CAP<input id="fa-cap" inputmode="numeric" maxlength="5" value="${v("cap")}"></label>
          <label class="f">Comune<input id="fa-com" maxlength="80" value="${v("comune")}"></label>
          <label class="f">Provincia<input id="fa-prov" maxlength="2" value="${v("provincia")}" placeholder="es. NA"></label>
          <label class="f">PEC<input id="fa-pec" type="email" value="${v("pec")}"></label>
          <label class="f">Codice destinatario SDI<input id="fa-sdi" maxlength="7" value="${v("codice_sdi")}" placeholder="7 caratteri"></label>
          <label class="f">IBAN per i pagamenti<input id="fa-iban" maxlength="34" value="${v("iban")}"></label>
          <label class="f">Iscrizione RUI / albo<input id="fa-rui" maxlength="40" value="${v("iscrizione_rui")}" placeholder="facoltativo"></label>
          <label class="f full">Note<textarea id="fa-note" rows="2" maxlength="500">${v("note")}</textarea></label>
        </div><div class="status" id="fa-st"></div>${d.aggiornato_il ? `<p class="muted small">Ultimo aggiornamento ${dtIt(d.aggiornato_il)}</p>` : ""}`,
        [{ label: "Annulla" }, { label: "Salva", primary: true, onClick: async () => {
          const g = id => $(id).value.trim(), nul = s => s === "" ? null : s, st = $("#fa-st");
          const r = { operatore_id: opId, tipo_soggetto: nul(g("#fa-tipo")), regime_fiscale: nul(g("#fa-regime")), ragione_sociale: nul(g("#fa-rs")),
            partita_iva: nul(g("#fa-piva").replace(/^IT/i, "").replace(/\s+/g, "")), codice_fiscale: nul(g("#fa-cf").replace(/\s+/g, "").toUpperCase()),
            indirizzo: nul(g("#fa-ind")), cap: nul(g("#fa-cap")), comune: nul(g("#fa-com")), provincia: nul(g("#fa-prov").toUpperCase()),
            pec: nul(g("#fa-pec")), codice_sdi: nul(g("#fa-sdi").toUpperCase()), iban: nul(g("#fa-iban").replace(/\s+/g, "").toUpperCase()), iscrizione_rui: nul(g("#fa-rui")), note: nul(g("#fa-note")) };
          const errori = [r.partita_iva && !/^\d{11}$/.test(r.partita_iva) && "la partita IVA deve avere 11 cifre", r.codice_fiscale && !/^([A-Z0-9]{16}|\d{11})$/.test(r.codice_fiscale) && "il codice fiscale non è valido",
            r.cap && !/^\d{5}$/.test(r.cap) && "il CAP deve avere 5 cifre", r.provincia && !/^[A-Z]{2}$/.test(r.provincia) && "la provincia va indicata con 2 lettere",
            r.pec && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.pec) && "la PEC non è valida", r.codice_sdi && !/^[A-Z0-9]{7}$/.test(r.codice_sdi) && "il codice SDI deve avere 7 caratteri",
            r.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(r.iban) && "l'IBAN non è valido"].filter(Boolean);
          if (errori.length) { st.className = "status err"; st.textContent = "Controlla: " + errori.join("; ") + "."; return false; }
          const { error } = await db().from("operatori_fatturazione").upsert(r);
          if (error) { st.className = "status err"; st.textContent = error.message; return false; }
          U.toast("Dati salvati");
        } }]);
    },
    /* scheda della candidatura: l'ufficio corregge contatti e dati prima dell'attivazione */
    modificaCandidatura(c) {
      if (!c) return;
      const v = k => esc(c[k] || "");
      const TIPI = [["agente", "Agente"], ["subagente", "Subagente"], ["produttore", "Produttore / segnalatore"], ["agenzia", "Agenzia o struttura"], ["altro", "Altro"]];
      const STATI = [["nuova", "Nuova"], ["contattata", "Contattata"], ["scartata", "Scartata"]];
      const att = c.stato === "attivata";
      U.dialog(`Candidatura · ${c.cognome} ${c.nome}`, `<p class="small muted" style="margin-top:0">Ricevuta il ${dtIt(c.created_at)}${c.privacy_versione === "importazione" ? " · importata dall'elenco degli utenti della piattaforma precedente" : " · dalla pagina alcaenergia.it/partner"}${c.gestita_il ? ` · ultima gestione ${dtIt(c.gestita_il)}` : ""}.
        ${att ? " <b>Già attivata:</b> le modifiche qui non cambiano l'utente del portale, che si corregge da Utenti e rete." : ""}</p>
        <div class="fields">
          <label class="f">Nome<input id="cm-nome" maxlength="80" value="${v("nome")}"></label>
          <label class="f">Cognome<input id="cm-cognome" maxlength="80" value="${v("cognome")}"></label>
          <label class="f">Email<input id="cm-email" type="email" maxlength="160" value="${v("email")}"></label>
          <label class="f">Telefono<input id="cm-tel" type="tel" maxlength="30" value="${v("telefono")}"></label>
          <label class="f full">Ragione sociale / agenzia<input id="cm-rs" maxlength="160" value="${v("ragione_sociale")}"></label>
          <label class="f">Partita IVA<input id="cm-piva" maxlength="13" inputmode="numeric" value="${v("piva")}"></label>
          <label class="f">Zona<input id="cm-zona" maxlength="120" value="${v("zona")}"></label>
          <label class="f">Figura<select id="cm-tipo">${TIPI.map(([k, t]) => `<option value="${k}" ${k === c.tipo ? "selected" : ""}>${t}</option>`).join("")}</select></label>
          <label class="f">Specifica (se «Altro»)<input id="cm-tipoa" maxlength="120" value="${v("tipo_altro")}"></label>
          ${att ? "" : `<label class="f">Stato<select id="cm-stato">${STATI.map(([k, t]) => `<option value="${k}" ${k === c.stato ? "selected" : ""}>${t}</option>`).join("")}</select></label>`}
          <label class="f full">Esperienza<textarea id="cm-esp" rows="2" maxlength="1000">${v("esperienza")}</textarea></label>
          ${c.messaggio ? `<div class="f full"><span class="small muted">Messaggio del candidato</span><div class="small">«${esc(c.messaggio)}»</div></div>` : ""}
          <label class="f full">Note interne<textarea id="cm-note" rows="2" maxlength="1000">${v("note")}</textarea></label>
        </div><div class="status" id="cm-st"></div>`,
        [{ label: "Annulla" }, { label: "Salva", primary: true, onClick: async () => {
          const g = id => $(id).value.trim(), nul = s => s === "" ? null : s, st = $("#cm-st");
          const r = { nome: g("#cm-nome"), cognome: g("#cm-cognome"), email: g("#cm-email").toLowerCase(), telefono: g("#cm-tel"),
            ragione_sociale: nul(g("#cm-rs")), piva: nul(g("#cm-piva").replace(/^IT/i, "").replace(/\s+/g, "")), zona: nul(g("#cm-zona")),
            tipo: $("#cm-tipo").value, tipo_altro: nul(g("#cm-tipoa")), esperienza: nul(g("#cm-esp")), note: nul(g("#cm-note")) };
          if (!att) r.stato = $("#cm-stato").value;
          const errori = [(!r.nome || !r.cognome) && "nome e cognome sono obbligatori", !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email) && "l'email non è valida",
            r.telefono !== (c.telefono || "") && r.telefono.replace(/\D/g, "").length < 6 && "il telefono deve avere almeno 6 cifre", r.piva && !/^\d{11}$/.test(r.piva) && "la partita IVA deve avere 11 cifre"].filter(Boolean);
          if (errori.length) { st.className = "status err"; st.textContent = "Controlla: " + errori.join("; ") + "."; return false; }
          if (r.email !== (c.email || "").toLowerCase()) {
            const { data: d } = await db().from("candidature").select("id").ilike("email", r.email).neq("id", c.id).limit(1);
            if (d?.length) { st.className = "status err"; st.textContent = "Questa email è già in un'altra candidatura."; return false; }
          }
          if (r.stato && r.stato !== c.stato) Object.assign(r, { gestita_da: Server.profilo.id, gestita_il: new Date().toISOString() });
          const { error } = await db().from("candidature").update(r).eq("id", c.id);
          if (error) { st.className = "status err"; st.textContent = error.message; return false; }
          U.toast("Candidatura aggiornata"); this.disegnaRete();
        } }]);
    },
    /* candidatura → utente del portale + invito personale, in un solo passaggio confermato */
    attivaCandidatura(c, ops, strutture) {
      const ruoloDa = { agente: "agente", subagente: "agente", produttore: "segnalatore", agenzia: "responsabile", altro: "segnalatore" }[c.tipo] || "agente";
      const pr = Server.profilo;
      U.dialog("Attiva il partner", `<p class="small muted">Crea l'utente con i dati della candidatura e invia subito l'invito personale a <b>${esc(c.email)}</b>. Puoi correggere i dati prima di confermare.</p>
        <div class="fields"><label class="f">Nome<input id="ca-nome" value="${esc(c.nome)}"></label><label class="f">Cognome<input id="ca-cognome" value="${esc(c.cognome)}"></label>
        <label class="f">Email di accesso<input id="ca-email" type="email" value="${esc(c.email)}"></label><label class="f">Telefono<input id="ca-tel" value="${esc(c.telefono)}"></label>
        <label class="f full">Ragione sociale / agenzia<input id="ca-rs" value="${esc(c.ragione_sociale || "")}"></label>
        <label class="f">Ruolo<select id="ca-ruolo">${Object.entries(RUOLI).filter(([k]) => !["admin", "backoffice"].includes(k) || pr.admin_attivo).map(([k, v]) => `<option value="${k}" ${k === ruoloDa ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f">Codice agente<input id="ca-cod" placeholder="facoltativo"></label>
        <label class="f">Struttura<select id="ca-str"><option value="">—</option>${strutture.map(s => `<option value="${s.id}">${esc(s.nome)}</option>`).join("")}</select></label>
        <label class="f">Responsabile / agente di riferimento<select id="ca-resp"><option value="">—</option>${ops.filter(x => ["responsabile", "agente"].includes(x.ruolo) && x.stato === "attivo").map(x => `<option value="${x.id}">${esc(nome(x))}</option>`).join("")}</select></label>
        <label class="check full"><input type="checkbox" id="ca-inv" checked> Invia subito l'invito per email</label></div>
        <div class="status" id="ca-st"></div>`,
        [{ label: "Annulla" }, { label: "Attiva", primary: true, onClick: async () => {
          const st = $("#ca-st");
          const v = { nome: $("#ca-nome").value.trim(), cognome: $("#ca-cognome").value.trim(), email: $("#ca-email").value.trim().toLowerCase(), telefono: $("#ca-tel").value.trim() || null,
            ragione_sociale: $("#ca-rs").value.trim() || null, ruolo: $("#ca-ruolo").value, codice_agente: $("#ca-cod").value.trim() || null,
            struttura_id: $("#ca-str").value || null, responsabile_id: $("#ca-resp").value || null, note: `Attivato dalla candidatura del ${dIt(c.created_at)} (${c.tipo}${c.tipo_altro ? ": " + c.tipo_altro : ""})` };
          if (!v.nome || !v.cognome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email)) { st.className = "status err"; st.textContent = "Nome, cognome ed email valida sono obbligatori."; return false; }
          st.className = "status"; st.innerHTML = '<span class="spinner"></span>Creo l\'utente…';
          let op = ops.find(o => (o.email || "").toLowerCase() === v.email);
          if (!op) {
            const r = await db().from("operatori").insert(v).select("id").single();
            if (r.error) { st.className = "status err"; st.textContent = /duplicate|unique/i.test(r.error.message) ? "Email o codice agente già usati da un altro utente." : r.error.message; return false; }
            op = r.data;
          }
          let esito = "Utente creato (invito non inviato).";
          if ($("#ca-inv").checked) {
            st.innerHTML = '<span class="spinner"></span>Invio l\'invito…';
            try {
              const r = await Server.funzione("energy-admin", { azione: "invita", ids: [op.id], motivo: "Attivazione da candidatura partner", redirect: location.origin + "/portale" });
              const e = (r.esiti || [])[0]; esito = e?.ok ? "Utente creato e invito inviato a " + v.email + "." : "Utente creato, ma l'invito non è partito: " + (e?.messaggio || "errore") + ". Riprova da Utenti e rete.";
            } catch (x) { esito = "Utente creato, ma l'invito non è partito: " + x.message + ". Riprova da Utenti e rete."; }
          }
          await db().from("candidature").update({ stato: "attivata", operatore_id: op.id, gestita_da: pr.id, gestita_il: new Date().toISOString() }).eq("id", c.id);
          U.toast(esito); this.disegnaRete();
        } }]);
    },
    modello() {
      const csv ="﻿codice_agente;nome;cognome;ragione_sociale;email;telefono;ruolo;struttura;codice_responsabile\n";
      const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "modello-utenti-rete-alca-energy.csv"; a.click();
      U.toast("Modello scaricato: compila una riga per persona. Ruoli: admin, backoffice, responsabile, agente (o subagente), segnalatore.");
    },
    async leggiFile(file) {
      let righe;
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await window.Importer.loadXLSX();
        const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: "array", raw: false });
        righe = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "", raw: false });   // tutto come testo: gli zeri iniziali restano
      } else {
        const txt = (await file.text()).replace(/^﻿/, "");
        const sep = (txt.split("\n")[0].match(/;/g) || []).length >= (txt.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
        const parse = l => { const out = []; let cur = "", q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map(s => s.trim()); };
        const ls = txt.split(/\r?\n/).filter(l => l.trim()); const h = parse(ls[0]).map(x => x.toLowerCase());
        righe = ls.slice(1).map(l => { const v = parse(l), o = {}; h.forEach((k, i) => o[k] = v[i] ?? ""); return o; });
      }
      const norm = k => k.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");
      const alias = { codice: "codice_agente", codice_agente: "codice_agente", cod_agente: "codice_agente", nome: "nome", cognome: "cognome", ragione_sociale: "ragione_sociale", agenzia: "ragione_sociale",
        email: "email", e_mail: "email", telefono: "telefono", cellulare: "telefono", ruolo: "ruolo", struttura: "struttura", codice_responsabile: "codice_responsabile", responsabile: "codice_responsabile" };
      return righe.map(r => { const o = {}; for (const [k, v] of Object.entries(r)) { const a = alias[norm(k)]; if (a) o[a] = String(v ?? "").trim(); } return o; }).filter(o => Object.values(o).some(Boolean));
    },
    async importa(file) {
      let righe; try { righe = await this.leggiFile(file); } catch (e) { U.toast("File non leggibile: " + e.message); return; }
      if (!righe.length) { U.toast("Il file non contiene righe"); return; }
      let prev; try { prev = await Server.rpc("importa_operatori", { righe, applica: false }); } catch (e) { U.toast(e.message); return; }
      const cnt = e => prev.filter(r => r.esito === e).length;
      const cls = { nuovo: "ok", aggiornato: "warn", invariato: "", conflitto: "bad", errore: "bad" };
      U.dialog("Anteprima importazione", `<p>${righe.length} righe lette da <b>${esc(file.name)}</b>: <span class="pill ok">${cnt("nuovo")} nuovi</span> <span class="pill warn">${cnt("aggiornato")} da aggiornare</span> <span class="pill">${cnt("invariato")} invariati</span> <span class="pill bad">${cnt("conflitto")} conflitti</span> <span class="pill bad">${cnt("errore")} con errori</span></p>
        <p class="small muted">Conflitti ed errori non vengono importati: correggili nel file. Nessuna persona viene unita automaticamente a un'altra. Gli inviti si inviano dopo, dall'elenco.</p>
        <div class="table-wrap" style="max-height:50vh"><table><thead><tr><th>Riga</th><th>Codice</th><th>Nome</th><th>Email</th><th>Esito</th><th>Note</th></tr></thead><tbody>
        ${prev.map(r => `<tr><td>${r.riga + 1}</td><td>${esc(r.codice_agente || "—")}</td><td>${esc(r.cognome)} ${esc(r.nome)}</td><td class="small">${esc(r.email || "")}</td><td><span class="pill ${cls[r.esito]}">${esc(r.esito)}</span></td><td class="small">${esc((r.messaggi || []).join(" · "))}</td></tr>`).join("")}</tbody></table></div>`,
        [{ label: "Annulla" }, { label: `Importa ${cnt("nuovo") + cnt("aggiornato")} righe`, primary: true, onClick: async () => {
          try { await Server.rpc("importa_operatori", { righe, applica: true }); U.toast("Importazione completata"); this.disegnaRete(); }
          catch (e) { U.toast(e.message); return false; }
        } }]);
    },
    modifica(o, ops, strutture) {
      const pr = Server.profilo, nuovo = !o; o = o || { ruolo: "agente", permessi: [] };
      U.dialog(nuovo ? "Nuovo utente" : `Modifica ${o.nome} ${o.cognome}`, `<div class="fields">
        <label class="f">Codice agente<input id="op-cod" value="${esc(o.codice_agente || "")}" placeholder="es. 00123"></label>
        <label class="f">Ruolo<select id="op-ruolo">${Object.entries(RUOLI).filter(([k]) => k !== "admin" || pr.admin_attivo).map(([k, v]) => `<option value="${k}" ${k === o.ruolo ? "selected" : ""}>${v}</option>`).join("")}</select></label>
        <label class="f">Nome<input id="op-nome" value="${esc(o.nome || "")}"></label><label class="f">Cognome<input id="op-cognome" value="${esc(o.cognome || "")}"></label>
        <label class="f full">Ragione sociale / agenzia<input id="op-rs" value="${esc(o.ragione_sociale || "")}"></label>
        <label class="f">Email personale di accesso<input id="op-email" type="email" value="${esc(o.email || "")}" ${o.auth_user_id ? "disabled" : ""}></label><label class="f">Telefono<input id="op-tel" value="${esc(o.telefono || "")}"></label>
        <label class="f">Struttura<select id="op-str"><option value="">—</option>${strutture.map(s => `<option value="${s.id}" ${s.id === o.struttura_id ? "selected" : ""}>${esc(s.nome)}</option>`).join("")}</select></label>
        <label class="f">Responsabile / agente di riferimento<select id="op-resp"><option value="">—</option>${ops.filter(x => x.id !== o.id && ["responsabile", "agente"].includes(x.ruolo)).map(x => `<option value="${x.id}" ${x.id === o.responsabile_id ? "selected" : ""}>${esc(nome(x))}</option>`).join("")}</select></label>
        ${pr.admin_attivo ? `<div class="full"><span class="muted small">Permessi aggiuntivi (back office)</span><div class="btn-row">${["utenti", "cataloghi", "provvigioni"].map(p => `<label class="check"><input type="checkbox" data-perm="${p}" ${o.permessi?.includes(p) ? "checked" : ""}> ${p}</label>`).join("")}</div></div>
          <label class="check full" id="op-prezzi-r"><input type="checkbox" data-perm="prezzi" ${o.permessi?.includes("prezzi") ? "checked" : ""}> Vede i prezzi nel catalogo offerte <span class="muted small">(senza la spunta vede solo stato, azienda, offerta, date, tipologia e fascia; amministratori e gestori dei cataloghi li vedono sempre)</span></label>
          <label class="check full" id="op-boll-r"><input type="checkbox" data-perm="bollette" ${o.permessi?.includes("bollette") ? "checked" : ""}> Può scaricare le bollette dei clienti <span class="muted small">(agenti e responsabili, per le pratiche che vedono; amministratori e back office possono sempre, i segnalatori mai)</span></label>` : ""}
        ${pr.puo_provvigioni ? `<div class="section-label">Provvigione per ogni contratto chiuso (lascia vuoto se non prevista)</div>
        <label class="f">Contratto privato (€)<input id="op-pp" type="number" min="0" step="1" inputmode="decimal" value="${o.provvigione_privato ?? ""}" placeholder="es. 30"></label>
        <label class="f">Contratto aziendale (€)<input id="op-pa" type="number" min="0" step="1" inputmode="decimal" value="${o.provvigione_azienda ?? ""}" placeholder="es. 50"></label>` : ""}
        <label class="check full"><input type="checkbox" id="op-cont" ${o.contatti_obbligatori ? "checked" : ""}> Email e telefono del cliente obbligatori <span class="muted small">(per chi non è amministratore lo sono sempre)</span></label>
        <label class="check full"><input type="checkbox" id="op-mkt" ${o.vede_mercato !== false ? "checked" : ""}> Vede il resto del mercato <span class="muted small">(offerte dei fornitori che non abbiamo, nei preventivi e in Offerte; amministratori e gestori dei cataloghi lo vedono sempre)</span></label>
        ${nuovo ? "" : `<div class="full"><button class="btn sm" type="button" id="op-fatt">Dati di fatturazione</button> <span class="muted small">indirizzo, partita IVA, IBAN… li compila anche l'utente dal suo nome in alto</span></div>`}
        ${nuovo ? "" : `<label class="f full">Motivazione della modifica<input id="op-mot" placeholder="es. passaggio di struttura"></label>`}</div>`,
        [{ label: "Annulla" }, { label: "Salva", primary: true, onClick: async () => {
          const v = { codice_agente: $("#op-cod").value.trim() || null, ruolo: $("#op-ruolo").value, nome: $("#op-nome").value.trim(), cognome: $("#op-cognome").value.trim(),
            ragione_sociale: $("#op-rs").value.trim() || null, telefono: $("#op-tel").value.trim() || null, struttura_id: $("#op-str").value || null, responsabile_id: $("#op-resp").value || null,
            contatti_obbligatori: $("#op-cont").checked, vede_mercato: $("#op-mkt").checked };
          if (pr.puo_provvigioni) {
            const num = s => { const t = $(s).value.trim(); return t === "" ? null : Number(t); };
            v.provvigione_privato = num("#op-pp"); v.provvigione_azienda = num("#op-pa");
            if ([v.provvigione_privato, v.provvigione_azienda].some(x => x != null && !(x >= 0))) { U.toast("Le provvigioni devono essere importi positivi"); return false; }
          }
          if (!o.auth_user_id) v.email = $("#op-email").value.trim();
          if (pr.admin_attivo) v.permessi = $$("[data-perm]:checked").map(c => c.dataset.perm).filter(p => p !== "bollette" || ["agente", "responsabile"].includes(v.ruolo));
          if (!v.nome || !v.cognome || (nuovo && !v.email)) { U.toast("Nome, cognome ed email sono obbligatori"); return false; }
          const r = nuovo ? await db().from("operatori").insert(v) : await db().from("operatori").update(v).eq("id", o.id);
          if (r.error) { U.toast(/duplicate|unique/i.test(r.error.message) ? "Codice agente o email già usati da un altro utente" : r.error.message); return false; }
          this.disegnaRete();
        } }]);
      const vediBoll = () => { const r = $("#op-boll-r"); if (r) r.hidden = !["agente", "responsabile"].includes($("#op-ruolo").value); };
      $("#op-ruolo").addEventListener("change", vediBoll); vediBoll();
      $("#op-fatt") && ($("#op-fatt").onclick = () => this.datiFatturazione(o.id, `Dati di fatturazione · ${o.nome} ${o.cognome}`));
    },
    struttura(s, ops, strutture) {
      const nuova = !s; s = s || {};
      U.dialog(nuova ? "Nuova struttura" : "Modifica struttura", `<div class="fields"><label class="f full">Nome<input id="st-nome" value="${esc(s.nome || "")}"></label>
        <label class="f">Responsabile<select id="st-resp"><option value="">—</option>${ops.filter(o => o.ruolo === "responsabile").map(o => `<option value="${o.id}" ${o.id === s.responsabile_id ? "selected" : ""}>${esc(nome(o))}</option>`).join("")}</select></label>
        <label class="f">Dentro la struttura<select id="st-parent"><option value="">—</option>${strutture.filter(x => x.id !== s.id).map(x => `<option value="${x.id}" ${x.id === s.parent_id ? "selected" : ""}>${esc(x.nome)}</option>`).join("")}</select></label></div>`,
        [{ label: "Annulla" }, { label: "Salva", primary: true, onClick: async () => {
          const v = { nome: $("#st-nome").value.trim(), responsabile_id: $("#st-resp").value || null, parent_id: $("#st-parent").value || null };
          if (!v.nome) { U.toast("Dai un nome alla struttura"); return false; }
          const r = nuova ? await db().from("strutture").insert(v) : await db().from("strutture").update(v).eq("id", s.id);
          if (r.error) { U.toast(r.error.message); return false; } this.disegnaRete();
        } }]);
    },
    azione(az, ids, ops) {
      if (!ids.length) { U.toast("Seleziona almeno un utente"); return; }
      const testo = { invita: "Inviare per email l'invito personale (link monouso a scadenza) a", link_invito: "Creare il link di invito personale (monouso, a scadenza) da consegnare tu a", sospendi: "Sospendere (l'accesso si blocca subito, anche nelle sessioni aperte)", riattiva: "Riattivare", disattiva: "Disattivare definitivamente l'accesso di" }[az];
      U.dialog("Conferma", `<p>${testo} <b>${ids.length}</b> ${ids.length === 1 ? "utente" : "utenti"}?</p><ul>${ids.map(id => `<li>${esc(nome(ops.find(o => o.id === id)))} · ${esc(ops.find(o => o.id === id)?.email)}</li>`).join("")}</ul>
        <label class="f">Motivazione<input id="az-mot" placeholder="facoltativa, resta nel registro"></label><div class="status" id="az-st"></div>`,
        [{ label: "Annulla" }, { label: "Conferma", primary: true, onClick: async () => {
          const st = $("#az-st"); st.innerHTML = '<span class="spinner"></span>Attendi…';
          try {
            const r = await Server.funzione("energy-admin", { azione: az, ids, motivo: $("#az-mot").value, redirect: location.origin + location.pathname });
            st.className = "status"; st.innerHTML = (r.esiti || []).map(e => `${e.ok ? "✓" : "✕"} ${esc(nome(ops.find(o => o.id === e.id)))}: ${esc(e.messaggio)}` +
              (e.link ? `<div class="link-invito"><input readonly value="${esc(e.link)}" aria-label="Link di invito"><button class="btn sm" type="button" data-copia>Copia</button></div>` : "")).join("<br>");
            if ((r.esiti || []).some(e => e.link)) st.insertAdjacentHTML("beforeend", `<p class="small muted">Manda ogni link solo alla persona interessata (email o messaggio privato): è personale, vale una volta sola e scade. Aprendolo sceglie la sua password.</p>`);
            st.querySelectorAll("[data-copia]").forEach(b => b.onclick = async () => {
              const inp = b.previousElementSibling; inp.select();
              try { await navigator.clipboard.writeText(inp.value); b.textContent = "Copiato"; } catch (e) { document.execCommand("copy"); b.textContent = "Copiato"; }
            });
            this.disegnaRete(); return false;
          } catch (e) { st.className = "status err"; st.textContent = e.message; return false; }
        } }]);
    },
    portafoglio(ops) {
      const sel = l => l.map(o => `<option value="${o.id}">${esc(nome(o))} · ${esc(STATI_ACC[o.stato])}</option>`).join("");
      U.dialog("Riassegna le pratiche di un collaboratore", `<p class="muted small">Sposta le pratiche aperte di chi esce dalla rete su un altro produttore. Ogni pratica conserva autore, data e motivazione.</p>
        <div class="fields"><label class="f">Da<select id="pf-da">${sel(ops.filter(o => ["agente", "responsabile"].includes(o.ruolo)))}</select></label>
        <label class="f">A<select id="pf-a">${sel(ops.filter(o => ["agente", "responsabile"].includes(o.ruolo) && o.stato === "attivo"))}</select></label>
        <label class="f full">Motivazione<input id="pf-mot" placeholder="obbligatoria, es. uscita dalla rete"></label>
        <label class="check full"><input type="checkbox" id="pf-tutte"> anche le pratiche chiuse</label></div>`,
        [{ label: "Annulla" }, { label: "Riassegna", primary: true, onClick: async () => {
          try { const n = await Server.rpc("riassegna_portafoglio", { da_operatore: $("#pf-da").value, a_operatore: $("#pf-a").value, motivo: $("#pf-mot").value, anche_chiuse: $("#pf-tutte").checked }); U.toast(n + " pratiche riassegnate"); }
          catch (e) { U.toast(e.message); return false; }
        } }]);
    },

    /* ------------------------------ Stato dell'aggiornamento del mercato ------------------------------ */
    async mercatoCard() {
      const v = $("#view-offerte"); if (!v) return;
      const box = document.createElement("div"); box.className = "card"; box.id = "mercato-stato"; v.prepend(box);
      let s; try { s = await Server.rpc("stato_mercato"); } catch (e) { box.innerHTML = `<div class="alert bad">${esc(e.message)}</div>`; return; }
      const t = s?.ultimo_tentativo, r = s?.ultimo_riuscito, cop = r?.copertura?.statistiche || {};
      const esito = { ok: "riuscito", parziale: "riuscito in parte", errore: "non riuscito: il catalogo precedente resta in uso", configurazione_mancante: "configurazione mancante", in_corso: "in corso" };
      box.innerHTML = `<div class="card-head"><div><h2>Aggiornamento automatico del mercato</h2><div class="muted small">Fonte: open data del Portale Offerte (ARERA / Acquirente Unico). Controllo ogni giorno, aggiornamento ogni 3 giorni, anche a browser chiuso. Orari di Roma.</div></div></div>
        <div class="kpis">
          <div class="kpi"><div class="l">Ultimo tentativo</div><div class="v" style="font-size:16px">${esc(t?.avviato || "—")}</div><div class="s">${esc(esito[t?.esito] || t?.esito || "")}</div></div>
          <div class="kpi good"><div class="l">Ultimo aggiornamento riuscito</div><div class="v" style="font-size:16px">${esc(r?.concluso || "—")}</div><div class="s">${r ? `${r.nuove} nuove · ${r.modificate} modificate · ${r.chiuse} chiuse` : ""}</div></div>
          <div class="kpi"><div class="l">Prossima esecuzione</div><div class="v" style="font-size:16px">${esc((s?.prossima_esecuzione || "—").split(" (")[0])}</div><div class="s">controllo giornaliero</div></div>
          <div class="kpi ${r?.in_revisione ? "bad" : ""}"><div class="l">Offerte da verificare</div><div class="v">${r?.in_revisione ?? 0}</div><div class="s">dati ambigui, non pubblicati</div></div></div>
        <p class="small muted">Copertura effettiva: luce ${cop.luce ? `${cop.luce.valide} offerte valide di ${cop.luce.lette} lette, ${cop.luce.fornitori} fornitori` : "—"} · gas ${cop.gas ? `${cop.gas.valide} di ${cop.gas.lette}, ${cop.gas.fornitori} fornitori` : "—"}.
          Non copre: ${esc((r?.copertura?.fonti_mancanti || []).join("; ") || "—")}. Nel comparatore entrano le 12 offerte più convenienti per segmento, fornitura e tipo di prezzo.</p>
        ${(s?.revisione || []).length ? `<details class="more"><summary>Offerte in revisione (${s.revisione.length})</summary><div class="table-wrap" style="max-height:300px;margin:8px"><table><tbody>${s.revisione.slice(0, 200).map(x => `<tr><td class="small">${esc(x.fornitore)}<div class="muted">${esc(x.offerta || "")}</div></td><td class="small">${esc(x.segmento || "")} ${esc(x.commodity || "")}</td><td class="small">${esc((x.problemi || []).join(" · "))}</td></tr>`).join("")}</tbody></table></div></details>` : ""}
        ${(t?.errori || []).length ? `<div class="alert warn">${t.errori.map(e => esc((e.fonte || "") + ": " + (e.errore || ""))).join("<br>")}</div>` : ""}`;
    }
  };

  function descriviEvento(e, nomeOp) {
    const L = SP().label;
    switch (e.tipo) {
      case "creazione": return "Pratica creata" + (e.testo ? " · " + e.testo : "");
      case "stato": return `Stato: ${L[e.da] || e.da || "—"} → ${L[e.a] || e.a}${e.motivazione ? " (" + e.motivazione + ")" : ""}`;
      case "riassegnazione": return `Riassegnata: ${nomeOp(e.da) || "produttore precedente"} → ${nomeOp(e.a) || "nuovo produttore"} · motivo: ${e.motivazione || "—"}`;
      case "assegnazione_ufficio": return `Back office: ${nomeOp(e.a) || "rimosso"}`;
      default: return e.testo || e.tipo;
    }
  }
  window.Rete = Rete;
})();
