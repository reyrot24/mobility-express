/* Dati iniziali estratti dai calcolatori P.IVA (aggiornamento 17/11/2026).
   Le date sono numeri seriali Excel (come nel file originale): vengono convertite in ISO all'avvio.
   Tutto è modificabile dall'app (Offerte / Indici & Componenti) o reimportando i file Excel aggiornati. */
window.SEED = {
  version: "2026-11-17",

  /* ---------------- OFFERTE LUCE ---------------- */
  offerteLuce: [],
  /* colonne: azienda, offerta, inizio, fine, tipologia, fascia, prezzoF1, prezzoF2(F23), spread, ccvAnnua, operazioni, pagamento, canali, restrizioni */

  /* ---------------- OFFERTE GAS ---------------- */
  offerteGas: [],
  /* colonne: azienda, offerta, inizio, fine, tipologia, prezzoFisso, spread, ccvAnnua, operazioni, pagamento, canali, restrizioni */

  /* ---------------- INDICI ---------------- */
  /* PUN €/kWh mensile: [anno, mese, F0, F1, F23] */
  pun: [
    [2022,1,0.2245,0.2572,0.2175],[2022,2,0.2117,0.2249,0.2084],[2022,3,0.3081,0.3201,0.3059],[2022,4,0.246,0.2562,0.2462],
    [2022,5,0.2301,0.2372,0.2313],[2022,6,0.2713,0.2972,0.2651],[2022,7,0.4417,0.4952,0.4262],[2022,8,0.5432,0.554,0.5492],
    [2022,9,0.4299,0.4602,0.4231],[2022,10,0.2115,0.2359,0.2071],[2022,11,0.2245,0.2724,0.2087],[2022,12,0.2949,0.3607,0.2749],
    [2023,1,0.1745,0.1963,0.1685],[2023,2,0.1611,0.1743,0.1574],[2023,3,0.1364,0.1398,0.1372],[2023,4,0.135,0.1356,0.1382],
    [2023,5,0.1057,0.11,0.1065],[2023,6,0.1053,0.1082,0.1064],[2023,7,0.1121,0.1149,0.1126],[2023,8,0.1119,0.1103,0.1154],
    [2023,9,0.1157,0.1186,0.1162],[2023,10,0.1343,0.1446,0.1327],[2023,11,0.1217,0.1397,0.1159],[2023,12,0.1155,0.1319,0.1115],
    [2024,1,0.0992,0.1097,0.0964],[2024,2,0.0876,0.0962,0.0851],[2024,3,0.0889,0.0949,0.0874],[2024,4,0.0868,0.08557,0.090915],
    [2024,5,0.09488,0.09466,0.09886],[2024,6,0.103,0.1038,0.1058],[2024,7,0.11232,0.10867,0.116671],[2024,8,0.12844,0.12167,0.13404],
    [2024,9,0.11713,0.12233,0.117651],[2024,10,0.11669,0.12378,0.115096],[2024,11,0.1309,0.14559,0.126445],[2024,12,0.1351,0.15847,0.129665],
    [2025,1,0.14303,0.15832,0.139152],[2025,2,0.15036,0.15764,0.148668],[2025,3,0.12055,0.12168,0.122327],[2025,4,0.09985,0.09584,0.104264],
    [2025,5,0.09358,0.08909,0.097934],[2025,6,0.11178,0.113,0.11427],[2025,7,0.11313,0.10896,0.11705],[2025,8,0.10879,0.10558,0.111528],
    [2025,9,0.10908,0.10959,0.110643],[2025,10,0.11104,0.11783,0.109683],[2025,11,0.11709,0.12959,0.114025],[2025,12,0.11549,0.13009,0.111632],
    [2026,1,0.13266,0.151261,0.127084],[2026,2,0.11441,0.12228,0.111988],[2026,3,0.1434,0.14302,0.145367],[2026,4,0.11947,0.11114,0.12658],
    [2026,5,0.11935,0.10717,0.1257],[2026,6,0.132505,0.12576,0.138492],[2026,7,0.15704,0.1542,0.160135],[2026,8,0.18,0.17452,0.18673],
    [2026,9,0.20754,0.20635,0.211078],[2026,10,0.23082,0.23339,0.23256]
  ],
  /* PSV €/Smc mensile: [anno, mese, valore] */
  psv: [
    [2022,1,0.92],[2022,2,0.871],[2022,3,1.355],[2022,4,1.072],[2022,5,0.961],[2022,6,1.098],[2022,7,1.849],[2022,8,2.498],
    [2022,9,1.962],[2022,10,0.835],[2022,11,0.975],[2022,12,1.247],[2023,1,0.731],[2023,2,0.608],[2023,3,0.498],[2023,4,0.479],
    [2023,5,0.364],[2023,6,0.354],[2023,7,0.336],[2023,8,0.355],[2023,9,0.396],[2023,10,0.467],[2023,11,0.455],[2023,12,0.388],
    [2024,1,0.333],[2024,2,0.298],[2024,3,0.307],[2024,4,0.326],[2024,5,0.34698],[2024,6,0.3864],[2024,7,0.37504],[2024,8,0.42952],
    [2024,9,0.4119],[2024,10,0.4327],[2024,11,0.47799],[2024,12,0.50417],[2025,1,0.52808],[2025,2,0.56059],[2025,3,0.45046],[2025,4,0.39835],
    [2025,5,0.39888],[2025,6,0.39971],[2025,7,0.38852],[2025,8,0.37718],[2025,9,0.36952],[2025,10,0.353959],[2025,11,0.3453],[2025,12,0.32467],
    [2026,1,0.404227],[2026,2,0.377233],[2026,3,0.558338],[2026,4,0.493117],[2026,5,0.502398],[2026,6,0.505178],[2026,7,0.606917],[2026,8,0.686889],
    [2026,9,0.843639],[2026,10,0.945843]
  ],
  /* Valori "Forecast GME" usati dal calcolatore quando non c'è storico per il periodo */
  forecast: { punF0: 0.2033, punF1: 0.214, punF23: 0.2029, psv: 0.8142 },

  /* ---------------- COMPONENTI AUTORITÀ LUCE (BTA altri usi) ---------------- */
  luce: {
    iva: 0.22,
    tras: 0.0119,                 // TRAS €/kWh
    dispacciamento: 0.011726,     // corrispettivo dispacciamento €/kWh (Terna, trimestrale)
    capacita: 0.011566,           // mercato capacità m0 €/kWh
    sbilanciamento: 0.00122958,   // informativo (non usato nel calcolo, come nel file Excel)
    bioF1Default: 0.44,           // quota consumi in F1 se la bolletta non riporta le fasce
    accise: { soglia1Mese: 200000, aliq1: 0.0125, soglia2Mese: 1200000, aliq2: 0.0075, fissoMese: 4820 },
    /* fasce di potenza: maxKw (null = oltre), DIS BTA potenza/fissa/variabile, Asos, ARIM, UC6, UC3, MIS */
    bands: [
      { name:"BTA1 (≤1,5 kW)",       maxKw:1.5,  disPot:35.2511, disFix:5.6914, disVar:0.00073, asosPot:13.6116, asosFix:11.9364, asosVar:0.027973, arimPot:3.4524, arimFix:3.0276, arimVar:0.001616, uc6Fix:1.6824, uc6Var:0.00007, uc3:0.00276, mis:21.8469 },
      { name:"BTA2 (1,6–3 kW)",      maxKw:3,    disPot:33.386,  disFix:5.6914, disVar:0.00073, asosPot:12.8916, asosFix:11.9364, asosVar:0.027973, arimPot:3.27,   arimFix:3.0276, arimVar:0.001616, uc6Fix:1.6824, uc6Var:0.00007, uc3:0.00276, mis:21.8469 },
      { name:"BTA3 (3,1–6 kW)",      maxKw:6,    disPot:37.1162, disFix:5.6914, disVar:0.00073, asosPot:14.3316, asosFix:11.9364, asosVar:0.027973, arimPot:3.636,  arimFix:3.0276, arimVar:0.001616, uc6Fix:1.6824, uc6Var:0.00007, uc3:0.00276, mis:21.8469 },
      { name:"BTA4 (6,1–10 kW)",     maxKw:10,   disPot:37.1162, disFix:6.2605, disVar:0.00073, asosPot:14.3316, asosFix:12.1572, asosVar:0.027973, arimPot:3.636,  arimFix:3.0828, arimVar:0.001616, uc6Fix:1.6824, uc6Var:0.00007, uc3:0.00276, mis:21.8469 },
      { name:"BTA5 (10,1–16,5 kW)",  maxKw:16.5, disPot:37.1162, disFix:6.2605, disVar:0.00073, asosPot:14.3316, asosFix:12.1572, asosVar:0.027973, arimPot:3.636,  arimFix:3.0828, arimVar:0.001616, uc6Fix:1.6824, uc6Var:0.00007, uc3:0.00276, mis:21.8469 },
      { name:"BTA6 (>16,5 kW)",      maxKw:null, disPot:35.2511, disFix:5.6914, disVar:0.00071, asosPot:13.6116, asosFix:11.9364, asosVar:0.027968, arimPot:3.4524, arimFix:3.0276, arimVar:0.001614, uc6Fix:1.6824, uc6Var:0.00007, uc3:0.00276, mis:21.8469 }
    ]
  },

  /* ---------------- COMPONENTI AUTORITÀ GAS (Ambito Nord Orientale) ---------------- */
  gas: {
    iva: 0.22,
    qtGJ: 2.350297, pcs: 0.03852,                 // QT €/GJ × PCS convenzionale
    rs:  [0.002788, 0.001409],                    // ≤200.000 Smc / oltre
    ug1: [0.034837, 0.017603],
    re:  [0.029417, 0.015611],
    gs:  [0.003907, 0.001826],
    ug3: 0.007292,
    st: -0.35, vr: -0.01,                          // €/anno
    tau1: { cot: 2.01,
            dis: { "G4 - G6": 40.26, "G10 - G40": 295.72, "G40": 604.16 },
            mis: { "G4 - G6": 27.33, "G10 - G40": 189.98, "G40": 386.34 } },
    /* scaglioni progressivi: fino a "a" Smc/anno → €/Smc (a null = oltre) */
    tau3: [ {a:120,v:0},{a:480,v:0.079367},{a:1560,v:0.072643},{a:5000,v:0.072949},{a:80000,v:0.054508},{a:200000,v:0.02761},{a:1000000,v:0.013551},{a:null,v:0.00377} ],
    ug2:  [ {a:120,v:0},{a:480,v:0.0496},{a:1560,v:0.0293},{a:5000,v:0.0237},{a:80000,v:0.017},{a:200000,v:0.0071},{a:null,v:0} ],
    ug2Fisso: -21.63,                              // €/anno
    accise: { soglia: 1200000, aliq1: 0.01249, aliq2: 0.0074988 },
    classeDefault: "G10 - G40",
    qvd: 0.007946, ccr: 0.033816, qoa: 0           // informativi (non usati nel calcolo, come nel file Excel)
  }
};

