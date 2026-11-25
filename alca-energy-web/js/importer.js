/* Import dei calcolatori Excel aggiornati (Calcolatore_Luce_PIVA.xlsx / Calcolatore_Gas_PIVA.xlsx).
   Legge offerte (foglio "Simulazione"), storico PUN/PSV e componenti Autorità. */
(function () {
  const XLSX_URL = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
  const E = () => window.Engine;
  let loading = null;

  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (loading) return loading;
    loading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = XLSX_URL;
      s.onload = () => res(window.XLSX);
      s.onerror = () => { loading = null; rej(new Error("Impossibile caricare la libreria Excel (serve la connessione internet).")); };
      document.head.appendChild(s);
    });
    return loading;
  }

  const norm = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
  const cell = (ws, a) => ws && ws[a] ? ws[a].v : null;
  const n = (ws, a) => E().num(cell(ws, a));

  function sheetByName(wb, name) {
    const k = wb.SheetNames.find(s => norm(s) === norm(name));
    return k ? wb.Sheets[k] : null;
  }

  function rows(ws) { return window.XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null }); }

  /* Trova la riga d'intestazione (quella che contiene "Azienda" e "Offerta") e mappa i nomi colonna */
  function headerMap(data) {
    for (let i = 0; i < Math.min(data.length, 30); i++) {
      const r = data[i].map(norm);
      if (r.includes("azienda") && r.includes("offerta")) {
        const find = (...keys) => r.findIndex(h => keys.every(k => h.includes(k)));
        return { row: i, find };
      }
    }
    return null;
  }

  function str(v) { return v === null || v === undefined ? "" : String(v).trim(); }

  function offerteLuce(ws) {
    const data = rows(ws), h = headerMap(data);
    if (!h) throw new Error("Intestazioni del foglio Simulazione non trovate");
    const c = {
      az: h.find("azienda"), of: h.find("offerta"), ini: h.find("data inizio"), fine: h.find("data fine"),
      tip: h.find("tipologia"), fas: h.find("fascia"), p1: h.find("prezzo", "f1"), p2: h.find("prezzo", "f2"),
      spread: h.find("spread"), partner: h.find("partner"), ccv: h.find("ccv"),
      op: h.find("operazioni"), pag: h.find("pagamento"), can: h.find("vendibilit"), restr: h.find("tipologia offerta")
    };
    if (c.tip === c.restr) c.tip = data[h.row].map(norm).findIndex(x => x === "tipologia");
    const out = [];
    for (let i = h.row + 1; i < data.length; i++) {
      const r = data[i];
      const az = str(r[c.az]), nome = str(r[c.of]);
      if (!az || !nome) continue;
      const tip = /var/i.test(str(r[c.tip])) ? "Variabile" : "Fissa";
      const fas = /bio/i.test(str(r[c.fas])) ? "Bioraria" : /tri|multi/i.test(str(r[c.fas])) ? "Trioraria" : "Monoraria";
      out.push({
        id: Store.uid("L"), azienda: az, nome, inizio: E().excelToISO(r[c.ini]), fine: E().excelToISO(r[c.fine]),
        tipologia: tip, fascia: fas,
        p1: tip === "Fissa" ? E().num(r[c.p1]) : null,
        p2: tip === "Fissa" && fas !== "Monoraria" ? E().num(r[c.p2]) : null, p3: null,
        spread: tip === "Variabile" ? (E().num(r[c.spread]) ?? 0) : null,
        extra: c.partner >= 0 ? (E().num(r[c.partner]) ?? 0) : 0,
        ccv: E().num(r[c.ccv]) ?? 0,
        operazioni: str(r[c.op]), pagamento: str(r[c.pag]), canali: str(r[c.can]), restrizioni: c.restr >= 0 ? str(r[c.restr]) : "",
        contratto: null, chiusa: false, disattivata: false, note: ""
      });
    }
    return out;
  }

  function offerteGas(ws) {
    const data = rows(ws), h = headerMap(data);
    if (!h) throw new Error("Intestazioni del foglio Simulazione non trovate");
    const c = {
      az: h.find("azienda"), of: h.find("offerta"), ini: h.find("data inizio"), fine: h.find("data fine"),
      tip: h.find("tipologia"), p: h.find("prezzo"), spread: h.find("spread"), extra: h.find("costi/sconti"),
      ccv: h.find("ccv"), op: h.find("operazioni"), pag: h.find("pagamento"), can: h.find("vendibilit"), restr: h.find("tipologia offerta")
    };
    if (c.tip === c.restr) c.tip = data[h.row].map(norm).findIndex(x => x === "tipologia");
    const out = [];
    for (let i = h.row + 1; i < data.length; i++) {
      const r = data[i];
      const az = str(r[c.az]), nome = str(r[c.of]);
      if (!az || !nome) continue;
      const tip = /var/i.test(str(r[c.tip])) ? "Variabile" : "Fissa";
      out.push({
        id: Store.uid("G"), azienda: az, nome, inizio: E().excelToISO(r[c.ini]), fine: E().excelToISO(r[c.fine]),
        tipologia: tip, p1: tip === "Fissa" ? E().num(r[c.p]) : null,
        spread: tip === "Variabile" ? (E().num(r[c.spread]) ?? 0) : null,
        extra: c.extra >= 0 ? (E().num(r[c.extra]) ?? 0) : 0, ccv: E().num(r[c.ccv]) ?? 0,
        operazioni: str(r[c.op]), pagamento: str(r[c.pag]), canali: str(r[c.can]), restrizioni: c.restr >= 0 ? str(r[c.restr]) : "",
        contratto: null, chiusa: false, disattivata: false, note: ""
      });
    }
    return out;
  }

  function serieMensile(ws, dateCol, cols, startRow = 3) {
    const out = [];
    for (let r = startRow; r < 600; r++) {
      const d = E().excelToISO(cell(ws, dateCol + r));
      if (!d) { if (r > startRow + 5 && !cell(ws, "B" + r)) break; continue; }
      const [y, m] = d.split("-").map(Number);
      const rec = { y, m };
      let ok = false;
      for (const [k, col] of Object.entries(cols)) { rec[k] = n(ws, col + r); if (rec[k] != null) ok = true; }
      if (ok) out.push(rec);
    }
    out.sort((a, b) => a.y * 12 + a.m - (b.y * 12 + b.m));
    return out;
  }

  const keep = (v, old) => (v === null || v === undefined || Number.isNaN(v)) ? old : v;

  function componentiLuce(ws, old) {
    if (!ws) return old;
    const L = JSON.parse(JSON.stringify(old));
    const rowsIdx = [42, 43, 44, 45, 46, 47];
    rowsIdx.forEach((r, i) => {
      const b = L.bands[i]; if (!b) return;
      b.disPot = keep(n(ws, "D" + r), b.disPot); b.disFix = keep(n(ws, "E" + r), b.disFix); b.disVar = keep(n(ws, "F" + r), b.disVar);
      b.asosPot = keep(n(ws, "G" + r), b.asosPot); b.asosFix = keep(n(ws, "H" + r), b.asosFix); b.asosVar = keep(n(ws, "I" + r), b.asosVar);
      b.arimPot = keep(n(ws, "J" + r), b.arimPot); b.arimFix = keep(n(ws, "K" + r), b.arimFix); b.arimVar = keep(n(ws, "L" + r), b.arimVar);
      b.uc6Fix = keep(n(ws, "M" + r), b.uc6Fix); b.uc6Var = keep(n(ws, "N" + r), b.uc6Var); b.uc3 = keep(n(ws, "O" + r), b.uc3); b.mis = keep(n(ws, "P" + r), b.mis);
    });
    L.tras = keep(n(ws, "D6"), L.tras);
    L.sbilanciamento = keep(n(ws, "C52"), L.sbilanciamento);
    L.dispacciamento = keep(n(ws, "C53"), L.dispacciamento);
    L.capacita = keep(n(ws, "C54"), L.capacita);
    L.accise.aliq1 = keep(n(ws, "D23"), L.accise.aliq1); L.accise.aliq2 = keep(n(ws, "D24"), L.accise.aliq2); L.accise.fissoMese = keep(n(ws, "E25"), L.accise.fissoMese);
    L.iva = keep(n(ws, "C32"), L.iva);
    return L;
  }

  function componentiGas(ws, old) {
    if (!ws) return old;
    const G = JSON.parse(JSON.stringify(old));
    G.qtGJ = keep(n(ws, "C58"), G.qtGJ); G.pcs = keep(n(ws, "D58"), G.pcs);
    G.gs = [keep(n(ws, "C53"), G.gs[0]), keep(n(ws, "C54"), G.gs[1])];
    G.rs = [keep(n(ws, "D53"), G.rs[0]), keep(n(ws, "D54"), G.rs[1])];
    G.ug1 = [keep(n(ws, "E53"), G.ug1[0]), keep(n(ws, "E54"), G.ug1[1])];
    G.re = [keep(n(ws, "F53"), G.re[0]), keep(n(ws, "F54"), G.re[1])];
    const ug3 = ["C63", "D63", "E63"].map(a => n(ws, a));
    if (ug3.every(v => v != null)) G.ug3 = ug3.reduce((a, b) => a + b, 0);
    G.tau1.cot = keep(n(ws, "C69"), G.tau1.cot);
    const cls = ["G4 - G6", "G10 - G40", "G40"];
    ["D", "E", "F"].forEach((col, i) => G.tau1.dis[cls[i]] = keep(n(ws, col + "69"), G.tau1.dis[cls[i]]));
    ["G", "H", "I"].forEach((col, i) => G.tau1.mis[cls[i]] = keep(n(ws, col + "69"), G.tau1.mis[cls[i]]));
    G.st = keep(n(ws, "M69"), G.st); G.vr = keep(n(ws, "N69"), G.vr);
    const t3 = [];
    for (let r = 69; r <= 76; r++) t3.push({ a: n(ws, "K" + r), v: keep(n(ws, "L" + r), 0) });
    if (t3.length) { t3[t3.length - 1].a = null; if (t3.slice(0, -1).every(s => s.a != null)) G.tau3 = t3; }
    const u2 = [];
    for (let r = 83; r <= 89; r++) u2.push({ a: n(ws, "D" + r), v: keep(n(ws, "E" + r), 0) });
    u2[u2.length - 1].a = null; if (u2.slice(0, -1).every(s => s.a != null)) G.ug2 = u2;
    G.ug2Fisso = keep(n(ws, "F83"), G.ug2Fisso);
    G.accise.aliq1 = keep(n(ws, "D23"), G.accise.aliq1); G.accise.aliq2 = keep(n(ws, "D24"), G.accise.aliq2);
    G.iva = keep(n(ws, "C31"), G.iva);
    G.qvd = keep(n(ws, "C38"), G.qvd); G.ccr = keep(n(ws, "C39"), G.ccr); G.qoa = keep(n(ws, "C40"), G.qoa);
    return G;
  }

  /* Analizza il file e restituisce un "piano" di import (applicato solo dopo conferma) */
  async function analizza(file) {
    const XLSX = await loadXLSX();
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sim = sheetByName(wb, "Simulazione");
    if (!sim) throw new Error(`"${file.name}": foglio "Simulazione" non trovato. È un calcolatore P.IVA?`);
    const comp = sheetByName(wb, "Componenti Autorità");
    const D = Store.data;
    if (sheetByName(wb, "Valore PUN")) {
      const pun = serieMensile(sheetByName(wb, "Valore PUN"), "G", { f0: "B", f1: "C", f23: "D" });
      const offerte = offerteLuce(sim);
      const fc = { punF0: n(sim, "P3"), punF1: n(sim, "Q3"), punF23: n(sim, "R3") };
      return { tipo: "luce", file: file.name, offerte, pun, forecast: fc, componenti: componentiLuce(comp, D.luce || window.SEED.luce) };
    }
    if (sheetByName(wb, "Valore PSV")) {
      const psv = serieMensile(sheetByName(wb, "Valore PSV"), "E", { psv: "B" });
      const offerte = offerteGas(sim);
      return { tipo: "gas", file: file.name, offerte, psv, forecast: { psv: n(sim, "O3") }, componenti: componentiGas(comp, D.gas || window.SEED.gas) };
    }
    throw new Error(`"${file.name}": non riconosco se è il calcolatore Luce o Gas.`);
  }

  function applica(plan) {
    const D = Store.data;
    if (plan.tipo === "luce") {
      D.offerteLuce = plan.offerte;
      if (plan.pun.length) D.pun = plan.pun;
      D.luce = plan.componenti;
      D.forecast = Object.assign({}, D.forecast);
      for (const k of ["punF0", "punF1", "punF23"]) if (plan.forecast[k] != null) D.forecast[k] = plan.forecast[k];
    } else {
      D.offerteGas = plan.offerte;
      if (plan.psv.length) D.psv = plan.psv;
      D.gas = plan.componenti;
      D.forecast = Object.assign({}, D.forecast);
      if (plan.forecast.psv != null) D.forecast.psv = plan.forecast.psv;
    }
    D.aggiornato = E().todayISO();
    return Store.save();
  }

  window.Importer = { analizza, applica, loadXLSX };
})();
