// Risk Radar: crea (o reimposta) un account della dashboard /risk-radar/admin.
//   npm run rr:admin-user -- <nome-utente> [password]
// Senza password ne genera una casuale. Stampa la password (da passare all'amministratore)
// e l'SQL da eseguire nel SQL Editor di Supabase: nel database finisce solo l'hash.
// L'hash è lo stesso che verifica supabase/functions/risk-radar-admin/index.ts (PBKDF2-SHA256).
import { pbkdf2Sync, randomBytes, randomInt } from "node:crypto";

const ITERATIONS = 210_000;
const [rawUser, givenPassword] = process.argv.slice(2);
const username = (rawUser ?? "").trim().toLowerCase();

if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
  console.error("Uso: npm run rr:admin-user -- <nome-utente> [password]");
  console.error("Nome utente: 3-40 caratteri tra a-z, 0-9, punto, trattino, trattino basso.");
  process.exit(1);
}
if (givenPassword !== undefined && givenPassword.length < 12) {
  console.error("La password deve avere almeno 12 caratteri.");
  process.exit(1);
}

// Senza caratteri che si confondono (0/O, 1/l/I), a gruppi di 4: facile da dettare.
const ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const generate = () =>
  Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).join("-");

const password = givenPassword ?? generate();
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, "sha256");
const stored = `pbkdf2_sha256$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;

console.log(`
Nome utente: ${username}
Password:    ${password}

-- SQL da eseguire in Supabase (SQL Editor). Se l'utente esiste già, la password viene
-- cambiata, il blocco tolto e le sessioni aperte chiuse.
insert into rr_admin_users (username, password_hash)
values ('${username}', '${stored}')
on conflict (username) do update
  set password_hash = excluded.password_hash, active = true, failed_attempts = 0, locked_until = null;
delete from rr_admin_sessions where username = '${username}';
`);
