/**
 * Admin/mentor data-access layer — dual-mode. Aggregates devotee profiles
 * with their Sadhana records for the Admin dashboard, devotee table, and
 * detail views. In Supabase mode this relies on the `is_admin()` RLS policy
 * that lets admin accounts SELECT every devotee's `profiles` and
 * `sadhana_records` rows (never `autofill_templates`).
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import { mapProfileRow } from "./authService";
import { getDevoteesOnly, getDevoteeById } from "../data/mockDevotees";
import { getAllRecordsForDevotee } from "../data/mockSadhana";
import { toISODate } from "../utils/dateHelpers";
import { calculateCurrentStreak } from "../utils/streaks";
import { NO_GRANTH_VALUE } from "../data/granthList";
import { NO_HARIKATHA_VALUE } from "../data/harikathaList";

const MOCK_DELAY = 400;

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const readAnyGranth = (r) => (r.granthRead ?? []).some((g) => g && g !== NO_GRANTH_VALUE);
const listenedAnyHarikatha = (r) => (r.harikathaSources ?? []).some((h) => h && h !== NO_HARIKATHA_VALUE);

function mapRecordRow(row) {
  return {
    id: row.id,
    devoteeId: row.devotee_id,
    date: row.date,
    name: row.name ?? "",
    wakeUpTime: row.wake_up_time ?? "",
    gurudevRemembrance: row.gurudev_remembrance ?? false,
    mangalaAratiDone: row.mangala_arati_done ?? false,
    bhogOffered: row.bhog_offered ?? false,
    granthRead: row.granth_read ?? [],
    harikathaSources: row.harikatha_sources ?? [],
    gaudiyaKirtan: row.gaudiya_kirtan ?? false,
    totalMala: row.total_mala ?? 0,
    malaOnAsan: row.mala_on_asan ?? 0,
    malaWithoutAsan: row.mala_without_asan ?? 0,
    tulsiSeva: row.tulsi_seva ?? false,
  };
}

/** All devotee (non-admin) profiles. Supabase mode only. */
async function fetchAllDevotees() {
  return cached("devotees", async () => {
    const { data, error } = await supabase.from("profiles").select("*").eq("role", "devotee");
    if (error) throw error;
    return (data ?? []).map(mapProfileRow);
  });
}

// Short-lived cache + in-flight de-duplication. Dashboard/Analytics call
// several functions that each need the full directory/records at once;
// without this the same thousands of rows were downloaded 2–3 times per page.
const CACHE_TTL_MS = 30_000;
const cache = new Map();
function cached(key, loader) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.promise;
  const promise = loader().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { at: Date.now(), promise });
  return promise;
}

/** Drops cached devotee/record data (call after writes that should show immediately). */
export function invalidateDevoteeCache() {
  cache.clear();
}

/** Every devotee's Sadhana records, grouped by devotee id. Supabase mode only. */
async function fetchAllRecordsGrouped(range = {}) {
  const { fromDate, toDate } = range;
  return cached(`records:${fromDate ?? ""}:${toDate ?? ""}`, () => loadRecordsGrouped(fromDate, toDate));
}

async function loadRecordsGrouped(fromDate, toDate) {
  // PostgREST caps a single response at 1000 rows by default, so page
  // through instead of silently losing older history once the table grows.
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    let q = supabase.from("sadhana_records").select("*");
    if (fromDate) q = q.gte("date", fromDate);
    if (toDate) q = q.lte("date", toDate);
    const { data, error } = await q
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  const byDevotee = new Map();
  rows.forEach((row) => {
    const record = mapRecordRow(row);
    if (!byDevotee.has(record.devoteeId)) byDevotee.set(record.devoteeId, []);
    byDevotee.get(record.devoteeId).push(record);
  });
  byDevotee.forEach((list) => list.sort((a, b) => a.date.localeCompare(b.date)));
  return byDevotee;
}

/**
 * `windowDays` controls how far back "average"/"consistency"/"total" look
 * — 7, 30, or Infinity for all-time (used by the Analytics page's period
 * filter). Defaults to 30 to match every existing caller's behavior
 * exactly, so nothing else needed to change when this was added.
 */
