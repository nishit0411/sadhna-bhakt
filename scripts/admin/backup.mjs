/**
 * Exports every row this app owns — auth.users (the fields needed to
 * recreate an account) plus profiles, sadhana_records, autofill_templates
 * — into a timestamped JSON folder under backups/. Read-only: never writes
 * to Supabase, only to local disk.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin/backup.mjs
 *
 * Output: backups/<utc-timestamp>/{auth_users,profiles,sadhana_records,autofill_templates,manifest}.json
 * Every run gets its own folder, so a later backup can never overwrite an
 * earlier one — including a bad backup (wrong project, half-empty export)
 * landing on top of a good one. Folders are ~20 KB each; prune old ones by
 * hand if they ever add up.
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

  // Full UTC timestamp with ':' and '.' swapped for '-', so it's a legal
  // folder name everywhere — same convention as scripts/admin/reports/.
  // Sorts chronologically as plain text, which is what the backup workflow
  // relies on to find the folder this run just wrote.
  const stamp = new Date().toISOString().replace(/[:.]/g, "-"); // 2026-09-24T07-42-08-131Z
  const outDir = path.join(__dirname, "..", "..", "backups", stamp);
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
      "backups/ is gitignored — keep it that way. Copies are pushed off this machine\n" +
      "daily by .github/workflows/backup.yml; a local run like this one stays on this\n" +
      "disk until you copy it somewhere yourself. Passwords are never included —\n" +
      "Supabase never exposes them, backed up or not.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
