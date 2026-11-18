/**
 * Client for the /api/admin/users serverless function. Supabase mode only.
 */
import { authorizedRequest as rawRequest } from "./adminApiClient";

/*
 * Short-lived cache for the user list. Each list call makes the server load
 * every account, which takes a couple of seconds, so pages already seen (and
 * the next page, prefetched) are reused for a minute. Any change made through
 * this service (delete, email/password change) clears it immediately; call
 * clearUserListCache() after other edits that affect the list.
 */
const LIST_TTL_MS = 60_000;
const listCache = new Map();

export function clearUserListCache() {
  listCache.clear();
}

function authorizedRequest(path, init) {
  if (init?.method && init.method !== "GET") {
    return rawRequest(path, init).finally(clearUserListCache);
  }
  return rawRequest(path, init);
}

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
  const key = qs.toString();
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < LIST_TTL_MS) return hit.promise;
  const promise = authorizedRequest(`/api/admin/users?${qs}`).catch((err) => {
    listCache.delete(key);
    throw err;
  });
  listCache.set(key, { at: Date.now(), promise });
  return promise;
}

/** Single auth user merged with their profile. */
export async function getUserById(userId) {
  return authorizedRequest(`/api/admin/users?userId=${encodeURIComponent(userId)}`);
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