function summarize(devotee, records, forDate, windowDays = 30) {
  const targetDate = forDate ?? toISODate(new Date());
  const targetEntry = records.find((r) => r.date === targetDate);
  const windowRecords = Number.isFinite(windowDays) ? records.slice(-windowDays) : records;
  const windowSize = Number.isFinite(windowDays) ? windowDays : windowRecords.length;
  const windowTotalMala = windowRecords.reduce((sum, r) => sum + r.totalMala, 0);
  const avgMala = windowRecords.length ? Math.round((windowTotalMala / windowRecords.length) * 10) / 10 : 0;

  // A devotee who joined more recently than the window is long can't have
  // submitted for the full window — cap the completion-rate denominator at
  // how many days they've actually been a member, so someone who joined 3
  // days ago and submitted every day reads as 100%, not ~10% of a 30-day window.
  const joinedISODate = devotee.joinedOn ? toISODate(new Date(devotee.joinedOn)) : null;
  const daysSinceJoined = joinedISODate
    ? Math.round((new Date(`${targetDate}T00:00:00`) - new Date(`${joinedISODate}T00:00:00`)) / 86400000) + 1
    : windowSize;
  const completionWindowSize = Math.max(1, Math.min(windowSize, daysSinceJoined));

  return {
    ...devotee,
    todayEntry: targetEntry,
    todayTotalMala: targetEntry?.totalMala ?? null,
    todayMalaOnAsan: targetEntry?.malaOnAsan ?? null,
    todayMalaWithoutAsan: targetEntry?.malaWithoutAsan ?? null,
    todayGranth: targetEntry ? (readAnyGranth(targetEntry) ? "Yes" : "No") : null,
    todayHarikatha: targetEntry ? (listenedAnyHarikatha(targetEntry) ? "Yes" : "No") : null,
    todayGaudiyaKirtan: targetEntry ? (targetEntry.gaudiyaKirtan ? "Yes" : "No") : null,
    status: targetEntry ? "Completed" : "Pending",
    averageMala: avgMala,
    windowTotalMala,
    windowMalaOnAsan: windowRecords.reduce((sum, r) => sum + r.malaOnAsan, 0),
    windowMalaWithoutAsan: windowRecords.reduce((sum, r) => sum + r.malaWithoutAsan, 0),
    completionRate: Math.min(100, Math.round((windowRecords.length / completionWindowSize) * 100)),
    currentStreak: calculateCurrentStreak(records),
    daysSubmitted: records.length,
    lastSubmittedDate: records.length ? records[records.length - 1].date : null,
  };
}

export async function getDevoteeDirectory(forDate, windowDays = 30) {
  if (isSupabaseConfigured) {
    const [devotees, recordsByDevotee] = await Promise.all([fetchAllDevotees(), fetchAllRecordsGrouped()]);
    return devotees.map((d) => summarize(d, recordsByDevotee.get(d.id) ?? [], forDate, windowDays));
  }

  await delay();
  return getDevoteesOnly().map((d) => summarize(d, getAllRecordsForDevotee(d.id), forDate, windowDays));
}

/**
 * Per-day submission counts and average mala for the last `days` days
 * (inclusive of today), across every devotee — the Analytics page's
 * weekly trend chart. Days with zero submissions still appear, at 0.
 */
export async function getSubmissionTrend(days = 7) {
  let recordsByDevotee;
  if (isSupabaseConfigured) {
    // Only the last `days` days — not every record ever submitted.
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    recordsByDevotee = await fetchAllRecordsGrouped({ fromDate: toISODate(start) });
  } else {
    await delay();
    recordsByDevotee = new Map(getDevoteesOnly().map((d) => [d.id, getAllRecordsForDevotee(d.id)]));
  }

  const byDate = new Map();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    byDate.set(toISODate(d), { submissions: 0, totalMala: 0 });
  }

  recordsByDevotee.forEach((records) => {
    records.forEach((r) => {
      const bucket = byDate.get(r.date);
      if (!bucket) return; // outside the requested window
      bucket.submissions += 1;
      bucket.totalMala += r.totalMala;
    });
  });

  return [...byDate.entries()].map(([date, { submissions, totalMala }]) => ({
    date,
    submissions,
    averageMala: submissions ? Math.round((totalMala / submissions) * 10) / 10 : 0,
  }));
}

export async function getDevoteeSummary(devoteeId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", devoteeId).single();
    if (error) throw error;
    const devotee = mapProfileRow(data);
    const { data: recordRows, error: recordError } = await supabase
      .from("sadhana_records")
      .select("*")
      .eq("devotee_id", devoteeId)
      .order("date", { ascending: true });
    if (recordError) throw recordError;
    return summarize(devotee, (recordRows ?? []).map(mapRecordRow));
  }

  await delay(300);
  const devotee = getDevoteeById(devoteeId);
  if (!devotee) return null;
  return summarize(devotee, getAllRecordsForDevotee(devoteeId));
}

