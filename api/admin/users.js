import { supabaseAdmin, requireAdmin, listAllAuthUsers } from "../_supabaseAdmin.js";

/**
 * GET    /api/admin/users            -> list every auth user merged with their profile
 * DELETE /api/admin/users?id=<uuid>  -> permanently delete an auth user (+ profile, via cascade)
 *
 * Both require an authenticated admin — verified server-side on every
 * request via requireAdmin(), never trusted from the client. This is the
 * only place in the app that reads auth.users' full roster or deletes an
 * account; both require the service-role key, which lives only in this
 * function's server environment (see _supabaseAdmin.js).
 */
export default async function handler(req, res) {
  const { error, adminUser } = await requireAdmin(req);
  if (error) return res.status(error.status).json({ error: error.message });

  if (req.method === "GET") return handleList(res);
  if (req.method === "DELETE") return handleDelete(req, res, adminUser);
  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}

async function handleList(res) {
  try {
    const authUsers = await listAllAuthUsers();

    const { data: profiles, error: profilesError } = await supabaseAdmin.from("profiles").select("*");
    if (profilesError) throw profilesError;
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    const users = authUsers.map((u) => {
      const p = profileById.get(u.id) ?? null;
      return {
        id: u.id,
        email: u.email,
        emailConfirmedAt: u.email_confirmed_at ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        provider: u.app_metadata?.provider ?? "email",
        banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
        profile: p && {
          firstName: p.first_name,
          lastName: p.last_name,
          role: p.role,
          city: p.city,
          centre: p.centre,
          mobileNumber: p.mobile_number,
          spiritualName: p.spiritual_name,
          gurudevName: p.gurudev_name,
          dikshaStage: p.diksha_stage,
          initiationDate: p.initiation_date,
          initiationYear: p.initiation_year,
          sex: p.sex,
          dob: p.date_of_birth,
          mentorNames: p.mentor_names,
          mentorOther: p.mentor_other,
          avatarColor: p.avatar_color,
          createdAt: p.created_at,
        },
      };
    });

    // The reverse inconsistency: a profiles row whose auth.users account
    // no longer exists at all. Never auto-deleted — just surfaced so an
    // admin can see it and decide what to do.
    const authIds = new Set(authUsers.map((u) => u.id));
    const orphanedProfiles = profiles
      .filter((p) => !authIds.has(p.id))
      .map((p) => ({ id: p.id, email: p.email, name: `${p.first_name} ${p.last_name}`.trim() }));

    return res.status(200).json({ users, orphanedProfiles });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to load users." });
  }
}

async function handleDelete(req, res, adminUser) {
  const id = req.query?.id;
  if (!id || typeof id !== "string") {
    return res.status(400).json({ error: "Missing user id." });
  }
  if (id === adminUser.id) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to delete user." });
  }
}
