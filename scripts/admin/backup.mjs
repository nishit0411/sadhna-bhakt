/**
 * Exports every row this app owns — auth.users (the fields needed to
 * recreate an account) plus profiles, sadhana_records, autofill_templates
 * — into a timestamped JSON folder under backups/. Read-only: never writes
 * to Supabase, only to local disk.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin/backup.mjs
 *
 * Output: backups/YYYY-MM-DD/{auth_users,profiles,sadhana_records,autofill_templates,manifest}.json
 * Re-running on the same day overwrites that day's folder — run once a day
 * at most, or copy the folder aside first if you want to keep more than
 * one snapshot per day.
 *
 * JSON (not CSV) so array columns (mentor_names, granth_read,
 * harikatha_sources) and the nested user_metadata object survive intact —
 * see restore.mjs, which reads back exactly this shape.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { supabaseAdmin, listAllAuthUsers } from "./_client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Pages through every row of a table — safe even once row counts grow past one page. */
async function fetchAllRows(table) {
  const pageSize = 1000;
  let from = 0;
  const rows = [];
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("*")
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function main() {
  console.log("Backing up auth.users, profiles, sadhana_records, autofill_templates...\n");

  const authUsers = await listAllAuthUsers();
  // Only the fields handle_new_user() (supabase/schema.sql section 5) and
  // restore.mjs actually need to recreate an equivalent account — not the
  // full internal GoTrue user object (identities, app_metadata, etc.).
  const authUsersExport = authUsers.map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    email_confirmed_at: u.email_confirmed_at ?? null,
    user_metadata: u.user_metadata ?? {},
  }));

  const [profiles, sadhanaRecords, autofillTemplates] = await Promise.all([
    fetchAllRows("profiles"),
    fetchAllRows("sadhana_records"),
    fetchAllRows("autofill_templates"),
  ]);

  const dateStamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
  const outDir = path.join(__dirname, "..", "..", "backups", dateStamp);
  mkdirSync(outDir, { recursive: true });

  const manifest = {
    createdAt: new Date().toISOString(),
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    counts: {
      auth_users: authUsersExport.length,
      profiles: profiles.length,
      sadhana_records: sadhanaRecords.length,
      autofill_templates: autofillTemplates.length,
    },
  };

  writeFileSync(path.join(outDir, "auth_users.json"), JSON.stringify(authUsersExport, null, 2));
  writeFileSync(path.join(outDir, "profiles.json"), JSON.stringify(profiles, null, 2));
  writeFileSync(path.join(outDir, "sadhana_records.json"), JSON.stringify(sadhanaRecords, null, 2));
  writeFileSync(path.join(outDir, "autofill_templates.json"), JSON.stringify(autofillTemplates, null, 2));
  writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log("Row counts:");
  for (const [table, count] of Object.entries(manifest.counts)) {
    console.log(`  ${table}: ${count}`);
  }
  console.log(`\nBackup written to ${outDir}`);
  console.log(
    "\nReminder: this backup contains real user data (names, emails, Sadhana history).\n" +
      "backups/ is gitignored — keep it that way, and store copies somewhere durable\n" +
      "(off this machine) if you want protection against more than an accidental\n" +
      "`git rm`. Passwords are never included — Supabase never exposes them, backed\n" +
      "up or not.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