export async function getSanghaMonthlyOverview(year, monthIndex) {
  let recordsByDevotee;
  if (isSupabaseConfigured) {
    // Only the requested month — not every record ever submitted.
    const pad = (n) => String(n).padStart(2, "0");
    const lastDay = new Date(year, monthIndex + 1, 0).getDate();
    recordsByDevotee = await fetchAllRecordsGrouped({
      fromDate: `${year}-${pad(monthIndex + 1)}-01`,
      toDate: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}`,
    });
  } else {
    await delay();
    recordsByDevotee = new Map(getDevoteesOnly().map((d) => [d.id, getAllRecordsForDevotee(d.id)]));
  }

  const byDate = new Map();
  const breakdownTotals = { mala: 0, tulsi: 0, granth: 0, harikatha: 0, bhog: 0, gurudev: 0, count: 0 };
  let totalMala = 0;

  recordsByDevotee.forEach((allRecords) => {
    const records = allRecords.filter((r) => {
      const d = new Date(`${r.date}T00:00:00`);
      return d.getFullYear() === year && d.getMonth() === monthIndex;
    });

    records.forEach((r) => {
      const bucket = byDate.get(r.date) ?? { mala: 0, count: 0 };
      bucket.mala += r.totalMala;
      bucket.count += 1;
      byDate.set(r.date, bucket);

      totalMala += r.totalMala;
      breakdownTotals.mala += r.totalMala;
      if (r.tulsiSeva) breakdownTotals.tulsi += 1;
      if (readAnyGranth(r)) breakdownTotals.granth += 1;
      if (listenedAnyHarikatha(r)) breakdownTotals.harikatha += 1;
      if (r.bhogOffered) breakdownTotals.bhog += 1;
      if (r.gurudevRemembrance) breakdownTotals.gurudev += 1;
      breakdownTotals.count += 1;
    });
  });

  const dailyMalaAverages = [...byDate.entries()]
    .map(([date, { mala, count }]) => ({ date, japaRounds: Math.round((mala / count) * 10) / 10, submissions: count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    dailyMalaAverages,
    totalMala,
    totalSubmissions: breakdownTotals.count,
    activeDevotees: [...recordsByDevotee.values()].filter((list) =>
      list.some((r) => {
        const d = new Date(`${r.date}T00:00:00`);
        return d.getFullYear() === year && d.getMonth() === monthIndex;
      }),
    ).length,
    activeDays: byDate.size,
    activityBreakdown: breakdownTotals.count
      ? [
          { key: "japa", label: "Mala", value: Math.round(Math.min(100, (breakdownTotals.mala / breakdownTotals.count / 16) * 100)) },
          { key: "tulsi", label: "Tulsi Seva", value: Math.round((breakdownTotals.tulsi / breakdownTotals.count) * 100) },
          { key: "granth", label: "Granth Reading", value: Math.round((breakdownTotals.granth / breakdownTotals.count) * 100) },
          { key: "harikatha", label: "Harikatha", value: Math.round((breakdownTotals.harikatha / breakdownTotals.count) * 100) },
          { key: "bhog", label: "Bhog & Prasadam", value: Math.round((breakdownTotals.bhog / breakdownTotals.count) * 100) },
          { key: "gurudev", label: "Gurudev Remembrance", value: Math.round((breakdownTotals.gurudev / breakdownTotals.count) * 100) },
        ]
      : [],
  };
}

export async function getAdminOverview() {
  const directory = await getDevoteeDirectory();
  const submittedToday = directory.filter((d) => d.status === "Completed");
  const totalMalaChanted = submittedToday.reduce((sum, d) => sum + (d.todayTotalMala ?? 0), 0);
  const totalMalaOnAsan = submittedToday.reduce((sum, d) => sum + (d.todayMalaOnAsan ?? 0), 0);
  const totalMalaWithoutAsan = submittedToday.reduce((sum, d) => sum + (d.todayMalaWithoutAsan ?? 0), 0);
  const averageMala = submittedToday.length ? Math.round((totalMalaChanted / submittedToday.length) * 10) / 10 : 0;

  return {
    totalDevotees: directory.length,
    submittedToday: submittedToday.length,
    pendingToday: directory.length - submittedToday.length,
    averageMala,
    totalMalaChanted,
    totalMalaOnAsan,
    totalMalaWithoutAsan,
    malaTable: submittedToday.map((d) => ({
      id: d.id,
      name: d.name,
      totalMala: d.todayTotalMala ?? 0,
      malaOnAsan: d.todayMalaOnAsan ?? 0,
      malaWithoutAsan: d.todayMalaWithoutAsan ?? 0,
    })),
  };
}
