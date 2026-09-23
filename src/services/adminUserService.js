/**
 * Client for the /api/admin/users serverless function. Supabase mode only.
 */
import { authorizedRequest } from "./adminApiClient";

/** Every auth user merged with their profile, plus any orphaned-profile rows. */
export async function listAllUsers() {
  return authorizedRequest("/api/admin/users");
}

/** Permanently deletes the Supabase Auth account (and its profile, via ON DELETE CASCADE). */
export async function deleteUserAccount(userId) {
  return authorizedRequest(`/api/admin/users?id=${encodeURIComponent(userId)}`, { method: "DELETE" });
}
