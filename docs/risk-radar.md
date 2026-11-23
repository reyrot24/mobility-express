# Risk Radar Aziende (ALCA Broker)

Pagina per le aziende: partita IVA → dettagli → Risk Radar (rischi, coperture, tre pacchetti, PDF).
Dashboard commerciale: analisi ricevute, link dei collaboratori, export CSV.

| Cosa | Dove |
|---|---|
| Pagina aziende | `/risk-radar` (link collaboratore: `/risk-radar?ref=<codice>`) → `src/components/pages/RiskRadar/RiskRadar.tsx` |
| Dashboard | `/risk-radar/admin` → `src/components/pages/RiskRadar/RiskRadarAdmin.tsx` |
| API pubblica | Edge Function `risk-radar` (`lookup`, `enrich`, `analyze`, `contact`) |
| API dashboard | Edge Function `risk-radar-admin` (`data`, `referrer`, `status`), header `x-admin-key` |
| Tabelle | `rr_referrers`, `rr_analyses`, `rr_settings`, `rr_lookups` (migrazione `20261118000000_risk_radar.sql`) |

Le tabelle `rr_*` non hanno policy: il browser non le legge mai, passa solo dalle funzioni (service role).
Non toccano le tabelle di "Il prezzo giusto per te" (`richieste`, `profili`, …) né la funzione `api`.
Il frontend chiama `${VITE_SUPABASE_URL}/functions/v1/...`: nessuna nuova variabile su Vercel.

## Messa in produzione (ordine)

1. **Migrazione**: eseguire `supabase/migrations/20261118000000_risk_radar.sql` (SQL Editor o `supabase db push`).
2. **Segreto Claude** (ricerca online di ATECO e fatturato):
   `npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
   Senza chiave la pagina funziona lo stesso: l'utente sceglie l'ATECO dall'elenco.
3. **Chiave della dashboard**: scegliere una chiave lunga e casuale, salvarne solo lo SHA-256:
   ```sh
   CHIAVE=$(openssl rand -base64 32); echo "$CHIAVE"   # conservarla in un password manager
   printf %s "$CHIAVE" | shasum -a 256 | cut -d' ' -f1
   ```
   ```sql
   insert into rr_settings (key, value) values ('admin_key_sha256', '<hash>')
   on conflict (key) do update set value = excluded.value;
   ```
4. **Funzioni**: `npm run rr:deploy` (Verify JWT disattivato da `supabase/config.toml`).
5. **Frontend**: push su `main` (Vercel).

## Impostazioni (`rr_settings`)

| Chiave | Significato | Predefinito |
|---|---|---|
| `admin_key_sha256` | Impronta della chiave dashboard | — (obbligatoria) |
| `web_model` | Modello per la ricerca online | `claude-opus-5-5` (più economico: `claude-haiku-5-5`) |
| `web_hourly_limit` | Ricerche online nuove all'ora | 60 |
| `openapi_token` | Token OpenAPI "Company IT-advanced" (ATECO/fatturato ufficiali), facoltativo | — |

Ogni P.IVA resta in cache 7 giorni (`rr_lookups`).

## Da completare prima dell'invio alle aziende

- Tariffe, profili di rischio e massimali in `supabase/functions/risk-radar/index.ts` (`SECTORS`, `DIVS`, `COVERS`, `REV`, `EMP`) sono **dimostrativi**: vanno sostituiti con quelli ALCA Broker e la funzione ripubblicata.
- Link all'informativa privacy e revisione dei testi legali (IVASS).
