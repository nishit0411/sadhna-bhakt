/**
 * Step 2 — migrates real data off duplicate accounts onto the kept
 * account, then deletes the duplicate auth.users (profiles rows cascade).
 *
 * Safe by default: with no flags this is a DRY RUN — it prints exactly
 * what it would migrate/delete and changes nothing. Nothing is deleted
 * until you pass --confirm.
 *
 * Usage:
 *   node scripts/admin/merge-duplicate-emails.mjs                # dry run, all duplicate emails
 *   node scripts/admin/merge-duplicate-emails.mjs --email=a@b.com # dry run, just one email
 *   node scripts/admin/merge-duplicate-emails.mjs --confirm       # actually apply
 *
 * Before deleting an account, every row that would otherwise be lost
 * (sadhana_records / autofill_templates rows that couldn't be migrated
 * because the kept account already has one for that date, plus the raw
 * auth user + profile row) is written to scripts/admin/reports/deleted/
 * as a JSON audit file first.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { supabaseAdmin } from "./_client.mjs";
import { findDuplicateEmailGroups, formatGroupReport } from "./_duplicates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const ONLY_EMAIL = args.find((a) => a.startsWith("--email="))?.split("=")[1]?.trim().toLowerCase();

/** Moves as many sadhana_records as possible from `fromId` to `toId`. */
async function migrateSadhanaRecords(fromId, toId) {
  const { data: fromRecords, error } = await supabaseAdmin
    .from("sadhana_records")
    .select("*")
    .eq("devotee_id", fromId);
  if (error) throw error;
  if (!fromRecords?.length) return { migrated: 0, leftBehind: [] };

  const { data: toRecords, error: toError } = await supabaseAdmin
    .from("sadhana_records")
    .select("date")
    .eq("devotee_id", toId);
  if (toError) throw toError;
  const toDates = new Set((toRecords ?? []).map((r) => r.date));

  let migrated = 0;
  const leftBehind = [];
  for (const record of fromRecords) {
    if (toDates.has(record.date)) {
      // Kept account already has a record for this date — don't overwrite
      // real data with a guess. Preserve the orphaned duplicate in the
      // audit dump instead of silently dropping it.
      leftBehind.push(record);
      continue;
    }
    if (CONFIRM) {
      const { error: updateError } = await supabaseAdmin
        .from("sadhana_records")
        .update({ devotee_id: toId })
        .eq("id", record.id);
      if (updateError) throw updateError;
    }
    migrated += 1;
  }
  return { migrated, leftBehind };
}

/** Moves the autofill_templates row from `fromId` to `toId` if `toId` doesn't already have one. */
async function migrateAutofillTemplate(fromId, toId) {
  const { data: fromTemplate, error } = await supabaseAdmin
    .from("autofill_templates")
    .select("*")
    .eq("devotee_id", fromId)
    .maybeSingle();
  if (error) throw error;
  if (!fromTemplate) return { migrated: false, leftBehind: null };

  const { data: toTemplate, error: toError } = await supabaseAdmin
    .from("autofill_templates")
    .select("devotee_id")
    .eq("devotee_id", toId)
    .maybeSingle();
  if (toError) throw toError;

  if (toTemplate) {
    return { migrated: false, leftBehind: fromTemplate };
  }
  if (CONFIRM) {
    const { error: updateError } = await supabaseAdmin
      .from("autofill_templates")
      .update({ devotee_id: toId })
      .eq("devotee_id", fromId);
    if (updateError) throw updateError;
  }
  return { migrated: true, leftBehind: null };
}

async function processGroup(group, auditDir) {
  console.log(formatGroupReport(group));

  for (const dup of group.remove) {
    const sadhana = await migrateSadhanaRecords(dup.id, group.keep.id);
    const autofill = await migrateAutofillTemplate(dup.id, group.keep.id);

    console.log(
      `  -> ${CONFIRM ? "migrated" : "would migrate"} ${sadhana.migrated} sadhana_records, ` +
        `${autofill.migrated ? 1 : 0} autofill_template from ${dup.id} to ${group.keep.id}` +
        (sadhana.leftBehind.length || autofill.leftBehind
          ? ` (${sadhana.leftBehind.length} record(s) + ${autofill.leftBehind ? 1 : 0} template kept-account already had, will be audit-dumped)`
          : ""),
    );

    const audit = {
      email: group.email,
      keptAccountId: group.keep.id,
      deletedAccountId: dup.id,
      deletedAuthUser: { id: dup.id, email: dup.email, createdAt: dup.createdAt, emailConfirmedAt: dup.emailConfirmedAt },
      deletedProfile: dup.profile,
      unmigratedSadhanaRecords: sadhana.leftBehind,
      unmigratedAutofillTemplate: autofill.leftBehind,
    };
    mkdirSync(auditDir, { recursive: true });
    writeFileSync(path.join(auditDir, `${dup.id}.json`), JSON.stringify(audit, null, 2));

    if (CONFIRM) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(dup.id);
      if (deleteError) throw deleteError;
      console.log(`  -> deleted auth user ${dup.id} (profile row cascaded)`);
    } else {
      console.log(`  -> DRY RUN: would delete auth user ${dup.id}`);
    }
  }
}

async function main() {
  const groups = (await findDuplicateEmailGroups()).filter((g) => !ONLY_EMAIL || g.email === ONLY_EMAIL);

  if (groups.length === 0) {
    console.log(ONLY_EMAIL ? `No duplicate accounts found for ${ONLY_EMAIL}.` : "No duplicate emails found. Nothing to do.");
    return;
  }

  console.log(
    CONFIRM
      ? `APPLYING changes for ${groups.length} duplicate email(s). This will migrate data and delete accounts.`
      : `DRY RUN for ${groups.length} duplicate email(s) — no changes will be made. Pass --confirm to apply.`,
  );

  const auditDir = path.join(__dirname, "reports", "deleted", new Date().toISOString().replace(/[:.]/g, "-"));
  for (const group of groups) {
    await processGroup(group, auditDir);
  }

  console.log(`\nDone. Audit dumps for anything deleted/left behind are under ${auditDir}`);
  if (!CONFIRM) {
    console.log("This was a dry run — nothing was changed. Re-run with --confirm to apply.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
