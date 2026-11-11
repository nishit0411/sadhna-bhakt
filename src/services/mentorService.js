/**
 * Mentor data-access layer. getActiveMentors() is public (used by the
 * registration dropdown, Supabase mode only — mock mode has no mentor
 * concept). Everything else is admin-only, going through the same
 * /api/admin/* pattern as adminUserService.js.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { authorizedRequest } from "./adminApiClient";
import { mapProfileRow } from "./authService";
import { isMenteeOf } from "../utils/reportFilters";

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
  // Counted by mentor_id OR by name, matching what the mentor actually sees:
  // profiles.mentor_id holds a single mentor, but a devotee may select several,
  // and the mentor's own dashboard shows all of them (the mentor_names clause in
  // the profiles select policy). Counting mentor_id alone under-reports exactly
  // the multi-mentor devotees.
  const { data: devotees, error: menteesError } = await supabase
    .from("profiles")
    .select("mentor_id, mentor_names")
    .eq("role", "devotee");
  if (menteesError) throw menteesError;

  const menteeCounts = new Map();
  const devoteeRefs = (devotees ?? []).map((d) => ({ mentorId: d.mentor_id, mentor: d.mentor_names ?? [] }));
  for (const mentor of mentors ?? []) {
    const ref = { id: mentor.id, name: `${mentor.first_name ?? ""} ${mentor.last_name ?? ""}` };
    menteeCounts.set(mentor.id, devoteeRefs.filter((d) => isMenteeOf(d, ref)).length);
  }

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

/**
 * Every devotee who selected this mentor — admin only.
 *
 * Matches on mentor_id OR mentor_names, so a devotee who picked several
 * mentors appears under each of them, exactly as they do on that mentor's own
 * dashboard. mentor_id is never widened or rewritten; it is only one of the two
 * ways a devotee can match.
 *
 * Authorization is the existing admin grant: profiles_select_own_or_admin lets
 * an admin read every profile, and this only ever runs behind the admin-only
 * /admin/mentors route. No new policy, no service-role access from the browser.
 */
export async function getMenteesForMentor(mentor) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, active, centre, mentor_id, mentor_names, mentor_other, avatar_color, role, created_at")
    .eq("role", "devotee");
  if (error) throw error;

  return (data ?? [])
    .map((d) => ({ ...mapProfileRow(d), active: d.active, linkedById: d.mentor_id === mentor.id }))
    .filter((d) => isMenteeOf(d, mentor))
    .sort((a, b) => a.name.localeCompare(b.name));
}
