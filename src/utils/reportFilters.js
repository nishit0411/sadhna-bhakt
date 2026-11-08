/**
 * Shared filter logic for the admin/mentor report views (Reports, Master
 * Report, Devotees list). One definition of every filter so each page —
 * and its CSV export — applies exactly the same rules.
 *
 * Location = profiles.city (profiles.centre holds the temple/math name).
 * Mentor   = the app's existing relationship: profiles.mentor_id OR a
 *            mentor_names match (devotees may pick several mentors; this is
 *            the same rule the mentor's own dashboard and the admin Mentors
 *            page use, so counts stay consistent everywhere).
 */

export const ALL = "all";
export const STATUS_SUBMITTED = "submitted";
export const STATUS_NOT_SUBMITTED = "notSubmitted";

export function currentMonthCursor() {
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() };
}

export function defaultReportFilters() {
  return { location: ALL, mentorId: ALL, status: ALL, search: "", cursor: currentMonthCursor() };
}

/** "  PATHANKOT " and "Pathankot" are the same location. */
export function normalizeLocation(value) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

/** Distinct locations from profile data → [{ value, label, count }], most common first. */
export function buildLocationOptions(devotees) {
  const byKey = new Map();
  for (const d of devotees) {
    const key = normalizeLocation(d.city);
    if (!key) continue;
    const entry = byKey.get(key) ?? { value: key, labels: new Map(), count: 0 };
    entry.count += 1;
    const raw = d.city.trim().replace(/\s+/g, " ");
    entry.labels.set(raw, (entry.labels.get(raw) ?? 0) + 1);
    byKey.set(key, entry);
  }
  return [...byKey.values()]
    .map(({ value, labels, count }) => ({
      value,
      // Most frequently typed spelling becomes the display label.
      label: [...labels.entries()].sort((a, b) => b[1] - a[1])[0][0],
      count,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function normalizeName(value) {
  return (value ?? "").trim().toLowerCase();
}

/** Whether `devotee` (mapped profile: mentorId + mentor[] names) belongs to `mentor` ({ id, name }). */
export function isMenteeOf(devotee, mentor) {
  if (!mentor) return false;
  if (devotee.mentorId && devotee.mentorId === mentor.id) return true;
  const fullName = normalizeName(mentor.name);
  return Boolean(fullName) && (devotee.mentor ?? []).some((n) => normalizeName(n) === fullName);
}

function digitsOnly(value) {
  return (value ?? "").replace(/\D/g, "");
}

/** Name (incl. spiritual name) or mobile number. */
export function matchesSearch(devotee, search) {
  const q = (search ?? "").trim().toLowerCase();
  if (!q) return true;
  if ((devotee.name ?? "").toLowerCase().includes(q)) return true;
  if ((devotee.spiritualName ?? "").toLowerCase().includes(q)) return true;
  const qDigits = digitsOnly(q);
  return qDigits.length >= 3 && digitsOnly(devotee.phone).includes(qDigits);
}

/**
 * Applies every active filter (AND-combined). `mentors` is the list the
 * mentor filter selects from; `skip` lets a caller ignore some filters
 * (e.g. the mentor-wise summary ignores mentor + status).
 */
export function applyReportFilters(rows, filters, { mentors = [], skip = [] } = {}) {
  const mentor = filters.mentorId !== ALL ? mentors.find((m) => m.id === filters.mentorId) : null;
  return rows.filter((row) => {
    if (!skip.includes("location") && filters.location !== ALL && normalizeLocation(row.city) !== filters.location) return false;
    if (!skip.includes("mentor") && filters.mentorId !== ALL && !isMenteeOf(row, mentor ?? { id: filters.mentorId })) return false;
    if (!skip.includes("status") && filters.status !== ALL && "submissions" in row) {
      const submitted = row.submissions > 0;
      if (filters.status === STATUS_SUBMITTED && !submitted) return false;
      if (filters.status === STATUS_NOT_SUBMITTED && submitted) return false;
    }
    if (!skip.includes("search") && !matchesSearch(row, filters.search)) return false;
    return true;
  });
}

/** True when anything differs from the defaults (drives the Reset button). */
export function hasActiveFilters(filters) {
  const d = defaultReportFilters();
  return (
    filters.location !== ALL ||
    filters.mentorId !== ALL ||
    filters.status !== ALL ||
    Boolean(filters.search.trim()) ||
    filters.cursor.year !== d.cursor.year ||
    filters.cursor.month !== d.cursor.month
  );
}

/**
 * Export allowlist — the ONLY fields any report CSV may contain. Never DOB,
 * email, credentials, tokens or whole profile objects. Each page picks a
 * subset of these keys; rows are built with toExportRow().
 */
export const REPORT_EXPORT_FIELDS = {
  name: "admin.export.name",
  location: "admin.export.location",
  centre: "admin.export.centre",
  mentors: "admin.export.mentors",
  submissions: "admin.export.submissions",
  latestSubmission: "admin.export.latestSubmission",
  totalMala: "admin.export.totalMala",
  status: "admin.export.status",
  statusToday: "admin.export.statusToday",
  mentorName: "admin.export.mentorName",
  totalDevotees: "admin.export.totalDevotees",
  submittedCount: "admin.export.submittedCount",
  notSubmittedCount: "admin.export.notSubmittedCount",
};

/** Builds downloadCSV() columns from allowlisted keys, with translated headings. */
export function exportColumns(keys, t) {
  return keys.map((key) => {
    if (!(key in REPORT_EXPORT_FIELDS)) throw new Error(`Column "${key}" is not in the export allowlist.`);
    return { key, label: t(REPORT_EXPORT_FIELDS[key]) };
  });
}

/**
 * Profiles with no first/last name fall back to their email as `name`
 * (mapProfileRow) — never let that email reach an export.
 */
export function exportSafeName(name, t) {
  return /@/.test(name ?? "") ? t("admin.export.noName") : name;
}

/** Copies only allowlisted keys — nothing else from the source object can leak into a CSV. */
export function toExportRow(source, keys) {
  const row = {};
  for (const key of keys) row[key] = source[key] ?? "";
  return row;
}

/**
 * Mentor-wise counts for the selected month. `rows` should already have the
 * non-mentor filters applied (location/search) so the summary matches the
 * page; every assigned devotee is counted, including zero-report ones.
 */
export function buildMentorSummary(rows, mentors) {
  return mentors.map((mentor) => {
    const mentees = rows.filter((r) => isMenteeOf(r, mentor));
    const submittedCount = mentees.filter((r) => r.submissions > 0).length;
    return {
      mentorId: mentor.id,
      mentorName: mentor.name,
      totalDevotees: mentees.length,
      submittedCount,
      notSubmittedCount: mentees.length - submittedCount,
    };
  });
}

function mentorLabel(row) {
  const names = (row.mentor ?? []).map((v) => (v === "Other" && row.mentorOther ? row.mentorOther : v));
  return names.join("; ");
}

export const MASTER_EXPORT_KEYS = ["name", "location", "centre", "mentors", "submissions", "latestSubmission", "totalMala", "status"];

/** Master Report rows → allowlisted CSV rows. Dates stay ISO (YYYY-MM-DD), numbers stay numbers. */
export function toMasterExportRows(rows, t) {
  return rows.map((row) =>
    toExportRow(
      {
        name: exportSafeName(row.name, t),
        location: row.city,
        centre: row.centre,
        mentors: mentorLabel(row),
        submissions: row.submissions,
        latestSubmission: row.latestSubmission ?? "",
        totalMala: row.totalMala,
        status: row.submissions > 0 ? t("admin.filters.submitted") : t("admin.filters.notSubmitted"),
      },
      MASTER_EXPORT_KEYS,
    ),
  );
}

export const MENTOR_SUMMARY_EXPORT_KEYS = ["mentorName", "totalDevotees", "submittedCount", "notSubmittedCount"];

/** Slug for export filenames: "2026-10" plus any active filter values. */
export function exportFileSuffix(filters, { locationOptions = [], mentors = [] } = {}) {
  const parts = [`${filters.cursor.year}-${String(filters.cursor.month + 1).padStart(2, "0")}`];
  if (filters.location !== ALL) parts.push(locationOptions.find((o) => o.value === filters.location)?.label ?? filters.location);
  if (filters.mentorId !== ALL) parts.push(mentors.find((m) => m.id === filters.mentorId)?.name ?? "mentor");
  if (filters.status !== ALL) parts.push(filters.status);
  if (filters.search.trim()) parts.push("search");
  return parts.join("-").replace(/[^\p{L}\p{N}-]+/gu, "_");
}

/**
 * Human-readable description of the active filters, for chart subtitles —
 * e.g. "October 2026 · Sangrur · Sripad Madhav Prabhu · Submitted · “garg”".
 * Returns null when nothing beyond the month is narrowed, so callers can
 * keep their original "across all devotees" wording.
 */
export function describeFilters(filters, { locationOptions = [], mentors = [], t, monthLabel }) {
  const parts = [];
  if (filters.location !== ALL) parts.push(locationOptions.find((o) => o.value === filters.location)?.label ?? filters.location);
  if (filters.mentorId !== ALL) parts.push(mentors.find((m) => m.id === filters.mentorId)?.name ?? t("admin.filters.mentor"));
  if (filters.status === STATUS_SUBMITTED) parts.push(t("admin.filters.submitted"));
  if (filters.status === STATUS_NOT_SUBMITTED) parts.push(t("admin.filters.notSubmitted"));
  if (filters.search.trim()) parts.push(`“${filters.search.trim()}”`);
  if (!parts.length) return null;
  return [monthLabel, ...parts].filter(Boolean).join(" · ");
}
