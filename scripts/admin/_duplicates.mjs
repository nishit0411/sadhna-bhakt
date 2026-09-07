/**
 * Shared duplicate-detection logic used by both find-duplicate-emails.mjs
 * (report only) and merge-duplicate-emails.mjs (report + act). Kept in one
 * place so the script that deletes accounts can never disagree with the
 * script that reported them.
 */
import { supabaseAdmin, listAllAuthUsers } from "./_client.mjs";

/** Fields on `profiles` counted toward "most complete profile". */
const COMPLETENESS_FIELDS = [
  "first_name",
  "last_name",
  "date_of_birth",
  "spiritual_name",
  "gurudev_name",
  "diksha_stage",
  "initiation_date",
  "initiation_year",
  "sex",
  "city",
  "mentor_other",
  "mobile_number",
  "centre",
];

function isFilled(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function completenessScore(profile) {
  if (!profile) return -1;
  let score = COMPLETENESS_FIELDS.reduce((sum, field) => sum + (isFilled(profile[field]) ? 1 : 0), 0);
  if (isFilled(profile.mentor_names)) score += 1;
  return score;
}

/**
 * Groups auth.users by lower-cased, trimmed email. Returns only groups
 * with 2+ accounts, each entry enriched with its profile row, real usage
 * counts (sadhana_records / autofill_templates), and a completeness score
 * — everything needed to decide which account is "primary" without
 * guessing.
 */
export async function findDuplicateEmailGroups() {
  const authUsers = await listAllAuthUsers();

  const byEmail = new Map();
  for (const user of authUsers) {
    if (!user.email) continue;
    const key = user.email.trim().toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key).push(user);
  }

  const duplicateEmails = [...byEmail.entries()].filter(([, users]) => users.length > 1);
  if (duplicateEmails.length === 0) return [];

  const allIds = duplicateEmails.flatMap(([, users]) => users.map((u) => u.id));

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .in("id", allIds);
  if (profilesError) throw profilesError;
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: sadhanaCounts, error: sadhanaError } = await supabaseAdmin
    .from("sadhana_records")
    .select("devotee_id")
    .in("devotee_id", allIds);
  if (sadhanaError) throw sadhanaError;
  const sadhanaCountById = new Map();
  for (const row of sadhanaCounts ?? []) {
    sadhanaCountById.set(row.devotee_id, (sadhanaCountById.get(row.devotee_id) ?? 0) + 1);
  }

  const { data: autofillRows, error: autofillError } = await supabaseAdmin
    .from("autofill_templates")
    .select("devotee_id")
    .in("devotee_id", allIds);
  if (autofillError) throw autofillError;
  const hasAutofillById = new Set((autofillRows ?? []).map((r) => r.devotee_id));

  const groups = duplicateEmails.map(([email, users]) => {
    const candidates = users.map((user) => {
      const profile = profileById.get(user.id) ?? null;
      return {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        emailConfirmedAt: user.email_confirmed_at ?? null,
        lastSignInAt: user.last_sign_in_at ?? null,
        profile,
        completeness: completenessScore(profile),
        sadhanaRecordCount: sadhanaCountById.get(user.id) ?? 0,
        hasAutofillTemplate: hasAutofillById.has(user.id),
      };
    });

    // Ranking: real Sadhana usage first (never orphan actual devotional
    // records), then a fuller profile, then a confirmed email, then the
    // oldest account as the final tiebreaker — matches "oldest/primary
    // account with the most complete and valid profile information".
    const ranked = [...candidates].sort((a, b) => {
      if (a.sadhanaRecordCount !== b.sadhanaRecordCount) return b.sadhanaRecordCount - a.sadhanaRecordCount;
      if (a.completeness !== b.completeness) return b.completeness - a.completeness;
      const aConfirmed = a.emailConfirmedAt ? 1 : 0;
      const bConfirmed = b.emailConfirmedAt ? 1 : 0;
      if (aConfirmed !== bConfirmed) return bConfirmed - aConfirmed;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    const [keep, ...remove] = ranked;
    return { email, keep, remove, all: candidates };
  });

  return groups;
}

export function formatGroupReport(group) {
  const lines = [];
  lines.push(`\nEmail: ${group.email} (${group.all.length} accounts)`);
  for (const c of group.all) {
    const tag = c.id === group.keep.id ? "KEEP  " : "DELETE";
    lines.push(
      `  [${tag}] id=${c.id}\n` +
        `           created_at=${c.createdAt}  email_confirmed=${Boolean(c.emailConfirmedAt)}  last_sign_in=${c.lastSignInAt ?? "never"}\n` +
        `           profile_id=${c.profile?.id ?? "MISSING"}  completeness=${c.completeness}  name="${
          c.profile ? `${c.profile.first_name} ${c.profile.last_name}`.trim() : ""
        }"\n` +
        `           sadhana_records=${c.sadhanaRecordCount}  autofill_template=${c.hasAutofillTemplate}`,
    );
  }
  return lines.join("\n");
}
