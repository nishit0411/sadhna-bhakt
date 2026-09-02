/**
 * Sadhana data-access layer — dual-mode. Pages should only ever talk to
 * this module (never `data/mockSadhana.js` or Supabase directly) so the
 * mock and real-backend implementations stay swappable.
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";
import {
  getAllRecordsForDevotee,
  getRecordByDate,
  buildSadhanaEntry,
  upsertRecord,
} from "../data/mockSadhana";
import { toISODate } from "../utils/dateHelpers";
import { calculateCurrentStreak } from "../utils/streaks";

const MOCK_DELAY = 350;

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Maps a `sadhana_records` row (snake_case) to the shape the UI expects. */
function mapRecordRow(row) {
  if (!row) return null;
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
    granthOther: row.granth_other ?? "",
    harikathaSources: row.harikatha_sources ?? [],
    harikathaOther: row.harikatha_other ?? "",
    gaudiyaKirtan: row.gaudiya_kirtan ?? false,
    totalMala: row.total_mala ?? 0,
    malaOnAsan: row.mala_on_asan ?? 0,
    malaWithoutAsan: row.mala_without_asan ?? 0,
    tulsiSeva: row.tulsi_seva ?? false,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

/** Maps the Daily Sadhana form's values to a `sadhana_records` row for insert/upsert. */
function toRecordRow(devoteeId, date, formValues) {
  return {
    devotee_id: devoteeId,
    date,
    name: formValues.name ?? null,
    wake_up_time: formValues.wakeUpTime || null,
    gurudev_remembrance: formValues.gurudevRemembrance ?? false,
    mangala_arati_done: formValues.mangalaAratiDone ?? false,
    bhog_offered: formValues.bhogOffered ?? false,
    granth_read: formValues.granthRead ?? [],
    granth_other: formValues.granthOther || null,
    harikatha_sources: formValues.harikathaSources ?? [],
    harikatha_other: formValues.harikathaOther || null,
    gaudiya_kirtan: formValues.gaudiyaKirtan ?? false,
    mala_on_asan: Number(formValues.malaOnAsan) || 0,
    mala_without_asan: Number(formValues.malaWithoutAsan) || 0,
    tulsi_seva: formValues.tulsiSeva ?? false,
  };
}

export async function getTodayEntry(devoteeId) {
  return getEntryByDate(devoteeId, toISODate(new Date()));
}

export async function getEntryByDate(devoteeId, date) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("sadhana_records")
      .select("*")
      .eq("devotee_id", devoteeId)
      .eq("date", date)
      .maybeSingle();
    if (error) throw error;
    return mapRecordRow(data);
  }

  await delay(200);
  return getRecordByDate(devoteeId, date);
}

export async function getHistory(devoteeId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("sadhana_records")
      .select("*")
      .eq("devotee_id", devoteeId)
      .order("date", { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRecordRow);
  }

  await delay();
  return getAllRecordsForDevotee(devoteeId);
}

export async function getRecentDays(devoteeId, count = 7) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("sadhana_records")
      .select("*")
      .eq("devotee_id", devoteeId)
      .order("date", { ascending: false })
      .limit(count);
    if (error) throw error;
    return (data ?? []).map(mapRecordRow);
  }

  await delay(250);
  return getAllRecordsForDevotee(devoteeId).slice(-count).reverse();
}

export async function getCurrentStreak(devoteeId) {
  const history = await getHistory(devoteeId);
  return calculateCurrentStreak(history);
}

/**
 * Creates or updates a devotee's Sadhana report for the given date. The
 * Daily Sadhana form only ever targets today's date, and re-submitting
 * today's report is treated as an edit (upsert), not a duplicate error.
 */
export async function submitSadhana(devoteeId, date, formValues) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("sadhana_records")
      .upsert(toRecordRow(devoteeId, date, formValues), { onConflict: "devotee_id,date" })
      .select()
      .single();
    if (error) throw error;
    return mapRecordRow(data);
  }

  await delay(700);
  const entry = buildSadhanaEntry(devoteeId, date, formValues);
  upsertRecord(devoteeId, entry);
  return entry;
}

export async function getMonthlyRecords(devoteeId, year, monthIndex) {
  if (isSupabaseConfigured) {
    const from = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
    const toDate = new Date(year, monthIndex + 1, 0);
    const to = toISODate(toDate);
    const { data, error } = await supabase
      .from("sadhana_records")
      .select("*")
      .eq("devotee_id", devoteeId)
      .gte("date", from)
      .lte("date", to);
    if (error) throw error;
    return (data ?? []).map(mapRecordRow);
  }

  await delay();
  return getAllRecordsForDevotee(devoteeId).filter((r) => {
    const d = new Date(`${r.date}T00:00:00`);
    return d.getFullYear() === year && d.getMonth() === monthIndex;
  });
}
