// Risk Radar Aziende — API della dashboard ALCA Broker.
// Ogni richiesta deve avere l'header  x-admin-key  (la chiave non è salvata in chiaro:
// nel database c'è solo il suo SHA-256, in rr_settings.admin_key_sha256).
//   POST /risk-radar-admin/data            {}                                         -> link, analisi, impostazioni
//   POST /risk-radar-admin/referrer        { name, operatore_nome?, operatore_email? } -> nuovo link
//   POST /risk-radar-admin/referrer-update { code, name?, operatore_nome?, operatore_email?, active? }
//   POST /risk-radar-admin/status          { id, status?, note? }                     -> gestione dell'analisi
//   POST /risk-radar-admin/settings        { notify_emails, notify_owner }            -> destinatari email
//   POST /risk-radar-admin/test-email      {}                                         -> email di prova all'ufficio
//   POST /risk-radar-admin/referrer-send   { code, site? }                            -> link + QR code al titolare
// Scrive solo nelle tabelle rr_* del nostro progetto.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import qrcode from "npm:qrcode-generator@1.4.4";
import { customerMode, mailError, notifySettings, parseEmails, sendAnalysisMail, sendLinkMail, SITE_URL } from "../_shared/rr-notify.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, x-admin-key, authorization, apikey, x-client-info",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

async function sha256(s: string) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
const STATUSES = ["nuova", "contattata", "proposta", "chiusa", "persa"];
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
const REF_COLS = "code,name,active,created_at,operatore_id,operatore_nome,operatore_email,link_sent_at,link_sent_to";

