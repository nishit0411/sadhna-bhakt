/**
 * Step 1 — REPORT ONLY. Finds auth.users accounts that share the same
 * email (case-insensitively) and shows which one would be kept vs deleted
 * by merge-duplicate-emails.mjs, and why. Makes no changes.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin/find-duplicate-emails.mjs
 *
 * Also writes a JSON copy of the report to scripts/admin/reports/ (gitignored)
 * for a paper trail before you run the merge script.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { findDuplicateEmailGroups, formatGroupReport } from "./_duplicates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const groups = await findDuplicateEmailGroups();

  if (groups.length === 0) {
    console.log("No duplicate emails found across auth.users. Nothing to do.");
    return;
  }

  console.log(`Found ${groups.length} email(s) with duplicate accounts:`);
  for (const group of groups) {
    console.log(formatGroupReport(group));
  }

  const reportsDir = path.join(__dirname, "reports");
  mkdirSync(reportsDir, { recursive: true });
  const outPath = path.join(reportsDir, `duplicates-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify(groups, null, 2));
  console.log(`\nFull report written to ${outPath}`);
  console.log(
    "\nNothing was changed. Review the KEEP/DELETE decisions above, then run merge-duplicate-emails.mjs " +
      "(dry run first, then with --confirm) to actually migrate data and remove the duplicates.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
