/**
 * Restores a backup written by backup.mjs into a (normally fresh) Supabase
 * project: recreates auth users, then profiles, sadhana_records, and
 * autofill_templates, remapping devotee ids wherever the auth user's id
 * couldn't be preserved.
 *
 * Safe by default: with no --confirm flag this is a DRY RUN — it reads the
 * backup, reports exactly what it would create/skip, and writes nothing.
 * Nothing is created until you pass --confirm. Matches the dry-run-first
 * convention used by merge-duplicate-emails.mjs in this folder.
 *
 * Usage:
 *   node scripts/admin/restore.mjs backups/2026-09-24T18-27-57-867Z            # dry run
 *   node scripts/admin/restore.mjs backups/2026-09-24T18-27-57-867Z --confirm  # apply
 *
 * Idempotent: safe to re-run after a partial failure. Anything already
 * present (an auth user with the same id or email, a profile with the same
 * id, a sadhana_records row with the same id, an autofill_templates row
 * for the same devotee_id) is skipped rather than erroring or duplicating.
 *
 * IDs: the Admin API is asked to recreate each user with their original id
 * (some Supabase projects honor this, some silently assign a new one — this
 * script checks the actual result rather than assuming either way). Where
 * the id could not be preserved, every dependent row (profiles.id,
 * sadhana_records.devotee_id, autofill_templates.devotee_id) is remapped
 * to the new id automatically — nothing is inserted under a stale id.
 *
 * total_mala on sadhana_records is a generated column (schema.sql section
 * 2: `generated always as (mala_on_asan + mala_without_asan) stored`) — a
 * plain INSERT is not allowed to specify it, so it's stripped from every
 * row before insert and Postgres recomputes it, identically, on its own.
 *
 * Admin roles: profiles are only ever INSERTed here, never UPDATEd (rows
 * that already exist are skipped, not overwritten) — so
 * prevent_role_self_escalation (schema.sql section 9), which only fires
 * `before update on profiles`, never runs during a restore. A profile
 * backed up with role = 'admin' is inserted with role = 'admin' directly,
 * with no trigger in the way.
 *
 * Passwords are never restorable (Supabase never exposes them, backed up
 * or not) — every recreated user gets a random, immediately-discarded
 * temporary password purely to satisfy the Admin API's required field. It
 * is not logged, printed, or saved anywhere. See the warning this script
 * prints at the end for what to do about that.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import crypto from "node:crypto";
import { supabaseAdmin } from "./_client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const backupArg = args.find((a) => !a.startsWith("--"));

if (!backupArg) {
  console.error("Usage: node scripts/admin/restore.mjs <backup-folder> [--confirm]");
  process.exit(1);
}

const backupDir = path.resolve(backupArg);

function readJson(file) {
  const full = path.join(backupDir, file);
  if (!existsSync(full)) {
    console.error(`Missing ${file} in ${backupDir} — is this a valid backup.mjs output folder?`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(full, "utf8"));
}

function randomTempPassword() {
  return crypto.randomBytes(24).toString("base64url");
}

/** Creates one auth user, preferring to keep its original id. Returns { finalId, created, reused }. */
async function restoreAuthUser(backedUpUser) {
  const { id: oldId, email, user_metadata } = backedUpUser;

  // Already restored under this exact id? Nothing to do.
  const { data: byId } = await supabaseAdmin.auth.admin.getUserById(oldId);
  if (byId?.user) {
    return { oldId, finalId: oldId, created: false, reused: "id" };
  }

  // Not under this id — maybe already re-created (e.g. a previous partial
  // restore, or the person re-registered by hand) under a different id
  // but the same email. Don't create a duplicate account for them.
  const existingByEmail = await findAuthUserByEmail(email);
  if (existingByEmail) {
    return { oldId, finalId: existingByEmail.id, created: false, reused: "email" };
  }

  if (!CONFIRM) {
    return { oldId, finalId: oldId, created: true, reused: null, dryRun: true };
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    id: oldId, // honored on some projects; verified below rather than assumed
    email,
    password: randomTempPassword(),
    email_confirm: true,
    user_metadata,
  });
  if (error) {
    // A handful of projects reject a caller-supplied id outright — retry
    // once without it rather than failing the whole user.
    if (/id/i.test(error.message ?? "")) {
      const retry = await supabaseAdmin.auth.admin.createUser({
        email,
        password: randomTempPassword(),
        email_confirm: true,
        user_metadata,
      });
      if (retry.error) throw retry.error;
      return { oldId, finalId: retry.data.user.id, created: true, reused: null };
    }
    throw error;
  }

  return { oldId, finalId: data.user.id, created: true, reused: null };
}

/** listUsers has no email filter, so page through — fine at this app's scale. */
async function findAuthUserByEmail(email) {
  const perPage = 1000;
  let page = 1;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function existingIds(table, column, ids) {
  if (ids.length === 0) return new Set();
  const { data, error } = await supabaseAdmin.from(table).select(column).in(column, ids);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r[column]));
}

