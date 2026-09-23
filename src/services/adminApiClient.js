/**
 * Shared client for the /api/admin/* serverless functions. Attaches the
 * current admin's own Supabase access token on every call — the server
 * independently re-verifies both the session and the admin role on every
 * request (see api/_supabaseAdmin.js's requireAdmin()); nothing here is
 * trusted client-side.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

export async function authorizedRequest(path, options = {}) {
  if (!isSupabaseConfigured) {
    throw new Error("This action requires a live backend connection.");
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