/* ---------------- COMPONENTI DOMESTICHE (preventivi privati, DIMOSTRATIVI) ----------------
   Servono solo a stimare il totale annuo: il risparmio si calcola sulla spesa materia, come per le aziende.
   Fonti: ARERA tariffa TD 2026 (delibera 575/2025), oneri IV trim. 2026, accise da TU accise. Valori da verificare. */
window.SEED.luceDom = {
  domestico: true,
  iva: 0.10,
  dispacciamento: 0.011726, capacita: 0.011566,
  bioF1Default: 0.33,                                  // quota tipica dei consumi domestici in F1
  trasporto: { fisso: 23.04, potenza: 23.52, energia: 0.0119 },   // €/anno, €/kW/anno, €/kWh (TD 2026)
  oneri: { energia: 0.0332, fissoNonResidenti: 95.0916 },          // ASOS+ARIM €/kWh; quota fissa ASOS per non residenti €/anno
  accise: { aliq: 0.0227, esenzioneMese: 150, recuperoMese: 220, maxKwEsenzione: 3 }  // residenti ≤3 kW: primi 150 kWh/mese esenti
};
window.SEED.gasDom = Object.assign(JSON.parse(JSON.stringify(window.SEED.gas)), {
  domestico: true,
  iva: 0.22,
  ivaRidotta: { aliq: 0.10, soglia: 480 },            // IVA 10% sui primi 480 Smc/anno
  acciseScaglioni: [ {a:120,v:0.044},{a:480,v:0.175},{a:1560,v:0.170},{a:null,v:0.186} ],   // usi domestici (centro-nord)
  addizionale: 0,                                      // addizionale regionale €/Smc: dipende dalla regione
  classeDefault: "G4 - G6"
});
