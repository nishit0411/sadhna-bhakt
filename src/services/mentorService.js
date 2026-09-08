/**
 * Mentor accounts — a mentor IS a profiles row (role = 'mentor'), not a
 * separate table, so most of this file is thin: list/edit/activate all
 * go through the ordinary anon-key client, exactly like every other
 * profiles read/write in this app, scoped by the same RLS policies an
 * admin already relies on elsewhere. Only createMentor() needs the
 * privileged /api/admin/mentors endpoint, because setting a password
 * directly requires the service-role key (see api/admin/mentors.js).
 *
 * The mentor's own dashboard data (their mentees, mentees' Sadhana
 * records/summaries) deliberately does NOT get new functions here — it
 * reuses devoteeService.js's existing getDevoteeDirectory/getAdminOverview/
 * getDevoteeSummary as-is. Those already query profiles/sadhana_records
 * with no hardcoded devotee_id filter, relying entirely on RLS to decide
 * which rows come back — for an admin that's everyone, and for a mentor
 * (after this session's RLS changes) it's automatically just their own
 * mentees. Writing parallel "mentor version" queries would just be two
 * copies of the same logic that could drift out of sync.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { mapProfileRow } from "./authService";

const MOCK_MENTORS = [
  { id: "mentor-mock-1", name: "Bhakti Vaibhav Puri Maharaj" },
  { id: "mentor-mock-2", name: "Bhakti Sundar Sannyasi Maharaj" },
];

/** Active mentors for the registration/profile "Assigned Mentor" dropdown. Public — no session required. */
export async function getActiveMentors() {
  if (!isSupabaseConfigured) return MOCK_MENTORS;
  const { data, error } = await supabase.rpc("get_active_mentors");
  if (error) throw error;
  return data ?? [];
}

/** Every mentor account, for Admin → Mentor Management. Admin-only via RLS (a devotee's query would return at most their own row, if any). */
export async function getAllMentors() {
  if (!isSupabaseConfigured) {
    return MOCK_MENTORS.map((m, i) => ({
      id: m.id,
      name: m.name,
      firstName: m.name,
      lastName: "",
      email: `mentor${i + 1}@example.com`,
      mobileNumber: "",
      active: true,
      createdAt: new Date().toISOString(),
      menteeCount: 0,
    }));
  }

  const [{ data: mentors, error: mentorsError }, { data: devotees, error: devoteesError }] = await Promise.all([
    supabase.from("profiles").select("*").eq("role", "mentor"),
    supabase.from("profiles").select("id, mentor_id").eq("role", "devotee"),
  ]);
  if (mentorsError) throw mentorsError;
  if (devoteesError) throw devoteesError;

  const menteeCountByMentor = new Map();
  (devotees ?? []).forEach((d) => {
    if (!d.mentor_id) return;
    menteeCountByMentor.set(d.mentor_id, (menteeCountByMentor.get(d.mentor_id) ?? 0) + 1);
  });

  return (mentors ?? []).map((m) => ({
    ...mapProfileRow(m),
    active: m.active,
    menteeCount: menteeCountByMentor.get(m.id) ?? 0,
  }));
}

/**
 * Creates a real Supabase Auth account for a mentor via the privileged
 * server-side endpoint — never sets a password from the browser directly
 * against Supabase. Requires the caller's own session token, verified
 * server-side (see api/_supabaseAdmin.js's requireAdmin).
 */
export async function createMentor({ firstName, lastName, email, password, mobileNumber }) {
  if (!isSupabaseConfigured) {
    throw new Error("Mentor Management requires a live backend connection.");
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Your session has expired. Please sign in again.");

  const res = await fetch("/api/admin/mentors", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ firstName, lastName, email, password, mobileNumber }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "Failed to create mentor account.");
  return body.mentor;
}

/** Edits a mentor's own basic details/active status. Admin-only via profiles' update RLS policy (id = auth.uid() or is_admin()). */
export async function updateMentorDetails(mentorId, { firstName, lastName, mobileNumber, active }) {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      mobile_number: mobileNumber || null,
      active,
    })
    .eq("id", mentorId);
  if (error) throw error;
}
