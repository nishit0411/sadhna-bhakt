/**
 * REPORT ONLY — makes no changes. Shows how existing devotees' legacy
 * `profiles.mentor_names` (the old free-select checkbox from Register.jsx)
 * would map onto real mentor profiles' `mentor_id`, so the one-time
 * backfill can be reviewed before anything is written.
 *
 * Requires schema.sql §16 (profiles.mentor_id, role='mentor') to already be
 * live, and at least one mentor profile created via the admin Mentor
 * Management page — matching is done by exact (case-insensitive) name
 * against those real mentor profiles, not against the old hardcoded
 * MENTOR_OPTIONS list.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/admin/mentor-backfill-report.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { supabaseAdmin } from "./_client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, email, first_name, last_name, mentor_names, mentor_other, mentor_id")
    .eq("role", "devotee");
  if (profilesError) throw profilesError;

  const { data: mentors, error: mentorsError } = await supabaseAdmin.from("profiles").select("id, first_name, last_name").eq("role", "mentor");
  if (mentorsError) throw mentorsError;

  const mentorByName = new Map(mentors.map((m) => [`${m.first_name} ${m.last_name}`.trim().toLowerCase(), m.id]));

  const alreadyAssigned = [];
  const nothingToBackfill = [];
  const matched = [];
  const unmatched = [];
  const ambiguous = [];

  for (const p of profiles) {
    const name = `${p.first_name} ${p.last_name}`.trim() || p.email;
    const names = p.mentor_names ?? [];

    if (p.mentor_id) {
      alreadyAssigned.push({ id: p.id, name });
      continue;
    }
    if (names.length === 0) {
      nothingToBackfill.push({ id: p.id, name });
      continue;
    }
    if (names.length > 1 || names.includes("Other")) {
      ambiguous.push({ id: p.id, name, mentorNames: names, mentorOther: p.mentor_other });
      continue;
    }

    const mentorId = mentorByName.get(names[0].trim().toLowerCase());
    if (mentorId) {
      matched.push({ id: p.id, name, mentorNameSelected: names[0], resolvedMentorId: mentorId });
    } else {
      unmatched.push({ id: p.id, name, mentorNameSelected: names[0] });
    }
  }

  console.log(`Total devotee profiles: ${profiles.length}`);
  console.log(`Real mentor profiles found: ${mentors.length}`);
  console.log();
  console.log(`Already have mentor_id set (skipped): ${alreadyAssigned.length}`);
  console.log(`Nothing to backfill (no mentor ever selected): ${nothingToBackfill.length}`);
  console.log(`MATCHED (would set mentor_id): ${matched.length}`);
  matched.forEach((m) => console.log(`  - ${m.name} -> "${m.mentorNameSelected}" (mentor id ${m.resolvedMentorId})`));
  console.log(`UNMATCHED (selected name doesn't match any real mentor profile — needs a mentor created with that name, or manual review): ${unmatched.length}`);
  unmatched.forEach((m) => console.log(`  - ${m.name} -> "${m.mentorNameSelected}" (no matching mentor profile)`));
  console.log(`AMBIGUOUS (multiple mentors selected, or "Other" free text — needs manual decision): ${ambiguous.length}`);
  ambiguous.forEach((m) => console.log(`  - ${m.name} -> [${m.mentorNames.join(", ")}]${m.mentorOther ? ` (Other: "${m.mentorOther}")` : ""}`));

  const reportsDir = path.join(__dirname, "reports");
  mkdirSync(reportsDir, { recursive: true });
  const outPath = path.join(reportsDir, `mentor-backfill-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  writeFileSync(outPath, JSON.stringify({ alreadyAssigned, nothingToBackfill, matched, unmatched, ambiguous }, null, 2));
  console.log(`\nFull report written to ${outPath}`);
  console.log("\nNothing was changed. Review MATCHED above, then confirm before any UPDATE is run.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
