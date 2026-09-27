import { supabaseAdmin, requireAdmin } from "../_supabaseAdmin.js";

/**
 * PATCH /api/admin/credentials
 *   body { userId, email }     -> changes that user's auth email
 *   body { userId, password }  -> sets that user's password
 *
 * Admin-only, re-verified server-side on every request by requireAdmin():
 * it validates the bearer token against Supabase AND re-reads role='admin'
 * from the database. Nothing about the caller is taken from the request.
 *
 * Both operations need the service-role key, which exists only in this
 * function's server environment (see ../_supabaseAdmin.js) and is never
 * part of the Vite client bundle.
 *
 * The password is received over HTTPS, handed straight to Supabase and
 * then dropped. It is never stored, echoed back, written to the audit log
 * or included in any log line — only the fact that a change happened.
 *
 * profiles.email is NOT updated here: the on_auth_user_email_changed
 * trigger (schema.sql) already mirrors auth.users.email into profiles,
 * so writing it again would duplicate that logic and risk drifting from it.
 */
export default async function handler(req, res) {
  const { error, adminUser } = await requireAdmin(req);
  if (error) return res.status(error.status).json({ error: error.message });

  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { userId, email, password } = req.body ?? {};

  if (!userId || typeof userId !== "string") {
    return res.status(400).json({ error: "Missing user id." });
  }
  // An admin editing their own credentials here would bypass the
  // re-authentication the normal Profile flow requires, so it is refused —
  // the same rule /api/admin/users applies to self-deletion.
  if (userId === adminUser.id) {
    return res.status(400).json({ error: "Use your own profile page to change your own email or password." });
  }
  if ((email && password) || (!email && !password)) {
    return res.status(400).json({ error: "Send exactly one of email or password." });
  }

  try {
    // Confirm the target actually exists before changing anything.
    const { data: target, error: targetError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (targetError || !target?.user) {
      return res.status(404).json({ error: "That user no longer exists." });
    }
    const previousEmail = target.user.email ?? null;

    let action, detail;

    if (email) {
      const clean = String(email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        return res.status(400).json({ error: "That doesn't look like a valid email address." });
      }
      if (clean === (previousEmail ?? "").toLowerCase()) {
        return res.status(400).json({ error: "That is already this user's email address." });
      }

      // auth.users also has a BEFORE UPDATE trigger enforcing this, which is
      // the real guard. Checking first only so the admin gets a clear message
      // instead of a raw constraint violation.
      const { data: existing } = await supabaseAdmin
        .from("profiles").select("id").ilike("email", clean).maybeSingle();
      if (existing && existing.id !== userId) {
        return res.status(409).json({ error: "Another account already uses that email address." });
      }

      // email_confirm: true applies the change immediately — an admin
      // correcting an address on a devotee's behalf cannot ask them to click
      // a link in an inbox they may not be able to reach.
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: clean,
        email_confirm: true,
      });
      if (updateError) throw updateError;

      action = "email_change";
      detail = `${previousEmail ?? "(none)"} -> ${clean}`;
    } else {
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, { password });
      if (updateError) throw updateError;

      action = "password_change";
      detail = null; // never record anything derived from the password
    }

    // Audit last: only a change that actually succeeded is recorded. A
    // failure to write the log must not fail the operation the admin just
    // completed, so it is caught and reported rather than thrown.
    const { error: auditError } = await supabaseAdmin.from("admin_audit_log").insert({
      admin_id: adminUser.id,
      admin_email: adminUser.email,
      target_id: userId,
      target_email: action === "email_change" ? String(email).trim().toLowerCase() : previousEmail,
      action,
      detail,
    });
    if (auditError) console.error("Credential change succeeded but audit write failed:", auditError.message);

    return res.status(200).json({
      success: true,
      action,
      email: action === "email_change" ? String(email).trim().toLowerCase() : previousEmail,
      audited: !auditError,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to update credentials." });
  }
}