/** Email singola facoltativa: "" -> null, non valida -> undefined (errore). */
function optEmail(v: unknown): string | null | undefined {
  const s = clip(v, 200).toLowerCase();
  if (!s) return null;
  return parseEmails(s)[0] === s ? s : undefined;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  const key = req.headers.get("x-admin-key") ?? "";
  const { data: setting } = await db.from("rr_settings").select("value").eq("key", "admin_key_sha256").maybeSingle();
  if (!key || !setting || !safeEq(await sha256(key), setting.value)) return json({ error: "Chiave non valida" }, 401);

  const route = new URL(req.url).pathname.split("/").pop();
  let body: any = {};
  try { body = await req.json(); } catch { /* corpo vuoto */ }

  try {
    if (route === "data") {
      const [refs, an, cfg] = await Promise.all([
        db.from("rr_referrers").select(REF_COLS).order("created_at"),
        db.from("rr_analyses")
          .select("id,created_at,updated_at,piva,company_name,address,vies_valid,ref_code,params,ateco_code,ateco_source,overall_risk,budget_low,budget_high,email,phone,wants_contact,status,note,notified_at,notified_to,notify_error," +
            "contact_requested_at,contact_notified_at,contact_notify_error,summary_requested_at,summary_confirmed_at,summary_sent_at,summary_status")
          .order("created_at", { ascending: false }).limit(1000),
        notifySettings(db),
      ]);
      if (refs.error) throw refs.error;
      if (an.error) throw an.error;
      return json({
        referrers: refs.data, analyses: an.data,
        settings: { notify_emails: cfg.emails, notify_owner: cfg.owner, smtp: !!Deno.env.get("SMTP_HOST"), customer: customerMode() },
      });
    }

    if (route === "referrer") {
      const name = clip(body.name, 80);
      if (!name) return json({ error: "Nome del link mancante" }, 400);
      const operatore_email = optEmail(body.operatore_email);
      if (operatore_email === undefined) return json({ error: "Email del titolare non valida" }, 400);
      const slug = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "").slice(0, 20) || "collab";
      const code = `${slug}-${crypto.randomUUID().slice(0, 4)}`;
      const { data, error } = await db.from("rr_referrers")
        .insert({ code, name, operatore_nome: clip(body.operatore_nome, 120) || null, operatore_email })
        .select(REF_COLS).single();
      if (error) throw error;
      return json(data);
    }

    if (route === "referrer-update") {
      const code = clip(body.code, 40);
      if (!code) return json({ error: "Link mancante" }, 400);
      const patch: Record<string, unknown> = {};
      if ("name" in body) {
        const name = clip(body.name, 80);
        if (!name) return json({ error: "Nome del link mancante" }, 400);
        patch.name = name;
      }
      if ("operatore_nome" in body) patch.operatore_nome = clip(body.operatore_nome, 120) || null;
      if ("operatore_email" in body) {
        const e = optEmail(body.operatore_email);
        if (e === undefined) return json({ error: "Email del titolare non valida" }, 400);
        patch.operatore_email = e;
      }
      if (typeof body.active === "boolean") patch.active = body.active;
      if (!Object.keys(patch).length) return json({ error: "Niente da aggiornare" }, 400);
      const { data, error } = await db.from("rr_referrers").update(patch).eq("code", code).select(REF_COLS).maybeSingle();
      if (error) throw error;
      if (!data) return json({ error: "Link non trovato" }, 404);
      return json(data);
    }

    if (route === "status") {
      if (typeof body.id !== "string") return json({ error: "Dati non validi" }, 400);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if ("status" in body) {
        if (!STATUSES.includes(body.status)) return json({ error: "Stato non valido" }, 400);
        patch.status = body.status;
      }
      if ("note" in body) patch.note = clip(body.note, 2000) || null;
      const { error } = await db.from("rr_analyses").update(patch).eq("id", body.id);
      if (error) throw error;
      return json({ ok: true, updated_at: patch.updated_at });
    }

    if (route === "settings") {
      const raw = Array.isArray(body.notify_emails) ? body.notify_emails.join(",") : String(body.notify_emails ?? "");
      const emails = parseEmails(raw);
      const typed = raw.split(/[,;\s]+/).filter(Boolean).length;
      if (emails.length !== typed) return json({ error: "Una o più email non sono valide" }, 400);
      if (emails.length > 10) return json({ error: "Massimo 10 indirizzi" }, 400);
      const { error } = await db.from("rr_settings").upsert([
        { key: "notify_emails", value: emails.join(",") },
        { key: "notify_owner", value: body.notify_owner === true ? "true" : "false" },
      ]);
      if (error) throw error;
      return json({ notify_emails: emails, notify_owner: body.notify_owner === true });
    }

    if (route === "test-email") {
      // Solo verso gli indirizzi dell'ufficio salvati: la prova non arriva mai ai titolari dei link.
      const { emails } = await notifySettings(db);
      if (!emails.length) return json({ error: "Nessun indirizzo dell'ufficio salvato" }, 400);
      try {
        await sendAnalysisMail(emails, {
          test: true, company_name: "Azienda di Prova S.r.l.", piva: "00000000000", address: "Napoli (NA)",
          sector: "Commercio all'ingrosso e al dettaglio", overall_risk: 62, budget_low: 2400, budget_high: 3900,
          email: "prova@example.com", phone: "+39 000 0000000", wants_contact: true,
          referrer: { name: "Link di prova", operatore_nome: "Mario Rossi" },
        });
      } catch (e) {
        console.error("test-email", e);
        return json({ error: `Invio non riuscito: ${(e as Error).message}` }, 502);
      }
      return json({ ok: true, to: emails });
    }

    if (route === "referrer-send") {
      // Email 4: link personale e QR code al titolare. Il sito è quello da cui lavora la dashboard
      // (come il link copiato), purché sia un indirizzo https o il sito di sviluppo locale.
      const code = clip(body.code, 40);
      const { data: ref, error } = await db.from("rr_referrers").select(REF_COLS).eq("code", code).maybeSingle();
      if (error) throw error;
      if (!ref) return json({ error: "Link non trovato" }, 404);
      if (!ref.active) return json({ error: "Il link è disattivato: riattivalo prima di inviarlo" }, 400);
      if (!ref.operatore_email) return json({ error: "Manca l'email del titolare: aggiungila con Modifica" }, 400);
      const s = clip(body.site, 200).replace(/\/$/, "");
      const site = /^https:\/\/[a-z0-9.-]+$/i.test(s) || /^http:\/\/localhost(:\d+)?$/.test(s) ? s : SITE_URL;
      const url = `${site}/risk-radar?ref=${encodeURIComponent(ref.code)}`;
      const qr = qrcode(0, "M");
      qr.addData(url);
      qr.make();
      const qrGif = qr.createDataURL(8, 4).split(",")[1];
      const office = (await notifySettings(db)).emails[0];
      try {
        await sendLinkMail(ref.operatore_email, { name: ref.name, operatore_nome: ref.operatore_nome, url, qrGif, site, replyTo: office });
      } catch (e) {
        console.error("referrer-send", e);
        return json({ error: `Invio non riuscito: ${mailError(e)}` }, 502);
      }
      const { data, error: e2 } = await db.from("rr_referrers")
        .update({ link_sent_at: new Date().toISOString(), link_sent_to: ref.operatore_email }).eq("code", code).select(REF_COLS).single();
      if (e2) throw e2;
      return json(data);
    }

    return json({ error: "Percorso sconosciuto" }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: "Errore interno" }, 500);
  }
});
