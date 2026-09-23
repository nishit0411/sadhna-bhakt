/**
 * Mentor data-access layer. getActiveMentors() is public (used by the
 * registration dropdown, Supabase mode only — mock mode has no mentor
 * concept). Everything else is admin-only, going through the same
 * /api/admin/* pattern as adminUserService.js.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { authorizedRequest } from "./adminApiClient";
import { mapProfileRow } from "./authService";

/** { id, name }[] for every active mentor — used by Register.jsx's mentor dropdown. */
export async function getActiveMentors() {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase.rpc("get_active_mentors");
  if (error) throw error;
  return data ?? [];
}

/** Every mentor profile, with how many mentees each currently has. Admin only. */
export async function getAllMentors() {
  const { data: mentors, error } = await supabase.from("profiles").select("*").eq("role", "mentor");
  if (error) throw error;
  const { data: mentees, error: menteesError } = await supabase.from("profiles").select("mentor_id").not("mentor_id", "is", null);
  if (menteesError) throw menteesError;

  const menteeCounts = new Map();
  (mentees ?? []).forEach((m) => menteeCounts.set(m.mentor_id, (menteeCounts.get(m.mentor_id) ?? 0) + 1));

  const withCounts = (mentors ?? []).map((row) => ({ ...mapProfileRow(row), active: row.active, menteeCount: menteeCounts.get(row.id) ?? 0 }));
  // Same ordering as get_active_mentors(): explicit order first, unset last, alphabetical among ties.
  return withCounts.sort((a, b) => {
    const orderA = a.displayOrder ?? Infinity;
    const orderB = b.displayOrder ?? Infinity;
    return orderA !== orderB ? orderA - orderB : a.name.localeCompare(b.name);
  });
}

/** Creates a mentor account server-side. Returns the one-time initial password (DOB-derived) to show the admin. */
export async function createMentor({ firstName, lastName, email, dob, displayOrder }) {
  return authorizedRequest("/api/admin/mentors", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstName, lastName, email, dob, displayOrder }),
  });
}

/** Edits a mentor's own profile fields, or toggles `active` (deactivate/reactivate). Reuses the normal admin RLS grant — no new endpoint needed. */
export async function updateMentor(mentorId, updates) {
  const { data, error } = await supabase.from("profiles").update(updates).eq("id", mentorId).select().single();
  if (error) throw error;
  return mapProfileRow(data);
}
