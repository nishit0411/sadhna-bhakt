/**
 * Client for the /api/admin/* serverless functions (see api/admin/users.js).
 * Every call attaches the current admin's own Supabase access token —
 * the server independently re-verifies both the session and the admin
 * role on every request; nothing here is trusted client-side. Supabase
 * mode only: these endpoints need a real backend, so calling them while
 * running on mock data throws clearly rather than silently doing nothing.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

async function authorizedRequest(path, options = {}) {
  if (!isSupabaseConfigured) {
    throw new Error("User Management requires a live backend connection.");
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const res = await fetch(path, {
    ...options,
    headers: { ...(options.headers ?? {}), Authorization: `Bearer ${token}` },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Request failed.");
  return body;
}

/** Every auth user merged with their profile, plus any orphaned-profile rows. */
export async function listAllUsers() {
  return authorizedRequest("/api/admin/users");
}

/** Permanently deletes the Supabase Auth account (and its profile, via ON DELETE CASCADE). */
export async function deleteUserAccount(userId) {
  return authorizedRequest(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
}
