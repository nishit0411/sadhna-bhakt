import { supabaseAdmin, requireAdmin } from "../_supabaseAdmin.js";
import { dobToPassword } from "../../src/utils/dateHelpers.js";

/**
 * POST /api/admin/mentors -> creates a mentor account.
 *
 * Two separate steps, deliberately: auth.admin.createUser() first (service
 * role, never reaches the browser), then a plain `profiles` update setting
 * role='mentor'. handle_new_user() never reads `role` out of signup
 * metadata for exactly this reason — a public self-registration can never
 * assign itself a privileged role, only this admin-only endpoint can.
 * Password is always the mentor's own date of birth (DDMMYYYY), shown once
 * in the response — never stored anywhere afterward.
 */
export default async function handler(req, res) {
  const { error, adminUser: _adminUser } = await requireAdmin(req);
  if (error) return res.status(error.status).json({ error: error.message });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { email, firstName, lastName, dob } = req.body ?? {};
  if (!email || !firstName || !lastName || !dob) {
    return res.status(400).json({ error: "email, firstName, lastName and dob are all required." });
  }

  const password = dobToPassword(dob);

  try {
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, date_of_birth: dob },
    });
    if (createError) throw createError;

    const { data: updated, error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "mentor", active: true })
      .eq("id", data.user.id)
      .select("role")
      .single();
    if (profileError) throw profileError;

    // Defense against the exact failure mode schema.sql §17 fixes:
    // prevent_role_self_escalation() silently reverting this update
    // instead of erroring. Confirming the write actually landed turns any
    // regression of that trigger back into a loud, diagnosable failure
    // instead of a half-created account nobody notices.
    if (updated.role !== "mentor") {
      throw new Error(
        `Mentor account created but role is "${updated.role}", not "mentor" — the profiles_prevent_role_escalation trigger may be reverting this update again. Check schema.sql §17 is applied.`,
      );
    }

    // Auto-link legacy devotees whose old mentor_names free-select exactly
    // matches this mentor's name — same matching rule as
    // scripts/admin/mentor-backfill-report.mjs (exactly one value, not
    // "Other"), now applied automatically at creation time. Scoped to
    // mentor_id.is.null only, so an already-assigned devotee (however that
    // happened) is never touched or reassigned. A failure here doesn't fail
    // the mentor creation itself, which already fully succeeded above.
    let autoLinkedCount = 0;
    try {
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const { data: candidates, error: candidatesError } = await supabaseAdmin
        .from("profiles")
        .select("id, mentor_names")
        .eq("role", "devotee")
        .is("mentor_id", null);
      if (candidatesError) throw candidatesError;

      const matchedIds = (candidates ?? [])
        .filter((p) => {
          const names = p.mentor_names ?? [];
          return names.length === 1 && !names.includes("Other") && names[0].trim().toLowerCase() === fullName;
        })
        .map((p) => p.id);

      if (matchedIds.length) {
        const { error: linkError } = await supabaseAdmin.from("profiles").update({ mentor_id: data.user.id }).in("id", matchedIds);
        if (linkError) throw linkError;
        autoLinkedCount = matchedIds.length;
      }
    } catch (linkErr) {
      console.error("Mentor created but auto-link step failed:", linkErr);
    }

    return res.status(200).json({ id: data.user.id, email, password, autoLinkedCount });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to create mentor." });
  }
}
