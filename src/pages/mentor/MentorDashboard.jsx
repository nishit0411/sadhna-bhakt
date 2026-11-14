import AdminDashboard from "../admin/AdminDashboard";

/**
 * Mentor "My Mentees" — the admin Dashboard in mentor mode: same day picker,
 * stat cards, Sadhana overview and Mala breakdown, limited by RLS to this
 * mentor's own mentees. Read-only; no user-management actions.
 */
export default function MentorDashboard() {
  return <AdminDashboard mode="mentor" />;
}
