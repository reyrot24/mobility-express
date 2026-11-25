/* Controllo automatico delle restrizioni di vendita delle offerte rispetto ai dati del cliente in bolletta.
   Legge il testo libero del campo "restrizioni" (regioni, comuni/CAP, limiti di consumo e potenza, fornitore uscente,
   distributore, residenza) e restituisce per ogni frase: ok / ko (non acquistabile) / verifica (dato mancante o non controllabile). */
(function () {
  const REGIONI = {
    "Abruzzo": "AQ CH PE TE", "Basilicata": "MT PZ", "Calabria": "CS CZ KR RC VV", "Campania": "AV BN CE NA SA",
    "Emilia-Romagna": "BO FC FE MO PC PR RA RE RN", "Friuli-Venezia Giulia": "GO PN TS UD", "Lazio": "FR LT RI RM VT",
    "Liguria": "GE IM SP SV", "Lombardia": "BG BS CO CR LC LO MB MI MN PV SO VA", "Marche": "AN AP FM MC PU",
    "Molise": "CB IS", "Piemonte": "AL AT BI CN NO TO VB VC", "Puglia": "BA BR BT FG LE TA",
    "Sardegna": "CA NU OR SS SU CI VS OT OG", "Sicilia": "AG CL CT EN ME PA RG SR TP",
    "Toscana": "AR FI GR LI LU MS PI PO PT SI", "Trentino-Alto Adige": "BZ TN", "Umbria": "PG TR",
    "Valle d'Aosta": "AO", "Veneto": "BL PD RO TV VE VI VR"
  };
  const ELENCO = Object.keys(REGIONI);
  const SIGLA = {}; for (const [r, s] of Object.entries(REGIONI)) s.split(" ").forEach(x => SIGLA[x] = r);
  // prime due cifre del CAP → regione
  const CAP = {};
  const capR = (r, ...pp) => pp.forEach(p => CAP[String(p).padStart(2, "0")] = r);
  capR("Lazio", 0, 1, 2, 3, 4); capR("Umbria", 5, 6); capR("Sardegna", 7, 8, 9);
  capR("Piemonte", 10, 12, 13, 14, 15, 28); capR("Valle d'Aosta", 11); capR("Liguria", 16, 17, 18, 19);
  capR("Lombardia", 20, 21, 22, 23, 24, 25, 26, 27, 46); capR("Emilia-Romagna", 29, 40, 41, 42, 43, 44, 47, 48);
  capR("Veneto", 30, 31, 32, 35, 36, 37, 45); capR("Friuli-Venezia Giulia", 33, 34); capR("Trentino-Alto Adige", 38, 39);
  capR("Toscana", 50, 51, 52, 53, 54, 55, 56, 57, 58, 59); capR("Marche", 60, 61, 62, 63); capR("Abruzzo", 64, 65, 66, 67);
  capR("Puglia", 70, 71, 72, 73, 74, 76); capR("Basilicata", 75, 85); capR("Campania", 80, 81, 82, 83, 84);
  capR("Molise", 86); capR("Calabria", 87, 88, 89); capR("Sicilia", 90, 91, 92, 93, 94, 95, 96, 97, 98);
  // nomi con cui una regione può comparire nei listini
  const ALIAS = [["Abruzzo", /ABRUZZ/], ["Basilicata", /BASILICATA|LUCANIA/], ["Calabria", /CALABRI/], ["Campania", /CAMPANIA/],
    ["Emilia-Romagna", /EMILIA|ROMAGNA/], ["Friuli-Venezia Giulia", /FRIULI|VENEZIA GIULIA/], ["Lazio", /LAZIO/], ["Liguria", /LIGURIA/],
    ["Lombardia", /LOMBARDIA/], ["Marche", /\bMARCHE\b/], ["Molise", /MOLISE/], ["Piemonte", /PIEMONTE/], ["Puglia", /PUGLIA|PUGLIE/],
    ["Sardegna", /SARDEGNA/], ["Sicilia", /SICILIA/], ["Toscana", /TOSCANA/], ["Trentino-Alto Adige", /TRENTINO|ALTO ADIGE|SUDTIROL/],
    ["Umbria", /UMBRIA/], ["Valle d'Aosta", /VALLE D.?AOSTA|VAL D.?AOSTA/], ["Veneto", /VENETO/]];

  const norm = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[’`]/g, "'");
  const nf = s => norm(s).replace(/S\.?P\.?A\.?|S\.?R\.?L\.?|MERCATO LIBERO|ENERGIA|ENERGY|LUCE E GAS|\bGAS\b|\bLUCE\b/g, "").replace(/[^A-Z0-9]/g, "");
  const numIt = s => { const t = String(s).replace(/\./g, "").replace(",", "."); const v = parseFloat(t); return isNaN(v) ? null : v; };
  const regioniIn = T => ALIAS.filter(([, re]) => re.test(T)).map(([r]) => r);
  const fmt = (v, d) => Number(v).toLocaleString("it-IT", { maximumFractionDigits: d || 0 });

  /* indirizzo → {cap, comune, provincia, regione} */
  function daIndirizzo(ind) {
    const s = String(ind || "").trim(); if (!s) return {};
    const out = {};
    const caps = s.match(/\b\d{5}\b/g); if (caps) out.cap = caps[caps.length - 1];
    const sg = s.match(/\(\s*([A-Za-z]{2})\s*\)/) || s.match(/\b([A-Z]{2})\s*$/);
    if (sg && SIGLA[sg[1].toUpperCase()]) out.provincia = sg[1].toUpperCase();
    if (out.cap) {
      const dopo = s.slice(s.lastIndexOf(out.cap) + 5).replace(/\(.*?\)/g, "").replace(/\b[A-Z]{2}\s*$/, "").replace(/[-–,]/g, " ").trim();
      if (dopo) out.comune = dopo.replace(/\s+/g, " ");
    }
    out.regione = (out.provincia && SIGLA[out.provincia]) || (out.cap && CAP[out.cap.slice(0, 2)]) || regioniIn(norm(s))[0] || "";
    return out;
  }

  /* p: {regione, comune, cap, kwhAnnui, smcAnnui, kw, fornitoreAttuale, distributore, residente, domestico, pagamento} */
  function valuta(o, p, commodity) {
    const testo = String(o.restrizioni || "").trim();
    if (!testo) return { ko: false, frasi: [], motivi: [], verifiche: [] };
    const frasi = testo.split(/\.\s+|;\s*|\.$|\n+/).map(x => x.trim()).filter(Boolean).map(f => esamina(f, p, commodity));
    return { ko: frasi.some(f => f.esito === "ko"), frasi,
      motivi: frasi.filter(f => f.esito === "ko").map(f => f.motivo), verifiche: frasi.filter(f => f.esito === "verifica").map(f => f.motivo || f.testo) };
  }

  function esamina(testo, p, commodity) {
    const T = norm(testo), R = (esito, motivo) => ({ testo, esito, motivo: motivo || "" });
    const neg = /NON VENDIBILE|NON DISPONIBILE|NON ATTIVABILE|ESCLUS|ECCETTO|TRANNE|^NO\b|^KO\b/.test(T);
    const regs = regioniIn(T);

    // pagamento obbligatorio in certe regioni (es. "Campania, Calabria, Sicilia solo SDD")
    if (regs.length && /SOLO\s+(SDD|RID|DOMICILIAZ)/.test(T)) {
      if (!p.regione) return R("verifica", `${regs.join(", ")}: solo addebito SDD/RID — manca la regione del cliente`);
      if (!regs.includes(p.regione)) return R("ok");
      if (/BOLLETTINO/i.test(p.pagamento || "")) return R("ko", `In ${p.regione} solo pagamento con addebito SDD/RID`);
      return R("verifica", `In ${p.regione} solo pagamento con addebito SDD/RID`);
    }
    // regioni escluse / ammesse
    if (regs.length) {
      const solo = /\bSOLO\b|\bESCLUSIVAMENTE\b|VENDIBILE (SOLO )?IN/.test(T) && !neg;
      if (!p.regione) return R("verifica", `${neg ? "Non vendibile in" : "Solo"} ${regs.join(", ")} — inserisci l'indirizzo di fornitura`);
      if (neg && regs.includes(p.regione)) return R("ko", `Non vendibile in ${p.regione}`);
      if (solo && !regs.includes(p.regione)) return R("ko", `Vendibile solo in ${regs.join(", ")} (cliente in ${p.regione})`);
      return R("ok");
    }
    // comuni / CAP esclusi (es. "Non vendibile ad Acerra, Afragola, Napoli 80126/80145/80147")
    const mc = T.match(/NON VENDIBILE (?:AD?|IN|NEI COMUNI DI|NEL COMUNE DI)\s+(.+)/);
    if (mc) {
      const caps = mc[1].match(/\b\d{5}\b/g) || [];
      const nomi = mc[1].split(/,|\s+E\s+/).map(x => x.replace(/[\d/]+/g, "").trim()).filter(x => x.length > 2);
      const comune = norm(p.comune).trim();
      if (p.cap && caps.includes(p.cap)) return R("ko", `Non vendibile nel CAP ${p.cap}`);
      if (comune) {
        const hit = nomi.find(n => comune === n || comune.startsWith(n + " ") || n === comune.replace(/\s+.*/, ""));
        if (hit) {
          const capsDelComune = (mc[1].match(new RegExp(hit + "\\s+([\\d/ ]+)")) || [])[1];
          if (capsDelComune) return p.cap ? R("ok") : R("verifica", `Non vendibile a ${hit} CAP ${capsDelComune.trim()} — manca il CAP`);
          return R("ko", `Non vendibile a ${hit.charAt(0) + hit.slice(1).toLowerCase()}`);
        }
        return R("ok");
      }
      return R("verifica", "Esclusi alcuni comuni — inserisci l'indirizzo di fornitura");
    }
    if (/LIMITAZION\w* TERRITORIAL|VERIFICARE IL COMUNE/.test(T)) return R("verifica", "Limitazioni territoriali: verificare il comune sul portale");

    // limiti di consumo e potenza
    const limiti = [];
    const range = T.match(/DA\s*([\d.,]+)\s*A\s*([\d.,]+)\s*(KWH|KW|SMC)\b/);
    if (range) limiti.push({ u: range[3], min: numIt(range[1]), max: numIt(range[2]) });
    if (/FINO A|\bMAX\b|MASSIM|ENTRO|NON OLTRE|INFERIOR/.test(T)) {
      for (const m of T.matchAll(/([\d.,]+)\s*(KWH|KW|SMC)\b/g)) if (!range || m.index < range.index || m.index > range.index + range[0].length) limiti.push({ u: m[2], max: numIt(m[1]) });
    }
    if (limiti.length) {
      const esiti = limiti.map(l => {
        const v = l.u === "KWH" ? p.kwhAnnui : l.u === "SMC" ? p.smcAnnui : p.kw;
        const un = l.u === "KWH" ? "kWh/anno" : l.u === "SMC" ? "Smc/anno" : "kW";
        if (l.u === "KW" ? commodity === "gas" : (l.u === "SMC") !== (commodity === "gas")) return null;
        if (v == null) return { e: "verifica", m: `Limite ${un}: dato del cliente mancante` };
        if (l.max != null && v > l.max * 1.0001) return { e: "ko", m: `${l.u === "KW" ? "Potenza" : "Consumo"} ${fmt(v, 1)} ${un} oltre il limite di ${fmt(l.max, 1)} ${un}` };
        if (l.min != null && v < l.min) return { e: "ko", m: `${l.u === "KW" ? "Potenza" : "Consumo"} ${fmt(v, 1)} ${un} sotto il minimo di ${fmt(l.min, 1)} ${un}` };
        return { e: "ok" };
      }).filter(Boolean);
      const ko = esiti.find(x => x.e === "ko"); if (ko) return R("ko", ko.m);
      const ve = esiti.find(x => x.e === "verifica");
      if (/SOLO DOMESTIC/.test(T) && p.domestico === false) return R("ko", "Solo clienti domestici");
      return ve ? R("verifica", ve.m) : R("ok");
    }

    // fornitore uscente non accettato
    const mf = T.match(/(?:USCENTI DA|PROVENIENTI DA|CLIENTI GIA'?|GIA'? CLIENTI|DAL GRUPPO|CLIENTI DI)\s+(.+)/);
    if (mf && /\bNO\b|\bKO\b|NON /.test(T)) {
      const nomi = mf[1].split(/,|\s+E\s+|\s+O\s+|\//).map(x => x.replace(/^(DI|DA|DEL|DELLA)\s+/, "").trim()).filter(x => x.length > 1);
      const fa = nf(p.fornitoreAttuale);
      if (!fa) return R("verifica", `Non accetta clienti uscenti da ${nomi.join(", ")} — fornitore attuale mancante`);
      const hit = nomi.find(n => { const k = nf(n); return k.length >= 3 && (fa.includes(k) || k.includes(fa)); });
      if (hit) return R("ko", `Cliente uscente da ${p.fornitoreAttuale}: non accettato`);
      if (/GRUPPO/.test(T)) return R("verifica", `Verificare che ${p.fornitoreAttuale} non sia del gruppo ${nomi.join(", ")}`);
      return /MOROS|SWITCH|OVER|ETA/.test(T) ? R("verifica", testo) : R("ok");
    }

    // distributore locale (solo luce)
    const md = T.match(/SOLO\s+(?:POD|DISTRIBUTOR\w*|RETE|RETI)\s+(.+)/);
    if (md && commodity === "luce") {
      if (/ELENCAT|LISTINO|PORTALE/.test(md[1])) return R("verifica", "Solo alcuni distributori: verificare il distributore del POD");
      const nomi = md[1].split(/,|\s+E\s+/).map(x => x.trim()).filter(x => x.length > 1);
      const di = nf(p.distributore).replace(/^ENELDISTRIBUZIONE/, "EDISTRIBUZIONE");
      if (!di) return R("verifica", `Solo distributori ${nomi.join(", ")} — distributore non indicato`);
      const hit = nomi.find(n => { const k = nf(n); return k.length >= 3 && (di.includes(k) || k.includes(di)); });
      return hit ? R("ok") : R("ko", `Distributore ${p.distributore} non ammesso (solo ${nomi.join(", ")})`);
    }

    // tipo di cliente (offerte business)
    if (/CONDOMINI|PERTINENZ|\bPA\b|PUBBLICA AMMINISTRAZ/.test(T) && neg) {
      if (p.tipo === "condominio" && /CONDOMINI/.test(T)) return R("ko", "Non per condomini");
      if (p.tipo === "pertinenza" && /PERTINENZ/.test(T)) return R("ko", "Non per pertinenze");
      if (p.tipo === "pa" && /\bPA\b|PUBBLICA/.test(T)) return R("ko", "Non per la Pubblica Amministrazione");
      return R("ok");
    }
    if (/PERSONA FISICA|ALTRI USI/.test(T)) {
      if (p.domestico === true && /ALTRI USI/.test(T)) return R("ko", "Solo usi diversi dall'abitazione");
      if (/PERSONA FISICA/.test(T)) {
        if (["condominio", "pa"].includes(p.tipo)) return R("ko", "Solo intestatario persona fisica");
        if (p.tipo === "societa") return R("verifica", "Solo intestatario persona fisica (ditta individuale)");
      }
      return R("ok");
    }

    // residenza
    if (/SOLO\s+(?:DOMESTICO\s+)?RESIDENT(?:E|I)\b(?!\s+(?:IN|ALL))/.test(T)) {
      if (p.residente === false) return R("ko", "Solo abitazione di residenza");
      return R("ok");
    }
    if (/NON RESIDENT/.test(T) && /SOLO/.test(T) && p.residente === true) return R("ko", "Solo abitazioni non di residenza");
    if (/SOLO DOMESTIC|USO DOMESTICO/.test(T)) return p.domestico === false ? R("ko", "Solo clienti domestici") : R("ok");

    // tutto il resto (età, morosità, n. switch, bolletta digitale, documenti) si verifica con il cliente
    return R("verifica", testo);
  }

  window.Restr = { REGIONI: ELENCO, daIndirizzo, valuta };
})();
