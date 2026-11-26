# Risk Radar: commands cheat sheet

Quick reference for test mode, production mode and the SQL you run in Supabase.
Run terminal commands from the project folder. Run SQL in Supabase, project **ddfrflequhjjsnuffyiz**, under **SQL Editor**.
For the full technical setup, see [risk-radar.md](risk-radar.md).

> After you change any secret, run `npm run rr:deploy` so the functions pick it up.

---

## 1. Which emails test mode affects

| Email                                      | Goes to                                 | Affected by test mode? |
| ------------------------------------------ | --------------------------------------- | ---------------------- |
| Nuova analisi                              | Office addresses in Impostazioni        | No, always sent        |
| Ricontatto ("wants to be contacted")       | Office addresses in Impostazioni        | No, always sent        |
| Confirmation + summary to the company      | The email the company typed in the form | **Yes**                |
| Link + QR to the link owner (Invia button) | The link owner's email                  | No, always sent        |

- **Test mode:** `RR_EMAIL_REALI` is not `true`. Companies get emails only if their address is in `RR_EMAIL_ALLOWLIST`. Any other address is not emailed, and the analysis is saved with status `bloccata_test`. Impostazioni shows **"in prova"**.
- **Production mode:** `RR_EMAIL_REALI=true`. Every company that ticks the box gets its emails, and the allowlist is ignored. Impostazioni shows **"invio reale"**.

---

## 2. Switch to test mode

```bash
npx supabase secrets unset RR_EMAIL_REALI
npx supabase secrets set RR_EMAIL_ALLOWLIST="you@example.com,colleague@example.com"
npm run rr:deploy
```

To add or change test addresses, run the `set` again with the full list (it replaces the old one), then deploy.

## 3. Switch to production mode

Do this only after you have:

- ALCA's real rates;
- the DPO's approval of the privacy text;
- the real office emails in Impostazioni.

```bash
npx supabase secrets set RR_EMAIL_REALI=true
npx supabase secrets unset RR_EMAIL_ALLOWLIST   # optional, it's ignored once REALI=true
npm run rr:deploy
```

## 4. Check the current secrets

```bash
npx supabase secrets list
```

This shows names only, not values. If `RR_EMAIL_REALI` isn't listed, you're in test mode.

## 5. Optional: different sender

The default sender is `"Alca Broker" <the address in MAIL_FROM>`. To use a different one:

```bash
npx supabase secrets set RR_MAIL_FROM='"Alca Broker" <noreply@your-domain.it>'
npm run rr:deploy
```

The address must be one your SMTP account is allowed to send from. Otherwise the emails fail with `email_errore`.

## 5b. Dashboard accounts (username + password)

The dashboard at `/risk-radar/admin` uses a username and password. Only a hash of the password is stored in the database, so a lost password can't be recovered, only replaced.

Create an account, or reset its password. Run the same command again for an existing user:

```bash
npm run rr:admin-user -- alca.admin            # generates a random password
npm run rr:admin-user -- alca.admin 'MyOwnPassword123'   # or choose one (min 12 characters)
```

It prints the password, which you send to the person, and an SQL block to run in the SQL Editor. Resetting also unlocks the account and logs out any open sessions.

- A login lasts 12 hours. After that, the person has to log in again.
- After 5 wrong passwords, the account is locked for 15 minutes.

```sql
-- See the accounts
select username, active, last_login_at, failed_attempts, locked_until from rr_admin_users;

-- Unlock an account now (instead of waiting 15 minutes)
update rr_admin_users set failed_attempts = 0, locked_until = null where username = 'alca.admin';

-- Disable an account and log it out
update rr_admin_users set active = false where username = 'alca.admin';
delete from rr_admin_sessions where username = 'alca.admin';

-- Re-enable it
update rr_admin_users set active = true where username = 'alca.admin';

-- Delete an account (its sessions go with it)
delete from rr_admin_users where username = 'alca.admin';

-- Once the new login is live: remove the old single admin key
delete from rr_settings where key = 'admin_key_sha256';
```

**First setup, in this order:**

1. Run `supabase/migrations/20261127000000_risk_radar_accesso.sql` in the SQL Editor.
2. Run the SQL printed by `npm run rr:admin-user`.
3. Run `npm run rr:deploy`.
4. Push the frontend to `main`.

Between steps 3 and 4 the live dashboard is broken: the old page still sends the key. Do 3 and 4 close together.

---

## 6. SQL: see what happened to the emails

```sql
-- Latest analyses with the status of every email
select created_at, company_name, piva, email, ref_code,
       notified_at, notify_error,                 -- Nuova analisi (office)
       contact_notified_at, contact_notify_error, -- Ricontatto (office)
       summary_status, summary_sent_at            -- Summary to the company
from rr_analyses
order by created_at desc
limit 20;
```

```sql
-- Links and when the link + QR was last sent
select code, name, operatore_email, active, link_sent_at, link_sent_to
from rr_referrers
order by created_at desc;
```

```sql
-- Current settings (office emails, notify the link owner)
select key, value from rr_settings where key in ('notify_emails', 'notify_owner');
```

Possible `summary_status` values:

| Value                                       | Meaning                                                         |
| ------------------------------------------- | --------------------------------------------------------------- |
| `conferma_inviata`                          | The confirmation email was sent; the company hasn't clicked yet |
| `riepilogo_inviato`                         | Confirmed, and the summary was sent                             |
| `bloccata_test`                             | Test mode, and the address isn't in the allowlist               |
| `limite_superato`                           | More than 5 requests in a day from the same email               |
| `email_non_configurata` / `email_errore: …` | SMTP problem                                                    |

## 7. SQL: delete test data

Delete one test email's analyses:

```sql
delete from rr_analyses where email = 'you@example.com';
```

Delete one test link (find the code in the dashboard):

```sql
delete from rr_referrers where code = 'link-code';   -- the part after ?ref= in the link
```

Full reset before launch. This wipes everything:

```sql
delete from rr_analyses;
delete from rr_referrers;
delete from rr_lookups;
update rr_settings set value = ''      where key = 'notify_emails';
update rr_settings set value = 'false' where key = 'notify_owner';
```

After the reset:

- add the real office emails in the dashboard under **Impostazioni**;
- create the real links and press **Invia** for each.

## 8. Deploy

| What changed                                 | Command                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| The functions (risk-radar, risk-radar-admin) | `npm run rr:deploy`                                                      |
| The frontend                                 | push to `main` (Vercel deploys it)                                       |
| A new migration                              | run its `.sql` file in the SQL Editor **before** deploying the functions |

---

## Launch checklist

- [ ] ALCA's real rates in `supabase/functions/risk-radar/index.ts`, and the "dimostrativi" wording removed
- [ ] DPO approval of the privacy text
- [ ] Full reset SQL (section 7)
- [ ] Real office emails in Impostazioni, and a decision on "avvisa il titolare del link"
- [ ] Decision on the sender (section 5)
- [ ] Production mode (section 3)
- [ ] Real links created, and **Invia** pressed for each
- [ ] Dashboard account(s) created (section 5b), credentials sent to the admin, old `admin_key_sha256` deleted
