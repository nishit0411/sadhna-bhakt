import { supabaseAdmin, requireAdmin } from "../_supabaseAdmin.js";

/**
 * GET    /api/admin/users            -> paginated, filterable list of auth users merged with profiles
 * GET    /api/admin/users/:id        -> single auth user merged with their profile
 * DELETE /api/admin/users?id=<uuid>  -> permanently delete an auth user (+ profile, via cascade)
 *
 * All require an authenticated admin — verified server-side on every
 * request via requireAdmin(), never trusted from the client.
 */
export default async function handler(req, res) {
  const { error, adminUser } = await requireAdmin(req);
  if (error) return res.status(error.status).json({ error: error.message });

  if (req.method === "GET") {
    // /api/admin/users/:id — single user detail
    const idMatch = req.url?.match(/\/api\/admin\/users\/([^/?]+)/);
    if (idMatch) return handleGetOne(res, idMatch[1]);
    return handleList(req, res);
  }
  if (req.method === "DELETE") return handleDelete(req, res, adminUser);
  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}

/** Paginated list: page, pageSize, search, role, verified via query params. */
async function handleList(req, res) {
  try {
    const { query } = req;
    const page = Math.max(1, parseInt(query.page ?? "1", 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? "20", 10)));
    const search = (query.search ?? "").trim();
    const role = query.role ?? "all";
    const verified = query.verified ?? "all"; // "all" | "verified" | "unverified"
    const offset = (page - 1) * pageSize;

    // 1. Auth users via Supabase Admin API (page/perPage supported by SDK)
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    if (authError) throw authError;

    const authIds = authUsers.map((u) => u.id);

    // 2. Profiles for these users only, with filters applied server-side
    let profilesQuery = supabaseAdmin.from("profiles").select("*").in("id", authIds);

    if (role && role !== "all") profilesQuery = profilesQuery.eq("role", role);
    if (search) profilesQuery = profilesQuery.ilike("email", `%${search}%`);

    const { data: profiles, error: profilesError, count } = await profilesQuery
      .range(offset, offset + pageSize - 1)
      .order("created_at", { ascending: false });
    if (profilesError) throw profilesError;

    const profileById = new Map(profiles.map((p) => [p.id, p]));

    // 3. Merge auth users + profiles
    let users = authUsers.map((u) => {
      const p = profileById.get(u.id) ?? null;
      return {
        id: u.id,
        email: u.email,
        emailConfirmedAt: u.email_confirmed_at ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        provider: u.app_metadata?.provider ?? "email",
        banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
        profile: p
          ? {
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
            }
          : null,
      };
    });

    // role filter (already applied via profiles.eq above, but re-apply for
    // users without profiles when role isn't "all")
    if (role !== "all") {
      users = users.filter((u) => u.profile?.role === role);
    }

    // verified filter: email_confirmed_at presence
    if (verified === "verified") {
      users = users.filter((u) => Boolean(u.emailConfirmedAt));
    } else if (verified === "unverified") {
      users = users.filter((u) => !u.emailConfirmedAt);
    }

    // profile filter: exists / missing
    if (query.profile === "exists") {
      users = users.filter((u) => Boolean(u.profile));
    } else if (query.profile === "missing") {
      users = users.filter((u) => !u.profile);
    }

    // search by name (profile fields) — email already filtered via ILIKE above
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          (u.profile?.firstName?.toLowerCase().includes(q) ?? false) ||
          (u.profile?.lastName?.toLowerCase().includes(q) ?? false),
      );
    }

    // The reverse inconsistency: a profiles row whose auth.users account
    // no longer exists at all. Never auto-deleted — just surfaced so an
    // admin can see it and decide what to do.
    const authIdSet = new Set(authUsers.map((u) => u.id));
    const orphanedProfiles = profiles
      .filter((p) => !authIdSet.has(p.id))
      .map((p) => ({ id: p.id, email: p.email, name: `${p.first_name} ${p.last_name}`.trim() }));

    const total = count ?? profiles.length;
    return res.status(200).json({
      users,
      orphanedProfiles,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to load users." });
  }
}

/** Single user by auth id. */
async function handleGetOne(res, userId) {
  try {
    const { data: authUser, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !authUser?.user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    return res.status(200).json({
      user: {
        id: authUser.user.id,
        email: authUser.user.email,
        emailConfirmedAt: authUser.user.email_confirmed_at ?? null,
        createdAt: authUser.user.created_at,
        lastSignInAt: authUser.user.last_sign_in_at ?? null,
        provider: authUser.user.app_metadata?.provider ?? "email",
        banned: Boolean(authUser.user.banned_until && new Date(authUser.user.banned_until) > new Date()),
        profile: profile
          ? {
              firstName: profile.first_name,
              lastName: profile.last_name,
              role: profile.role,
              city: profile.city,
              centre: profile.centre,
              mobileNumber: profile.mobile_number,
              spiritualName: profile.spiritual_name,
              gurudevName: profile.gurudev_name,
              dikshaStage: profile.diksha_stage,
              initiationDate: profile.initiation_date,
              initiationYear: profile.initiation_year,
              sex: profile.sex,
              dob: profile.date_of_birth,
              mentorNames: profile.mentor_names,
              mentorOther: profile.mentor_other,
              avatarColor: profile.avatar_color,
              createdAt: profile.created_at,
            }
          : null,
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message ?? "Failed to load user." });
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
