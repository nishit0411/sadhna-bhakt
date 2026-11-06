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
    const userId = req.query?.userId || idMatch?.[1];
    if (userId) return handleGetOne(res, String(userId));
    return handleList(req, res);
  }
  if (req.method === "DELETE") return handleDelete(req, res, adminUser);
  res.setHeader("Allow", "GET, DELETE");
  return res.status(405).json({ error: "Method not allowed." });
}

function mapProfile(p) {
  if (!p) return null;
  return {
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
  };
}

function mapUser(u, p) {
  return {
    id: u.id,
    email: u.email,
    emailConfirmedAt: u.email_confirmed_at ?? null,
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at ?? null,
    provider: u.app_metadata?.provider ?? "email",
    banned: Boolean(u.banned_until && new Date(u.banned_until) > new Date()),
    profile: mapProfile(p),
  };
}

/** Every auth user, paging through the Admin API (max 1000 per call). */
async function fetchAllAuthUsers() {
  const all = [];
  for (let page = 1; page < 100; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const batch = data?.users ?? [];
    all.push(...batch);
    if (batch.length < 1000) break;
  }
  return all;
}

/** Every profile row, paging past PostgREST's 1000-row cap. */
async function fetchAllProfiles() {
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + 999);
    if (error) throw error;
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

/**
 * Paginated list: page, pageSize, search, role, verified, profile via query params.
 * The user base is small (hundreds), so we load auth users + profiles once,
 * merge, filter across the WHOLE set, then slice the requested page —
 * search/filters/totals are correct across all pages.
 */
async function handleList(req, res) {
  try {
    const { query } = req;
    const page = Math.max(1, parseInt(query.page ?? "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize ?? "20", 10) || 20));
    const search = String(query.search ?? "").trim().toLowerCase();
    const role = query.role ?? "all";
    const verified = query.verified ?? "all";
    const profileFilter = query.profile ?? "all";

    const [authUsers, profiles] = await Promise.all([fetchAllAuthUsers(), fetchAllProfiles()]);
    const profileById = new Map(profiles.map((p) => [p.id, p]));

    let users = authUsers.map((u) => mapUser(u, profileById.get(u.id)));
    users.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

    if (role !== "all") users = users.filter((u) => u.profile?.role === role);
    if (verified === "verified") users = users.filter((u) => Boolean(u.emailConfirmedAt));
    else if (verified === "unverified") users = users.filter((u) => !u.emailConfirmedAt);
    if (profileFilter === "exists") users = users.filter((u) => Boolean(u.profile));
    else if (profileFilter === "missing") users = users.filter((u) => !u.profile);
    if (search) {
      users = users.filter((u) =>
        [u.email, u.profile?.firstName, u.profile?.lastName, u.profile?.spiritualName]
          .some((v) => v && String(v).toLowerCase().includes(search)),
      );
    }

    // Profiles whose auth account no longer exists — surfaced, never auto-deleted.
    const authIdSet = new Set(authUsers.map((u) => u.id));
    const orphanedProfiles = profiles
      .filter((p) => !authIdSet.has(p.id))
      .map((p) => ({ id: p.id, email: p.email, name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() }));

    const total = users.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const offset = (page - 1) * pageSize;
    return res.status(200).json({
      users: users.slice(offset, offset + pageSize),
      orphanedProfiles,
      total,
      page,
      pageSize,
      totalPages,
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