async function main() {
  const manifest = readJson("manifest.json");
  const authUsers = readJson("auth_users.json");
  const profiles = readJson("profiles.json");
  const sadhanaRecords = readJson("sadhana_records.json");
  const autofillTemplates = readJson("autofill_templates.json");

  console.log(`Backup from ${manifest.createdAt} (${manifest.supabaseUrl})`);
  console.log(
    `Contains: ${authUsers.length} auth users, ${profiles.length} profiles, ` +
      `${sadhanaRecords.length} sadhana_records, ${autofillTemplates.length} autofill_templates`,
  );
  console.log(CONFIRM ? "\nAPPLYING — this will create real records.\n" : "\nDRY RUN — pass --confirm to actually restore.\n");

  // ---- 1. Auth users, building the old-id -> final-id map ----
  const idMap = new Map();
  let usersCreated = 0;
  let usersReused = 0;
  for (const user of authUsers) {
    const result = await restoreAuthUser(user);
    idMap.set(result.oldId, result.finalId);
    if (result.created) usersCreated += 1;
    else usersReused += 1;
    const note = result.reused === "email" ? " (matched existing account by email, not id)" : result.finalId !== result.oldId ? ` (id remapped: ${result.oldId} -> ${result.finalId})` : "";
    console.log(`  auth user ${user.email}: ${result.created ? (CONFIRM ? "created" : "would create") : "already exists, skipped"}${note}`);
  }

  // ---- 2. Profiles ----
  // Existence checks are plain reads — run them in dry runs too, so the
  // report accurately shows what would be skipped vs. inserted.
  const remappedProfiles = profiles.map((p) => ({ ...p, id: idMap.get(p.id) ?? p.id }));
  const existingProfileIds = await existingIds("profiles", "id", remappedProfiles.map((p) => p.id));
  const profilesToInsert = remappedProfiles.filter((p) => !existingProfileIds.has(p.id));

  if (CONFIRM && profilesToInsert.length) {
    const { error } = await supabaseAdmin.from("profiles").insert(profilesToInsert);
    if (error) throw error;
  }

  // ---- 3. Sadhana records (strip the generated total_mala column) ----
  const remappedSadhana = sadhanaRecords.map(({ total_mala: _totalMala, devotee_id, ...rest }) => ({
    ...rest,
    devotee_id: idMap.get(devotee_id) ?? devotee_id,
  }));
  const existingSadhanaIds = await existingIds("sadhana_records", "id", remappedSadhana.map((r) => r.id));
  const sadhanaToInsert = remappedSadhana.filter((r) => !existingSadhanaIds.has(r.id));

  if (CONFIRM && sadhanaToInsert.length) {
    const { error } = await supabaseAdmin.from("sadhana_records").insert(sadhanaToInsert);
    if (error) throw error;
  }

  // ---- 4. Autofill templates (devotee_id is the primary key itself) ----
  const remappedAutofill = autofillTemplates.map((t) => ({ ...t, devotee_id: idMap.get(t.devotee_id) ?? t.devotee_id }));
  const existingAutofillIds = await existingIds("autofill_templates", "devotee_id", remappedAutofill.map((t) => t.devotee_id));
  const autofillToInsert = remappedAutofill.filter((t) => !existingAutofillIds.has(t.devotee_id));

  if (CONFIRM && autofillToInsert.length) {
    const { error } = await supabaseAdmin.from("autofill_templates").insert(autofillToInsert);
    if (error) throw error;
  }

  // ---- Summary + audit trail ----
  const summary = {
    restoredAt: new Date().toISOString(),
    backupDir,
    applied: CONFIRM,
    authUsers: { created: usersCreated, reused: usersReused },
    profiles: { inserted: CONFIRM ? profilesToInsert.length : 0, skippedExisting: existingProfileIds.size, wouldInsert: profilesToInsert.length },
    sadhanaRecords: { inserted: CONFIRM ? sadhanaToInsert.length : 0, skippedExisting: existingSadhanaIds.size, wouldInsert: sadhanaToInsert.length },
    autofillTemplates: { inserted: CONFIRM ? autofillToInsert.length : 0, skippedExisting: existingAutofillIds.size, wouldInsert: autofillToInsert.length },
    idMap: Object.fromEntries(idMap),
  };

  const reportsDir = path.join(__dirname, "reports", "restore");
  mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  console.log("\nSummary:");
  console.log(`  auth users:         ${usersCreated} ${CONFIRM ? "created" : "would create"}, ${usersReused} already existed`);
  console.log(`  profiles:           ${profilesToInsert.length} ${CONFIRM ? "inserted" : "would insert"}, ${existingProfileIds.size} already existed`);
  console.log(`  sadhana_records:    ${sadhanaToInsert.length} ${CONFIRM ? "inserted" : "would insert"}, ${existingSadhanaIds.size} already existed`);
  console.log(`  autofill_templates: ${autofillToInsert.length} ${CONFIRM ? "inserted" : "would insert"}, ${existingAutofillIds.size} already existed`);
  console.log(`\nFull report (including the id remap table): ${reportPath}`);

  if (!CONFIRM) {
    console.log("\nThis was a DRY RUN — nothing was created. Re-run with --confirm to apply.");
    return;
  }

  console.log(
    "\n" +
      "=".repeat(70) +
      "\nIMPORTANT: every restored user was given a random temporary password\n" +
      "that was never logged or saved anywhere — nobody can log in with it.\n" +
      "Every one of them must reset their password before they can access\n" +
      "their account again, via the app's own \"Forgot password\" flow, using\n" +
      "the exact email address this backup recorded for them.\n" +
      "=".repeat(70),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
