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

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role: "mentor", active: true })
      .eq("id", data.user.id);
    if (profileError) throw profileError;

    return res.status(200).json({ id: data.user.id, email, password });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to create mentor." });
  }
}
