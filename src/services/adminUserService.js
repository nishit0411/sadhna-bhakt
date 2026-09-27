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

/**
 * Admin-initiated credential changes. Both go through /api/admin/credentials,
 * which re-verifies the admin server-side and uses the service-role key that
 * never reaches the browser. The password is sent once and never stored,
 * echoed or logged anywhere on the client.
 */
export async function adminChangeEmail(userId, email) {
  return authorizedRequest("/api/admin/credentials", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, email }),
  });
}

export async function adminChangePassword(userId, password) {
  return authorizedRequest("/api/admin/credentials", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, password }),
  });
}
