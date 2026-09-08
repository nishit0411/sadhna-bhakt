import { supabaseAdmin, requireAdmin } from "../_supabaseAdmin.js";

/**
 * POST /api/admin/mentors -> create a real Supabase Auth account for a
 * mentor, with a password the admin sets directly.
 *
 * This is the one mentor-management operation that genuinely needs the
 * service-role key: auth.admin.createUser() is privileged (it sets a
 * password directly and skips email confirmation), so it can't run from
 * the browser with the anon key. Everything else about mentor management
 * — listing mentors, editing a mentor's name/mobile, activating/
 * deactivating, reassigning a devotee's mentor_id — goes through the
 * ordinary anon-key client, because RLS's admin policies already allow
 * all of that; adding a second privileged path for them would just be
 * more attack surface for no reason.
 *
 * Deliberately does NOT let the client set `role` via raw_user_meta_data
 * (handle_new_user() never reads a role out of signup metadata, on
 * purpose — see schema.sql section 5). Instead: create the account like
 * any other signup, let the trigger create a normal 'devotee' profile,
 * then explicitly promote that one row to role = 'mentor' with the
 * service-role client, server-side, only reachable by an already-verified
 * admin.
 */
export default async function handler(req, res) {
  const { error } = await requireAdmin(req);
  if (error) return res.status(error.status).json({ error: error.message });

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { firstName, lastName, email, password, mobileNumber } = req.body ?? {};
  if (!firstName?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: "First name, email, and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: {
        first_name: firstName.trim(),
        last_name: lastName?.trim() || "",
        mobile_number: mobileNumber?.trim() || null,
      },
    });
    if (createError) throw createError;

    const { data: profile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "mentor", active: true })
      .eq("id", data.user.id)
      .select()
      .single();
    if (updateError) throw updateError;

    return res.status(200).json({ mentor: profile });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to create mentor account." });
  }
}
