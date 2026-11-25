/* Alca Energy · collegamento al server (Supabase): accesso personale, verifica in due passaggi, dati condivisi.
   Si attiva solo se js/config.js indica l'indirizzo del progetto e la chiave pubblica.
   Nessuna chiave segreta arriva al browser: i permessi sono applicati dal database (RLS) e dalle funzioni server. */
(function () {
  const cfg = window.ALCA_CONFIG || {};
  // "?locale" nell'indirizzo apre la versione sul PC senza server (dati solo in questo browser)
  const attivo = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase && /^https?:/.test(location.protocol) && !/[?&]locale\b/.test(location.search));
  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  let sb = null;

  // dati di lavoro del portale salvati nel browser (pratica aperta, pratiche solo locali, impostazioni): via all'uscita e al cambio di utente
  function puliziaLocale() {
    try { Object.keys(localStorage).filter(k => k.startsWith("cbp.")).forEach(k => localStorage.removeItem(k)); } catch (e) { }
  }
  const Server = {
    attivo, profilo: null,
    get sb() { return sb; },
    db() { return sb.schema("energy"); },
    async rpc(nome, args) {
      const { data, error } = await this.db().rpc(nome, args || {});
      if (error) throw new Error(traduci(error));
      return data;
    },
    async funzione(nome, body) {
      const { data, error } = await sb.functions.invoke(nome, { body });
      if (error) {
        let msg = error.message;
        try { const j = await error.context?.json?.(); msg = j?.error?.message || j?.error || j?.errore || msg; } catch (e) { }
        throw new Error(msg);
      }
      return data;
    },
    async token() { const { data } = await sb.auth.getSession(); return data.session?.access_token || null; },

    /* avvio: sessione esistente, link di invito/recupero, altrimenti schermata di accesso */
    async avvia() {
      if (!attivo) return null;
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: archivio } });
      const tipoLink = new URLSearchParams(location.hash.slice(1)).get("type") || new URLSearchParams(location.search).get("type");
      await new Promise(r => setTimeout(r, 50));
      let { data } = await sb.auth.getSession();
      if (data.session && (tipoLink === "invite" || tipoLink === "recovery")) {
        await schermata("password", tipoLink === "invite" ? "Benvenuto in Alca Energy: scegli la tua password personale." : "Imposta una nuova password.");
        history.replaceState(null, "", location.pathname);
      }
      for (;;) {
        ({ data } = await sb.auth.getSession());
        if (!data.session) { await schermata("login"); continue; }
        const p = await sb.schema("energy").rpc("registra_accesso");
        if (p.error || !p.data || p.data.errore) {
          await sb.auth.signOut();
          await schermata("login", p.data?.errore || traduci(p.error) || "Accesso non consentito.");
          continue;
        }
        this.profilo = p.data;
        // amministratori: secondo fattore obbligatorio, verificato da non più di 30 giorni (lo controlla anche il database)
        if (this.profilo.ruolo === "admin" && !this.profilo.admin_attivo) {
          const ok = await this.secondoFattore();
          if (!ok) continue;
          await sb.auth.refreshSession();
          this.profilo = await this.rpc("mio_profilo");
          if (!this.profilo.admin_attivo) { await sb.auth.signOut({ scope: "local" }); await schermata("login", "Verifica non riuscita: accedi di nuovo."); continue; }
        }
        break;
      }
      // il browser può essere condiviso: la pratica aperta, le pratiche salvate solo nel browser e le impostazioni restano
      // nel browser (localStorage) e non devono passare a un altro utente. Se cambia l'utente si cancellano prima di caricare l'app.
      try { if (localStorage.getItem("cbp.utente") !== this.profilo.id) { puliziaLocale(); localStorage.setItem("cbp.utente", this.profilo.id); } } catch (e) { }
      // sospensione o disattivazione durante l'uso: il database smette di rispondere, l'app torna all'accesso
      sb.auth.onAuthStateChange(ev => { if (ev === "SIGNED_OUT") { puliziaLocale(); location.reload(); } });
      setInterval(async () => {
        try {
          const p = await this.rpc("mio_profilo");
          if (p?.errore) await sb.auth.signOut();
          else if (p?.ruolo === "admin" && !p.admin_attivo) location.reload();   // codice scaduto (30 giorni): va ripetuto
        } catch (e) { }
      }, 120000);
      return this.profilo;
    },

    async secondoFattore() {
      const { data: f } = await sb.auth.mfa.listFactors();
      const totp = (f?.totp || []).find(x => x.status === "verified");
      if (totp) return schermata("mfa", "", totp.id);
      // una registrazione lasciata a metà (QR mostrato ma codice mai confermato) bloccherebbe la nuova: si elimina prima di ripartire
      for (const x of (f?.all || f?.totp || []).filter(x => x.status !== "verified")) await sb.auth.mfa.unenroll({ factorId: x.id });
      const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp", friendlyName: "Alca Energy " + new Date().toISOString().slice(0, 16).replace("T", " ") });
      if (error) { await schermata("login", traduci(error)); return false; }
      return schermata("mfa-nuovo", "", data.id, data.totp);
    },
    async esci() { puliziaLocale(); await sb.auth.signOut(); ricorda(false); location.reload(); },

    /* documenti dell'archivio: link temporanei (5 minuti), solo per chi può vedere la pratica */
    async linkDocumento(path) {
      const { data, error } = await sb.storage.from("energy-documenti").createSignedUrl(path, 300);
      if (error) throw new Error(traduci(error)); return data.signedUrl;
    },
    async caricaDocumento(praticaId, file, tipo) {
      const nome = file.name.replace(/[^\w.\-]+/g, "_").slice(-120);
      const path = `pratiche/${praticaId}/${Date.now().toString(36)}-${nome}`;
      const up = await sb.storage.from("energy-documenti").upload(path, file, { contentType: file.type || undefined, upsert: false });
      if (up.error) throw new Error(traduci(up.error));
      const { error } = await this.db().from("documenti").insert({ pratica_id: praticaId, storage_path: path, nome: file.name, mime: file.type, dimensione: file.size, tipo_doc: tipo || "bolletta", caricato_da: this.profilo.id });
      if (error) throw new Error(traduci(error));
      return path;
    }
  };

  /* "ricorda questo dispositivo per 30 giorni": senza la spunta l'accesso dura solo finché il browser resta aperto */
  // con la spunta la sessione sta nel dispositivo (localStorage) per 30 giorni; senza, solo nella scheda aperta (sessionStorage)
  const K_RIC = "ae.ricorda", GIORNI = 30;
  const prova = f => { try { return f(); } catch (e) { return null; } };
  const ricordato = () => Number(prova(() => localStorage.getItem(K_RIC)) || 0) > Date.now();
  const deposito = () => ricordato() ? localStorage : sessionStorage;
  const archivio = {
    getItem: k => prova(() => deposito().getItem(k)),
    setItem: (k, v) => prova(() => deposito().setItem(k, v)),
    removeItem: k => prova(() => { localStorage.removeItem(k); sessionStorage.removeItem(k); })
  };
  function ricorda(si) {
    prova(() => {
      const da = si ? sessionStorage : localStorage, a = si ? localStorage : sessionStorage;
      if (si) localStorage.setItem(K_RIC, String(Date.now() + GIORNI * 864e5)); else localStorage.removeItem(K_RIC);
      for (const k of Object.keys(da)) if (k.startsWith("sb-")) { a.setItem(k, da.getItem(k)); da.removeItem(k); }
    });
  }
  /* suggeritore di password: 16 caratteri dal generatore crittografico del browser, con maiuscole, minuscole, cifre e simboli
     (esclusi i caratteri che si confondono: 0/O, 1/l/I) */
  function generaPassword(n = 16) {
    const S = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%&*?-_+="], tutti = S.join("");
    const r = m => { const x = new Uint32Array(1); crypto.getRandomValues(x); return x[0] % m; };
    const p = S.map(s => s[r(s.length)]);
    while (p.length < n) p.push(tutti[r(tutti.length)]);
    for (let i = p.length - 1; i > 0; i--) { const j = r(i + 1); [p[i], p[j]] = [p[j], p[i]]; }
    return p.join("");
  }
  function suggeritore(campi) {
    if (!campi[0]) return;
    const box = document.createElement("div"); box.className = "auth-sugg";
    box.innerHTML = `<button type="button" class="btn sm primary">Suggerisci una password sicura</button><button type="button" class="btn sm">Mostra</button><span class="small muted" hidden></span>`;
    campi[0].closest("label").after(box);
    const [gen, vedi] = box.querySelectorAll("button"), ok = box.querySelector("span");
    const mostra = si => { campi.forEach(c => c.type = si ? "text" : "password"); vedi.textContent = si ? "Nascondi" : "Mostra"; };
    vedi.onclick = () => mostra(campi[0].type === "password");
    gen.onclick = async () => {
      const p = generaPassword(); campi.forEach(c => c.value = p); mostra(true);
      let copiata = false; try { await navigator.clipboard.writeText(p); copiata = true; } catch (e) { }
      ok.textContent = copiata ? "Copiata negli appunti: salvala nel tuo gestore di password." : "Annotala o salvala nel tuo gestore di password."; ok.hidden = false;
    };
  }
  const spuntaRicorda = testo => `<label class="check"><input type="checkbox" id="au-ricorda" ${ricordato() ? "checked" : ""}> ${testo}</label>`;

  function traduci(e) {
    if (!e) return "";
    const m = e.message || String(e);
    if (/Invalid login credentials/i.test(m)) return "Email o password non corretti.";
    if (/Email not confirmed/i.test(m)) return "Email non ancora verificata: apri il link che ti abbiamo inviato.";
    if (/row-level security|permission denied/i.test(m)) return "Operazione non consentita per il tuo ruolo.";
    if (/rate limit/i.test(m)) return "Troppi tentativi: riprova tra qualche minuto.";
    if (/Invalid TOTP|invalid.*code/i.test(m)) return "Codice non valido: controlla l'app di autenticazione e riprova.";
    return m;
  }

  /* schermate di accesso (sopra l'app) */
  function schermata(tipo, messaggio, factorId, totp) {
    return new Promise(resolve => {
      let el = document.getElementById("auth-screen");
      if (!el) { el = document.createElement("div"); el.id = "auth-screen"; document.body.appendChild(el); }
      const testa = `<div class="auth-brand"><img class="auth-logo" src="assets/logo-alca.png" alt="Alca Broker" width="88" height="52"><div><b>Alca Energy</b><small>Preventivi luce e gas · area riservata</small></div></div>`;
      const corpo = {
        login: `<h1>Accedi</h1><p class="muted">Usa l'email e la password personali ricevute con l'invito.</p>
          <form id="au-f"><label class="f">Email<input id="au-email" type="email" autocomplete="username" required></label>
          <label class="f">Password<input id="au-pw" type="password" autocomplete="current-password" required></label>
          ${spuntaRicorda("Resta collegato su questo dispositivo per 30 giorni")}
          <button class="btn primary" type="submit">Accedi</button></form>
          <button class="btn sm" id="au-reset" type="button">Password dimenticata?</button>`,
        password: `<h1>Imposta la password</h1><p class="muted">${esc(messaggio)}</p>
          <form id="au-f"><label class="f">Nuova password (almeno 10 caratteri)<input id="au-pw" type="password" autocomplete="new-password" minlength="10" required></label>
          <label class="f">Ripeti la password<input id="au-pw2" type="password" autocomplete="new-password" minlength="10" required></label>
          <button class="btn primary" type="submit">Salva e continua</button></form>`,
        mfa: `<h1>Verifica in due passaggi</h1><p class="muted">Inserisci il codice a 6 cifre dell'app di autenticazione.</p>
          <form id="au-f"><label class="f">Codice<input id="au-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
          ${spuntaRicorda("Non chiedere il codice su questo dispositivo per 30 giorni")}
          <button class="btn primary" type="submit">Verifica</button></form><button class="btn sm" id="au-out" type="button">Esci</button>`,
        "mfa-nuovo": `<h1>Attiva la verifica in due passaggi</h1><p class="muted">Obbligatoria per gli amministratori. Inquadra il codice con un'app di autenticazione (Google Authenticator, Microsoft Authenticator, 1Password…) e inserisci il codice a 6 cifre.</p>
          <div class="auth-qr">${totp?.qr_code ? `<img src="${esc(totp.qr_code)}" alt="Codice QR per l'app di autenticazione" width="180" height="180">` : ""}</div>
          <p class="small muted">Se non puoi inquadrare, inserisci questa chiave: <code>${esc(totp?.secret || "")}</code></p>
          <form id="au-f"><label class="f">Codice<input id="au-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required></label>
          ${spuntaRicorda("Non chiedere il codice su questo dispositivo per 30 giorni")}
          <button class="btn primary" type="submit">Attiva</button></form><button class="btn sm" id="au-out" type="button">Esci</button>`
      }[tipo];
      el.innerHTML = `<div class="auth-card">${testa}${corpo}<div class="status err" id="au-st">${tipo === "login" ? esc(messaggio || "") : ""}</div>
        <p class="small muted auth-note">I dati delle bollette sono trattati da Alca Energy. Quando chiedi l'analisi automatica, la bolletta è inviata al servizio AI di Anthropic tramite il server Alca per estrarre i dati.</p></div>`;
      el.hidden = false; document.body.classList.add("auth-on");
      if (tipo === "password") suggeritore([el.querySelector("#au-pw"), el.querySelector("#au-pw2")]);
      const st = el.querySelector("#au-st"), fine = v => { el.hidden = true; document.body.classList.remove("auth-on"); resolve(v); };
      el.querySelector("#au-out")?.addEventListener("click", async () => { await sb.auth.signOut(); fine(false); });
      el.querySelector("#au-reset")?.addEventListener("click", async () => {
        const email = el.querySelector("#au-email").value.trim();
        if (!email) { st.textContent = "Scrivi prima la tua email."; return; }
        const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: (cfg.appUrl || location.origin).replace(/\/$/, "") + "/portale" });
        st.className = error ? "status err" : "status ok";
        st.textContent = error ? traduci(error) : "Se l'email è registrata riceverai un link per reimpostare la password.";
      });
      el.querySelector("#au-f").addEventListener("submit", async ev => {
        ev.preventDefault(); st.className = "status"; st.textContent = "Attendi…";
        try {
          if (tipo === "login") {
            ricorda(el.querySelector("#au-ricorda").checked);   // prima dell'accesso: la sessione nasce già nel posto giusto
            const { error } = await sb.auth.signInWithPassword({ email: el.querySelector("#au-email").value.trim(), password: el.querySelector("#au-pw").value });
            if (error) throw error; fine(true);
          } else if (tipo === "password") {
            const a = el.querySelector("#au-pw").value, b = el.querySelector("#au-pw2").value;
            if (a !== b) throw new Error("Le due password non coincidono.");
            const { error } = await sb.auth.updateUser({ password: a }); if (error) throw error; fine(true);
          } else {
            const code = el.querySelector("#au-code").value.trim();
            const ch = await sb.auth.mfa.challenge({ factorId }); if (ch.error) throw ch.error;
            const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code }); if (v.error) throw v.error;
            ricorda(el.querySelector("#au-ricorda").checked);
            fine(true);
          }
        } catch (e) { st.className = "status err"; st.textContent = traduci(e); }
      });
      el.querySelector("input")?.focus();
    });
  }

  window.Server = Server;
})();
