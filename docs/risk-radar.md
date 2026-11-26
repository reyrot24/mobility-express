# Risk Radar Aziende (ALCA Broker)

Pagina per le aziende: partita IVA → dettagli → Risk Radar (rischi, coperture, tre pacchetti, PDF).
Dashboard commerciale: analisi ricevute, link dei collaboratori, export CSV.

| Cosa | Dove |
|---|---|
| Pagina aziende | `/risk-radar` (link collaboratore: `/risk-radar?ref=<codice>`) → `src/components/pages/RiskRadar/RiskRadar.tsx` |
| Dashboard | `/risk-radar/admin` → `src/components/pages/RiskRadar/RiskRadarAdmin.tsx` |
| API pubblica | Edge Function `risk-radar` (`lookup`, `enrich`, `analyze`, `contact`) |
| API dashboard | Edge Function `risk-radar-admin` (`login`, `logout`, `data`, `referrer`, `status`, …), header `x-admin-token` |
| Tabelle | `rr_referrers`, `rr_analyses`, `rr_settings`, `rr_lookups` (migrazione `20261118000000_risk_radar.sql`), `rr_admin_users`, `rr_admin_sessions` (`20261127000000_risk_radar_accesso.sql`) |

Le tabelle `rr_*` non hanno policy: il browser non le legge mai, passa solo dalle funzioni (service role).
Non toccano le tabelle di "Il prezzo giusto per te" (`richieste`, `profili`, …) né la funzione `api`.
Il frontend chiama `${VITE_SUPABASE_URL}/functions/v1/...`: nessuna nuova variabile su Vercel.

## Messa in produzione (ordine)

1. **Migrazioni**: eseguire `supabase/migrations/20261118000000_risk_radar.sql` poi `20261123000000_risk_radar_operatori.sql`, `20261125000000_risk_radar_email.sql` e `20261127000000_risk_radar_accesso.sql` (SQL Editor o `supabase db push`). Si parte da zero: nessun dato copiato da alca-desk.
2. **Segreto Claude** (ricerca online di ATECO e fatturato):
   `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   Senza chiave la pagina funziona lo stesso: l'utente sceglie l'ATECO dall'elenco.
3. **Account della dashboard**: `npm run rr:admin-user -- <nome-utente>` genera la password e stampa
   l'SQL da eseguire (nel DB solo l'hash PBKDF2-SHA256). Sessione di 12 ore; dopo 5 password sbagliate
   l'account si blocca per 15 minuti. Rieseguire lo stesso comando reimposta la password.
4. **Funzioni**: `npm run rr:deploy` (Verify JWT disattivato da `supabase/config.toml`).
5. **Frontend**: push su `main` (Vercel).

## Impostazioni (`rr_settings`)

| Chiave | Significato | Predefinito |
|---|---|---|
| `admin_key_sha256` | Vecchia chiave unica della dashboard, non più usata: si può cancellare | — |
| `web_model` | Modello per la ricerca online | `claude-opus-5-5` (più economico: `claude-haiku-5-5`) |
| `web_hourly_limit` | Ricerche online nuove all'ora | 60 |
| `openapi_token` | Token OpenAPI "Company IT-advanced" (ATECO/fatturato ufficiali), facoltativo | — |
| `notify_emails` | Destinatari ufficio dell'email "Nuova analisi" (virgola). Si imposta dalla dashboard, scheda Impostazioni | vuoto = nessuna email |
| `notify_owner` | `true` = l'email va anche al titolare del link (se ha l'email) | `false` |

Ogni P.IVA resta in cache 7 giorni (`rr_lookups`).

## Dashboard (`/risk-radar/admin`)

Stessa struttura del portale ALCA Energia (`alca-energy-web/portale.html`): schede **Cruscotto** (KPI, analisi da gestire, rendimento dei link), **Analisi** (filtri, stato, dettaglio con note interne ed esito dell'email), **Link** (crea, copia, QR in PNG, modifica titolare, disattiva) e **Impostazioni** (destinatari email, email di prova). Accesso con la chiave di amministrazione; il titolare del link si scrive a mano finché il login non passerà agli account di alca-desk.

## Email "Nuova analisi"

Parte dalla funzione `risk-radar` quando un'azienda completa l'analisi, in background (`supabase/functions/_shared/rr-notify.ts`). Usa lo stesso SMTP di "OK, il prezzo è giusto?" (secret `SMTP_HOST`, `SMTP_PORT`=465, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `SITE_URL` per il link alla dashboard): i secret di Supabase valgono per tutte le funzioni, non serve reimpostarli. Esito salvato in `rr_analyses.notified_at` / `notified_to` / `notify_error`. Il pulsante "Invia email di prova" scrive solo agli indirizzi dell'ufficio salvati.

## Altre email (regole del referral ALCA Energia)
- **"Vuole essere ricontattata"**: pulsante "Voglio essere ricontattato" dopo il risultato → stessi destinatari della "Nuova analisi", una sola volta per analisi (`contact_requested_at`, `contact_notified_at`, `contact_notify_error`).
- **Riepilogo al cliente**: solo con la casella "Inviami il riepilogo". Prima un'email di conferma con link `/risk-radar/conferma#t=…` valido 24 ore (nel DB solo lo SHA-256 del token), poi il riepilogo. Massimo 5 richieste al giorno per indirizzo. Mittente `"Alca Broker" <indirizzo di MAIL_FROM>` (o secret `RR_MAIL_FROM`), risposte al titolare del link o al primo indirizzo dell'ufficio. Esito in `summary_status`.
- **In prova**: finché `RR_EMAIL_REALI` non è `true`, le email al cliente partono solo verso `RR_EMAIL_ALLOWLIST` (indirizzi separati da virgola); le altre restano `bloccata_test`. Il link nelle email usa l'origine della pagina se è in `ALLOWED_ORIGINS`, altrimenti `SITE_URL`.
- **Link al titolare**: pulsante "Invia" nella scheda Link → indirizzo personale e QR code (GIF in allegato e nel testo). Esito in `rr_referrers.link_sent_at` / `link_sent_to`.

## Da completare prima dell'invio alle aziende

- Tariffe, profili di rischio e massimali in `supabase/functions/risk-radar/index.ts` (`SECTORS`, `DIVS`, `COVERS`, `REV`, `EMP`) sono **dimostrativi**: vanno sostituiti con quelli ALCA Broker e la funzione ripubblicata.
- Link all'informativa privacy e revisione dei testi legali (IVASS).
