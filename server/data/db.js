import { createHash, randomBytes } from "node:crypto";
import { supabase } from "../services/supabase.js";

// Accesso al database Supabase. Il client usa la chiave secret: valida sempre i dati prima.

function db() {
  if (!supabase) throw new Error("DATABASE_NOT_CONFIGURED");
  return supabase;
}

const unwrap = ({ data, error }, context) => {
  if (error) throw new Error(`${context}: ${error.message}`);
  return data;
};

const isEmailTaken = (error) =>
  error.code === "email_exists" || /already (been )?registered/i.test(error.message);

// ───────────── Utenti e profili ─────────────

/** Id dell'utente registrato con questa email, oppure null. */
export async function findUserIdByEmail(email) {
  return unwrap(
    await db().rpc("utente_id_per_email", { p_email: email }),
    "ricerca utente"
  );
}

/**
 * Crea l'utente con la password scelta dal cliente. Il profilo (nome, cognome,
 * cellulare, referente) nasce dal trigger del database.
 * @returns {Promise<{userId: string, created: boolean}>} created false se l'email era già registrata
 */
export async function createUser({ email, password, nome, cognome, cellulare, referralId }) {
  const { data, error } = await db().auth.admin.createUser({
    email,
    password,
    email_confirm: true, // l'email è confermata dal link di attivazione
    user_metadata: { nome, cognome, cellulare, referral_id: referralId },
  });
  if (!error) return { userId: data.user.id, created: true };
  if (isEmailTaken(error)) {
    const id = await findUserIdByEmail(email);
    if (id) return { userId: id, created: false };
  }
  throw new Error(`creazione utente: ${error.message}`);
}

export async function getProfilo(userId) {
  return unwrap(
    await db()
      .from("profili")
      .select("nome, cognome, cellulare, referral_id")
      .eq("id", userId)
      .maybeSingle(),
    "lettura profilo"
  );
}

/** Imposta la nuova password del cliente. */
export async function updatePassword(userId, password) {
  unwrap(await db().auth.admin.updateUserById(userId, { password }), "aggiornamento password");
}

// ───────────── Link di attivazione ─────────────

const ACTIVATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

/** Crea un link di attivazione per l'email e restituisce il token in chiaro (solo per l'email). */
export async function createActivation(email) {
  const token = randomBytes(32).toString("base64url");
  unwrap(
    await db().from("attivazioni").insert({
      token_hash: hashToken(token),
      email,
      expires_at: new Date(Date.now() + ACTIVATION_TTL_MS).toISOString(),
    }),
    "creazione attivazione"
  );
  return token;
}

/** Attivazione valida (non usata, non scaduta) oppure null. */
export async function findActivation(token) {
  const row = unwrap(
    await db()
      .from("attivazioni")
      .select("token_hash, email, expires_at, used_at")
      .eq("token_hash", hashToken(token))
      .maybeSingle(),
    "lettura attivazione"
  );
  if (!row || row.used_at || new Date(row.expires_at) <= new Date()) return null;
  return row;
}

/** Segna il link come usato. false se nel frattempo è stato usato da un'altra richiesta. */
export async function claimActivation(token) {
  const rows = unwrap(
    await db()
      .from("attivazioni")
      .update({ used_at: new Date().toISOString() })
      .eq("token_hash", hashToken(token))
      .is("used_at", null)
      .select("token_hash"),
    "uso attivazione"
  );
  return rows.length > 0;
}

export async function releaseActivation(token) {
  unwrap(
    await db().from("attivazioni").update({ used_at: null }).eq("token_hash", hashToken(token)),
    "ripristino attivazione"
  );
}

// ───────────── Richieste ─────────────

export async function findRichiestaByIdempotencyKey(key) {
  return unwrap(
    await db().from("richieste").select().eq("idempotency_key", key).maybeSingle(),
    "lettura richiesta"
  );
}

/**
 * Inserisce la richiesta. Se la stessa Idempotency-Key è già stata usata
 * restituisce la richiesta esistente con duplicate: true.
 */
export async function insertRichiesta(row) {
  const { data, error } = await db().from("richieste").insert(row).select().single();
  if (!error) return { richiesta: data, duplicate: false };
  if (error.code === "23505" && row.idempotency_key) {
    const existing = await findRichiestaByIdempotencyKey(row.idempotency_key);
    if (existing) return { richiesta: existing, duplicate: true };
  }
  throw new Error(`salvataggio richiesta: ${error.message}`);
}

export async function getRichiesta(id) {
  return unwrap(
    await db().from("richieste").select().eq("id", id).maybeSingle(),
    "lettura richiesta"
  );
}

/** Ultima richiesta fatta con questa email e non ancora collegata a un account. */
export async function findUltimaRichiestaInAttesa(email) {
  return unwrap(
    await db()
      .from("richieste")
      .select("nome, cognome, referral_id")
      .eq("email", email.toLowerCase())
      .is("user_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    "lettura richiesta in attesa"
  );
}

/** Collega all'utente le richieste fatte con la sua email prima dell'attivazione. */
export async function linkRichiesteInAttesa(email, userId) {
  return unwrap(
    await db()
      .from("richieste")
      .update({ user_id: userId, stato: "in_elaborazione" })
      .is("user_id", null)
      .eq("email", email.toLowerCase())
      .select(),
    "collegamento richieste"
  );
}

/** Richieste da inviare a devops (es. server riavviato prima dell'invio). */
export async function listRichiesteDaInviare() {
  return unwrap(
    await db()
      .from("richieste")
      .select()
      .eq("stato", "in_elaborazione")
      .is("inviata_devops_at", null),
    "lettura richieste da inviare"
  );
}

export async function updateRichiesta(id, changes) {
  return unwrap(
    await db().from("richieste").update(changes).eq("id", id).select().single(),
    "aggiornamento richiesta"
  );
}

export async function saveRisultato(row) {
  unwrap(await db().from("risultati").upsert(row), "salvataggio risultato");
}

/** Registra l'esito di un invio. Non blocca mai il flusso se il log fallisce. */
export async function logEmail(row) {
  const { error } = await db().from("email_inviate").insert(row);
  if (error) console.error("[db] registro email non salvato:", error.message);
}
