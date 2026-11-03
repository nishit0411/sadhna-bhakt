/**
 * Client for the /api/admin/users serverless function. Supabase mode only.
 */
import { authorizedRequest } from "./adminApiClient";

/**
 * Paginated, filterable list of auth users merged with their profiles,
 * plus any orphaned-profile rows.
 *
 * @param {Object} params
 * @param {number} params.page          — 1-based page number (default 1)
 * @param {number} params.pageSize      — rows per page (default 20, max 100)
 * @param {string} params.search        — substring matched against email / firstName / lastName
 * @param {string} params.role          — "all" | "admin" | "devotee"
 * @param {string} params.verified      — "all" | "verified" | "unverified"
 * @param {string} params.profile       — "all" | "exists" | "missing"
 * @returns {Promise<{ users, orphanedProfiles, total, page, pageSize, totalPages }>}
 */
export async function listAllUsers(params = {}) {
  const qs = new URLSearchParams({
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 20),
  });
  if (params.search) qs.set("search", params.search);
  if (params.role && params.role !== "all") qs.set("role", params.role);
  if (params.verified && params.verified !== "all") qs.set("verified", params.verified);
  if (params.profile && params.profile !== "all") qs.set("profile", params.profile);
  return authorizedRequest(`/api/admin/users?${qs}`);
}

/** Single auth user merged with their profile. */
export async function getUserById(userId) {
  return authorizedRequest(`/api/admin/users/${encodeURIComponent(userId)}`);
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
