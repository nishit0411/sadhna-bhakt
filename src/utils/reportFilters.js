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

import { canonicalPlace, locationKey, sameLocationKey, tidyPlace } from "./location";

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

/**
 * Fuzzy location key — "Ghaziabad", "Gaziyabad" and " ghaziabad " are the same
 * place (see utils/location.js). Kept under this name for existing callers.
 */
export function normalizeLocation(value) {
  return locationKey(value);
}

/**
 * Distinct locations from profile data → [{ value, label, count }], A–Z.
 * Spelling variants are grouped together; the label is the correct spelling
 * when the place is known, otherwise the most frequently typed spelling.
 */
export function buildLocationOptions(devotees) {
  const groups = [];
  for (const d of devotees) {
    const key = locationKey(d.city);
    if (!key) continue;
    let group = groups.find((g) => sameLocationKey(g.value, key));
    if (!group) {
      group = { value: key, labels: new Map(), count: 0 };
      groups.push(group);
    }
    group.count += 1;
    const raw = tidyPlace(d.city);
    group.labels.set(raw, (group.labels.get(raw) ?? 0) + 1);
  }
  return groups
    .map(({ value, labels, count }) => {
      const typed = [...labels.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { value, label: canonicalPlace(typed) ?? typed, count };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Display name for a devotee's location (correct spelling when known). */
export function displayLocation(city) {
  if (!(city ?? "").trim()) return "";
  return canonicalPlace(city) ?? tidyPlace(city);
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
    if (!skip.includes("location") && filters.location !== ALL && !sameLocationKey(locationKey(row.city), filters.location)) return false;
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
  spiritualName: "admin.export.spiritualName",
  phone: "admin.export.phone",
  month: "admin.export.month",
  daysReported: "admin.export.daysReported",
  daysInPeriod: "admin.export.daysInPeriod",
  submissionRate: "admin.export.submissionRate",
  averageMala: "admin.export.averageMala",
  date: "admin.export.date",
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
  submittedPercent: "admin.export.submittedPercent",
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

export const MASTER_EXPORT_KEYS = [
  "name",
  "spiritualName",
  "phone",
  "location",
  "centre",
  "mentors",
  "month",
  "submissions",
  "daysInPeriod",
  "submissionRate",
  "latestSubmission",
  "totalMala",
  "averageMala",
  "status",
];

/** Days of the month that count: the whole month, or up to today for the current month. */
export function daysInPeriod(cursor) {
  const today = new Date();
  const last = new Date(cursor.year, cursor.month + 1, 0).getDate();
  return cursor.year === today.getFullYear() && cursor.month === today.getMonth() ? today.getDate() : last;
}

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Master Report rows → allowlisted CSV rows, ready for Excel / Sheets:
 * ISO dates (YYYY-MM-DD), plain numbers, phone as text, one row per devotee.
 */
export function toMasterExportRows(rows, t, cursor) {
  const days = daysInPeriod(cursor);
  const month = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  return rows.map((row) =>
    toExportRow(
      {
        name: exportSafeName(row.name, t),
        spiritualName: row.spiritualName,
        phone: row.phone,
        location: displayLocation(row.city),
        centre: row.centre,
        mentors: mentorLabel(row),
        month,
        submissions: row.submissions,
        daysInPeriod: days,
        submissionRate: days ? Math.round((row.submissions / days) * 100) : 0,
        latestSubmission: row.latestSubmission ?? "",
        totalMala: row.totalMala,
        averageMala: row.submissions ? round1(row.totalMala / row.submissions) : 0,
        status: row.submissions > 0 ? t("admin.filters.submitted") : t("admin.filters.notSubmitted"),
      },
      MASTER_EXPORT_KEYS,
    ),
  );
}

export const MENTOR_SUMMARY_EXPORT_KEYS = ["month", "mentorName", "totalDevotees", "submittedCount", "notSubmittedCount", "submittedPercent"];

/** Mentor summary → CSV rows with the month and a submitted % column. */
export function toMentorSummaryExportRows(summary, cursor) {
  const month = `${cursor.year}-${String(cursor.month + 1).padStart(2, "0")}`;
  return summary.map((r) =>
    toExportRow(
      { ...r, month, submittedPercent: r.totalDevotees ? Math.round((r.submittedCount / r.totalDevotees) * 100) : 0 },
      MENTOR_SUMMARY_EXPORT_KEYS,
    ),
  );
}

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
