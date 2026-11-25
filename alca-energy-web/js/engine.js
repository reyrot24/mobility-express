/* Motore di calcolo: replica la logica dei calcolatori Excel P.IVA (Luce e Gas).
   Risparmio periodo = (spesa materia in bolletta − quota energia/gas dell'offerta nel periodo) × (1 + IVA)
   che è equivalente alla formula Excel: Totale − ((Totale/(1+IVA) − Materia) + QuotaOfferta) × (1+IVA). */
(function () {
  const DAY = 86400000;

  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number") return isFinite(v) ? v : null;
    let t = String(v).trim().replace(/[€\s]/g, "");
    if (!t) return null;
    if (t.includes(",") && t.includes(".")) t = t.replace(/\./g, "").replace(",", ".");
    else t = t.replace(",", ".");
    const n = parseFloat(t);
    return isFinite(n) ? n : null;
  }

  function excelToISO(s) {
    if (s === null || s === undefined || s === "") return null;
    if (typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    if (s instanceof Date) return s.toISOString().slice(0, 10);
    const n = num(s);
    if (n === null) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * DAY).toISOString().slice(0, 10);
  }

  function parts(iso) { const [y, m, d] = iso.split("-").map(Number); return { y, m, d }; }

  /* = DATEDIF(da; a; "M") + 1, come nel foglio Analisi */
  function mesiPeriodo(da, a) {
    if (!da || !a) return null;
    const x = parts(da), y = parts(a);
    let m = (y.y - x.y) * 12 + (y.m - x.m);
    if (y.d < x.d) m--;
    if (m < 0) return null;
    return m + 1;
  }

  function todayISO() { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
  function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / DAY); }

  /* Media dell'indice sui mesi che si sovrappongono al periodo di fatturazione.
     series: [{y,m,...}], key: campo; ritorna {value, months, source} */
  function mediaIndice(series, key, da, a, modo, manuale, forecast) {
    if (modo === "manuale" && manuale != null) return { value: manuale, months: [], source: "manuale" };
    let sel = [];
    if (modo === "ultimo") {
      // ultimo mese pubblicato (come il portale Facile): l'indice più vicino a quello che il cliente pagherà
      const ult = series.filter(r => r[key] != null).slice(-1);
      sel = ult;
    } else if (modo === "ultimi12") {
      sel = series.slice(-12);
    } else if (da && a) {
      const s = parts(da), e = parts(a);
      const k0 = s.y * 12 + s.m, k1 = e.y * 12 + e.m;
      sel = series.filter(r => { const k = r.y * 12 + r.m; return k >= k0 && k <= k1; });
    }
    sel = sel.filter(r => r[key] != null);
    if (!sel.length) return { value: forecast, months: [], source: "forecast" };
    const v = sel.reduce((t, r) => t + r[key], 0) / sel.length;
    return { value: v, months: sel.map(r => `${String(r.m).padStart(2, "0")}/${r.y}`), source: "storico" };
  }

  /* quota fissa: di listino, oppure al netto di sconti/bonus se richiesto e indicata nell'offerta */
  const ccvDi = (o, ctx) => ctx.usaSconti && o.ccvScontata != null ? o.ccvScontata : (o.ccv || 0);

  /* ----------------------------- LUCE ----------------------------- */
  function bandaPotenza(cfg, kw) {
    return cfg.bands.find(b => b.maxKw === null || kw <= b.maxKw) || cfg.bands[cfg.bands.length - 1];
  }

  function costiReteLuce(cfg, kwh, kw) {
    const b = bandaPotenza(cfg, kw);
    const trasporto = b.disPot * kw + b.mis + b.disFix + b.uc6Fix + (cfg.tras + b.disVar + b.uc3 + b.uc6Var) * kwh;
    const oneri = (b.asosPot + b.arimPot) * kw + b.asosFix + b.arimFix + (b.asosVar + b.arimVar) * kwh;
    const a = cfg.accise, t1 = a.soglia1Mese * 12, t2 = a.soglia2Mese * 12;
    let accise;
    if (kwh < t1) accise = kwh * a.aliq1;
    else if (kwh < t2) accise = t1 * a.aliq1 + (kwh - t1) * a.aliq2;
    else accise = t1 * a.aliq1 + a.fissoMese * 12;
    return { trasporto, oneri, accise, banda: b.name };
  }

  /* clienti domestici (tariffa TD): niente fasce di potenza, accise con esenzione per la residenza */
  function costiReteLuceDom(cfg, kwh, kw, residente) {
    const t = cfg.trasporto, o = cfg.oneri, a = cfg.accise;
    const trasporto = t.fisso + t.potenza * kw + t.energia * kwh;
    const oneri = o.energia * kwh + (residente ? 0 : o.fissoNonResidenti);
    const mese = kwh / 12;
    let tassabileMese = mese;
    if (residente && kw <= a.maxKwEsenzione) {
      if (mese <= a.esenzioneMese) tassabileMese = 0;
      else if (mese <= a.recuperoMese) tassabileMese = mese - a.esenzioneMese;
    }
    const accise = tassabileMese * 12 * a.aliq;
    return { trasporto, oneri, accise, banda: residente ? "Domestico residente" : "Domestico non residente" };
  }

  /* ctx: { kwhAnnui, kw, quote:{f1,f2,f3}, idx:{f0,f1,f23}, cfg, mesi, materia, totale } */
  function calcolaLuce(o, ctx) {
    const cfg = ctx.cfg;
    const add = cfg.dispacciamento + cfg.capacita + (o.extra || 0);
    const V = o.tipologia === "Variabile";
    const kwh = ctx.kwhAnnui;
    let energia, prezzi;
    if (o.fascia === "Monoraria") {
      const p = V ? ctx.idx.f0 + (o.spread || 0) : o.p1;
      energia = kwh * (p + add);
      prezzi = { F0: p };
    } else if (o.fascia === "Trioraria") {
      const p1 = V ? ctx.idx.f1 + (o.spread || 0) : o.p1;
      const p2 = V ? ctx.idx.f23 + (o.spread || 0) : (o.p2 ?? o.p1);
      const p3 = V ? ctx.idx.f23 + (o.spread || 0) : (o.p3 ?? o.p2 ?? o.p1);
      energia = kwh * (ctx.quote.f1 * (p1 + add) + ctx.quote.f2 * (p2 + add) + ctx.quote.f3 * (p3 + add));
      prezzi = { F1: p1, F2: p2, F3: p3 };
    } else { // Bioraria
      const p1 = V ? ctx.idx.f1 + (o.spread || 0) : o.p1;
      const p23 = V ? ctx.idx.f23 + (o.spread || 0) : (o.p2 ?? o.p1);
      const s1 = ctx.quote.f1;
      energia = kwh * s1 * (p1 + add) + kwh * (1 - s1) * (p23 + add);
      prezzi = { F1: p1, F23: p23 };
    }
    const quota = energia + ccvDi(o, ctx);
    const rete = cfg.domestico ? costiReteLuceDom(cfg, kwh, ctx.kw, ctx.residente !== false) : costiReteLuce(cfg, kwh, ctx.kw);
    const imponibile = quota + rete.trasporto + rete.oneri + rete.accise;
    const iva = imponibile * cfg.iva;
    const totaleAnnuo = imponibile + iva;
    // quota "di listino" (prezzo × consumo + quota fissa) senza dispacciamento, capacità e costi aggiuntivi: base del calcolo come Facile
    const quotaListino = quota - kwh * add;
    return chiudi(o, ctx, { energia, quota, quotaListino, ...rete, iva, totaleAnnuo, prezzi, ivaAliq: cfg.iva });
  }

  /* ------------------------------ GAS ------------------------------ */
  function progressivo(scaglioni, q) {
    let tot = 0, prev = 0;
    for (const s of scaglioni) {
      const lim = s.a === null ? Infinity : s.a;
      if (q > prev) tot += (Math.min(q, lim) - prev) * s.v;
      prev = lim;
      if (q <= lim) break;
    }
    return tot;
  }

  function costiReteGas(cfg, smc, classe) {
    const hi = smc > 200000 ? 1 : 0;
    const tau1 = cfg.tau1.cot + (cfg.tau1.dis[classe] ?? 0) + (cfg.tau1.mis[classe] ?? 0);
    const tau3 = progressivo(cfg.tau3, smc);
    const qt = cfg.qtGJ * cfg.pcs;
    const trasporto = tau1 + cfg.st + cfg.vr + tau3 + (qt + cfg.rs[hi] + cfg.ug1[hi]) * smc;
    const ug2 = progressivo(cfg.ug2, smc);
    const oneri = cfg.ug2Fisso + ug2 + (cfg.re[hi] + cfg.ug3 + cfg.gs[hi]) * smc;
    const accise = cfg.acciseScaglioni
      ? progressivo(cfg.acciseScaglioni, smc) + (cfg.addizionale || 0) * smc
      : smc < cfg.accise.soglia ? cfg.accise.aliq1 * smc : cfg.accise.aliq2 * smc;
    return { trasporto, oneri, accise, banda: classe };
  }

  /* ctx: { smcAnnui, classe, idx:{psv}, cfg, mesi, materia, totale } */
  function calcolaGas(o, ctx) {
    const cfg = ctx.cfg;
    const V = o.tipologia === "Variabile";
    const p = (V ? ctx.idx.psv + (o.spread || 0) : o.p1) + (o.extra || 0);
    const energia = ctx.smcAnnui * p;
    const quota = energia + ccvDi(o, ctx);
    const rete = costiReteGas(cfg, ctx.smcAnnui, ctx.classe);
    const imponibile = quota + rete.trasporto + rete.oneri + rete.accise;
    // domestici: IVA ridotta sui primi 480 Smc/anno, piena sul resto
    let aliq = cfg.iva;
    if (cfg.ivaRidotta && ctx.smcAnnui > 0) { const q = Math.min(ctx.smcAnnui, cfg.ivaRidotta.soglia) / ctx.smcAnnui; aliq = q * cfg.ivaRidotta.aliq + (1 - q) * cfg.iva; }
    const iva = imponibile * aliq;
    return chiudi(o, ctx, { energia, quota, quotaListino: quota - ctx.smcAnnui * (o.extra || 0), ...rete, iva, totaleAnnuo: imponibile + iva, prezzi: { Smc: p }, ivaAliq: aliq });
  }

  /* Confronto omogeneo: stessi consumi, stesso periodo, stessa IVA.
     - nel periodo della bolletta la quota energia dell'offerta usa il consumo REALE del periodo (non 1/12 dell'anno per mese);
     - l'anno usa il consumo annuo (dalla bolletta o stimato): spesa materia attuale annua = materia del periodo × consumo annuo / consumo del periodo.
     Per la luce con stima lineare il risultato coincide con il calcolatore Excel; per il gas evita di moltiplicare l'inverno per 12. */
  /* Spesa materia attuale su un anno.
     La spesa materia del periodo contiene una parte fissa (commercializzazione/PCV, €/mese) e una variabile (€/kWh o €/Smc):
     la parte fissa va moltiplicata per i mesi (12/m), solo quella variabile per il rapporto consumo annuo / consumo del periodo.
     Se la bolletta non separa la quota fissa, si stima (CCV_RIFERIMENTO); con un periodo "normale" (consumo annuo ≈ consumo del periodo × 12/mesi)
     il risultato coincide con la proporzione semplice. Se il prezzo variabile risultante è troppo alto per essere solo energia
     (periodo con pochissimi consumi) si limita a un valore plausibile rispetto all'indice: meglio una stima prudente che un risparmio gonfiato. */
  const CCV_RIFERIMENTO = 96; // €/anno, quota fissa tipica di vendita usata solo quando la bolletta non la riporta
  function materiaAnnuaAttuale(ctx, m, scalaAnno) {
    const mat = ctx.materia, cA = ctx.consumoAnnuo, cP = ctx.consumoPeriodo;
    if (!(cA && cP && m)) return { valore: mat * scalaAnno, metodo: "proporzionale" };
    const luce = ctx.kwhAnnui != null;
    const indice = luce ? ctx.idx?.f0 : ctx.idx?.psv;
    // prezzo massimo plausibile della sola energia (incl. spread, dispacciamento/capacità) rispetto all'indice del periodo
    const cap = luce ? (indice > 0 ? indice : 0.15) * 1.8 + 0.06 : (indice > 0 ? indice : 0.45) * 1.8 + 0.30;
    let fisso = ctx.materiaFissa != null && ctx.materiaFissa >= 0 && ctx.materiaFissa < mat ? ctx.materiaFissa : null, fonte = "bolletta";
    if (fisso == null) { fisso = Math.min(mat * 0.8, (ctx.ccvRiferimento ?? CCV_RIFERIMENTO) / 12 * m); fonte = "stimata"; }
    let variabile = (mat - fisso) / cP, limitato = false;
    if (variabile > cap) { variabile = cap; limitato = true; }
    return { valore: fisso * 12 / m + variabile * cA, metodo: "fisso+variabile", fissoPeriodo: fisso, fonteFisso: fonte, prezzoVariabile: variabile, limitato,
      nota: `quota fissa ${fonte === "stimata" ? "stimata" : "dalla bolletta"} ${fisso.toFixed(2)} € nel periodo, prezzo energia attuale ${limitato ? "limitato a " : ""}${variabile.toFixed(4)} €/${luce ? "kWh" : "Smc"}${limitato ? " (consumo del periodo troppo basso per ricavarlo)" : ""}` };
  }

  function chiudi(o, ctx, r) {
    const m = ctx.mesi, cA = ctx.consumoAnnuo, cP = ctx.consumoPeriodo;
    const quotaPeriodoEnergia = cA && cP ? cP / cA : m / 12;   // parte del consumo annuo che cade nel periodo
    const scalaAnno = cA && cP ? cA / cP : 12 / m;              // dal periodo all'anno
    r.offerta = o;
    r.totaleMensile = r.totaleAnnuo / 12;
    r.ccv = ccvDi(o, ctx); r.ccvPeriodo = (r.ccv / 12) * m;
    r.quotaPeriodo = (r.quota - r.ccv) * quotaPeriodoEnergia + r.ccvPeriodo;
    r.totalePeriodo = (r.totaleAnnuo - r.ccv * (1 + r.ivaAliq)) * quotaPeriodoEnergia + r.ccvPeriodo * (1 + r.ivaAliq);
    if (ctx.materia != null) {
      const ma = materiaAnnuaAttuale(ctx, m, scalaAnno);
      r.materiaAttualeAnnua = ma.valore; r.materiaAnnuaInfo = ma;
      if (ctx.metodoFacile && r.quotaListino != null) {
        // stesso metodo del portale Facile: spesa materia della bolletta − (prezzo × consumo + quota fissa) × (1 + IVA),
        // senza dispacciamento/capacità sull'offerta
        const qL = (r.quotaListino - r.ccv) * quotaPeriodoEnergia + r.ccvPeriodo;
        r.risparmioPeriodo = ctx.materia - qL * (1 + r.ivaAliq);
        r.risparmioAnnuo = r.materiaAttualeAnnua - r.quotaListino * (1 + r.ivaAliq);
        r.metodo = "facile";
      } else {
        r.risparmioPeriodo = (ctx.materia - r.quotaPeriodo) * (1 + r.ivaAliq);
        r.risparmioAnnuo = (r.materiaAttualeAnnua - r.quota) * (1 + r.ivaAliq);
        r.metodo = "materia";
      }
    } else if (ctx.totale != null) {
      // senza spesa materia: confronto sul totale stimato dal modello
      r.risparmioPeriodo = ctx.totale - r.totalePeriodo;
      r.risparmioAnnuo = (ctx.totale * scalaAnno) - r.totaleAnnuo;
      r.metodo = "totale";
    } else {
      r.risparmioPeriodo = null; r.risparmioAnnuo = null;
    }
    if (r.risparmioPeriodo != null) {
      r.nuovaBollettaPeriodo = ctx.totale != null ? ctx.totale - r.risparmioPeriodo : r.totalePeriodo;
      r.risparmioPct = ctx.totale ? r.risparmioPeriodo / ctx.totale : null;
      // incertezza della stima annua (consumo annuo stimato da un periodo breve)
      if (ctx.incertezza) { r.risparmioAnnuoMin = r.risparmioAnnuo - Math.abs(r.quota - r.ccv) * ctx.incertezza * (1 + r.ivaAliq); r.risparmioAnnuoMax = r.risparmioAnnuo + Math.abs(r.quota - r.ccv) * ctx.incertezza * (1 + r.ivaAliq); }
    }
    return r;
  }

  /* Profili mensili indicativi del consumo gas (% dell'anno), per stimare il consumo annuo da un periodo breve.
     Non sono profili ufficiali ARERA: sono pesi tipici per l'Italia centro-settentrionale, dichiarati nel preventivo come ipotesi.
     Il consumo annuo riportato in bolletta ha sempre la precedenza. */
  const PROFILI_GAS = {
    riscaldamento: [18, 15, 12, 7, 3, 2, 1.5, 1.5, 2, 5, 13, 20],
    cottura_acs: [10, 9.5, 9, 8.5, 7.5, 6.5, 6, 6, 6.5, 8, 9.5, 13],
    processo: [8.33, 8.33, 8.34, 8.33, 8.33, 8.34, 8.33, 8.33, 8.34, 8.33, 8.33, 8.34]
  };
  /* quota dell'anno (0-1) coperta dal periodo da→a secondo il profilo, giorno per giorno */
  function pesoPeriodo(da, a, profilo) {
    const w = PROFILI_GAS[profilo] || PROFILI_GAS.riscaldamento;
    let t = Date.parse(da), fine = Date.parse(a), tot = 0, giorni = 0;
    if (!(t <= fine)) return null;
    while (t <= fine && giorni < 800) {
      const d = new Date(t), y = d.getUTCFullYear(), mo = d.getUTCMonth(), gm = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      tot += w[mo] / 100 / gm; t += DAY; giorni++;
    }
    return Math.min(tot, 1);
  }
  /* stima del consumo annuo: { valore, metodo, incertezza (frazione), nota } */
  function stimaAnnua({ commodity, periodo, annuoBolletta, usaAnnuo, da, a, mesi, profilo }) {
    if (annuoBolletta && usaAnnuo !== false) return { valore: annuoBolletta, metodo: "bolletta", incertezza: 0, nota: "consumo annuo riportato in bolletta" };
    if (periodo == null || !mesi) return { valore: null, metodo: null, incertezza: null, nota: "" };
    if (commodity === "gas") {
      const p = pesoPeriodo(da, a, profilo);
      if (!p) return { valore: periodo / mesi * 12, metodo: "lineare", incertezza: 0.3, nota: "stima lineare" };
      const inc = p >= 0.95 ? 0.05 : p >= 0.5 ? 0.15 : p >= 0.25 ? 0.25 : 0.4;
      return { valore: periodo / p, metodo: "stagionale", incertezza: inc, quotaAnno: p,
        nota: `stima con profilo stagionale "${(profilo || "riscaldamento").replace("_", " e ")}": il periodo vale il ${Math.round(p * 100)}% dell'anno (±${Math.round(inc * 100)}%)` };
    }
    const inc = mesi >= 12 ? 0 : mesi >= 6 ? 0.1 : 0.2;
    return { valore: periodo / mesi * 12, metodo: "lineare", incertezza: inc, nota: mesi >= 12 ? "proiezione di 12 mesi" : `proiezione lineare di ${mesi} ${mesi === 1 ? "mese" : "mesi"} (±${Math.round(inc * 100)}%)` };
  }

  /* ---------------------------- FILTRI ---------------------------- */
  const has = (txt, s) => (txt || "").toLowerCase().includes(s.toLowerCase());

  function contratto(o) {
    if (o.contratto) return o.contratto;
    const n = (o.nome || "").toLowerCase();
    if (n.includes("dual")) return "dual";
    if (n.includes("single")) return "single";
    return "entrambi";
  }

  function stato(o, oggi) {
    if (o.chiusa) return { code: "chiusa", label: "Chiusa" };
    if (o.fine && o.fine < oggi) return { code: "scaduta", label: "Scaduta" };
    if (o.inizio && o.inizio > oggi) return { code: "futura", label: "Non ancora attiva" };
    if (o.fine) {
      const g = daysBetween(oggi, o.fine);
      if (g <= 7) return { code: "scadenza", label: g === 0 ? "Scade oggi" : g === 1 ? "Scade domani" : `Scade tra ${g} gg` };
    }
    return { code: "attiva", label: "Attiva" };
  }

  /* f: {tipologia, fascia, pagamento, operazione, canale, contratto, cliente, soloValide, soloRisparmio, fornitoreAttuale, escludiFornitore} */
  function filtra(offerte, f, oggi, commodity) {
    return offerte.filter(o => {
      if (o.disattivata) return false;
      const st = stato(o, oggi);
      if (f.soloValide && (st.code === "scaduta" || st.code === "chiusa" || st.code === "futura")) return false;
      if (f.tipologia && f.tipologia !== "Tutte" && o.tipologia !== f.tipologia) return false;
      if (commodity === "luce" && f.fascia && f.fascia !== "Tutte" && o.fascia !== f.fascia) return false;
      // offerte di mercato: pagamento/operazioni spesso non noti (campo vuoto = non filtrare), canale di vendita non applicabile
      if (f.pagamento && f.pagamento !== "Tutti" && o.pagamento && !has(o.pagamento, f.pagamento)) return false;
      if (f.operazione && f.operazione !== "Tutte" && o.operazioni && !o.operazioni.split(",").map(s => s.trim().toLowerCase()).includes(f.operazione.toLowerCase())) return false;
      if (f.canale && f.canale !== "Tutti" && !o.mercato && !has(o.canali, f.canale)) return false;
      if (f.contratto && f.contratto !== "Tutti") {
        const c = contratto(o);
        if (f.contratto === "single" && c === "dual") return false;
        if (f.contratto === "dual" && c === "single") return false;
      }
      const r = (o.restrizioni || "").toUpperCase();
      if (f.cliente === "condominio" && r.includes("NO CONDOMINI")) return false;
      if (f.cliente === "pertinenza" && /NO[^|]*PERTINENZE/.test(r)) return false;
      if (f.cliente === "pa" && /NO[^|]*\bPA\b/.test(r)) return false;
      if (f.escludiFornitore && f.fornitoreAttuale) {
        const a = f.fornitoreAttuale.toLowerCase().split(/\s+/)[0];
        if (a.length > 2 && o.azienda.toLowerCase().includes(a)) return false;
      }
      return true;
    });
  }

  window.Engine = { num, excelToISO, mesiPeriodo, todayISO, daysBetween, mediaIndice, bandaPotenza, costiReteLuce, costiReteLuceDom, costiReteGas, calcolaLuce, calcolaGas, progressivo, filtra, stato, contratto, stimaAnnua, pesoPeriodo, PROFILI_GAS };
})();
