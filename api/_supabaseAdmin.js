import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — SERVER-SIDE ONLY. This file lives under
 * /api, which Vercel deploys as Node.js serverless functions, never as
 * part of the Vite client bundle — nothing here reaches the browser.
 *
 * Requires two environment variables set in the Vercel project's
 * dashboard (Settings → Environment Variables), NOT in any VITE_-prefixed
 * variable and NOT committed to the repo:
 *   SUPABASE_URL                — same value as VITE_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   — Project Settings → API → service_role
 */
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
    : null;

/**
 * Verifies the request's `Authorization: Bearer <token>` belongs to a
 * real, currently-valid Supabase session AND that user's profile has
 * role = 'admin' — both re-checked here, server-side, against the
 * database. Never trusts anything the client claims about itself (no
 * user id or "isAdmin" flag is ever read from the request body/query).
 */
export async function requireAdmin(req) {
  if (!supabaseAdmin) {
    return { error: { status: 500, message: "Server is missing SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY configuration." } };
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return { error: { status: 401, message: "Missing Authorization header." } };
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData?.user) {
    // Surfaces Supabase's own specific rejection reason (e.g. "invalid JWT
    // signature", which points at SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY
    // not actually matching the project that issued this token) instead of
    // a single generic message — this endpoint is only ever called by an
    // already-authenticated admin, so there's no user-facing UX reason to
    // hide the real cause here.
    return { error: { status: 401, message: `Invalid or expired session: ${userError?.message ?? "no user returned"}` } };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id, role")
    .eq("id", userData.user.id)
    .single();
  if (profileError || profile?.role !== "admin") {
    return {
      error: {
        status: 403,
        message: profileError ? `Admin check failed: ${profileError.message}` : `Admin access required (role is "${profile?.role}").`,
      },
    };
  }

  return { adminUser: userData.user };
}

/** Pages through every auth.users row via the Admin API. */
export async function listAllAuthUsers() {
  const perPage = 1000;
  let page = 1;
  const users = [];
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < perPage) break;
    page += 1;
  }
  return users;
}
