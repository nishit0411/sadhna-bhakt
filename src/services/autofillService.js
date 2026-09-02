/**
 * Daily Autofill service — dual-mode. Stores each devotee's reusable
 * "usual day" template completely separately from their dated Sadhana
 * records — saving or updating a template never touches sadhana_records,
 * and applying a template to today's form is purely a client-side prefill
 * (the user still reviews/edits and must explicitly submit).
 */
import { supabase, isSupabaseConfigured } from "../lib/supabaseClient";

const STORAGE_KEY = "sadhana_bhakti_autofill_templates";
const MOCK_DELAY = 300;

function delay(ms = MOCK_DELAY) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // localStorage unavailable — template just won't persist across reloads
  }
}

function mapTemplateRow(row) {
  if (!row) return null;
  return {
    wakeUpTime: row.wake_up_time ?? "",
    gurudevRemembrance: row.gurudev_remembrance ?? false,
    mangalaAratiDone: row.mangala_arati_done ?? false,
    bhogOffered: row.bhog_offered ?? false,
    granthRead: row.granth_read ?? [],
    granthOther: row.granth_other ?? "",
    harikathaSources: row.harikatha_sources ?? [],
    harikathaOther: row.harikatha_other ?? "",
    gaudiyaKirtan: row.gaudiya_kirtan ?? false,
    malaOnAsan: row.mala_on_asan ?? 0,
    malaWithoutAsan: row.mala_without_asan ?? 0,
    tulsiSeva: row.tulsi_seva ?? false,
    updatedAt: row.updated_at,
  };
}

function toTemplateRow(devoteeId, values) {
  return {
    devotee_id: devoteeId,
    wake_up_time: values.wakeUpTime || null,
    gurudev_remembrance: values.gurudevRemembrance ?? false,
    mangala_arati_done: values.mangalaAratiDone ?? false,
    bhog_offered: values.bhogOffered ?? false,
    granth_read: values.granthRead ?? [],
    granth_other: values.granthOther || null,
    harikatha_sources: values.harikathaSources ?? [],
    harikatha_other: values.harikathaOther || null,
    gaudiya_kirtan: values.gaudiyaKirtan ?? false,
    mala_on_asan: Number(values.malaOnAsan) || 0,
    mala_without_asan: Number(values.malaWithoutAsan) || 0,
    tulsi_seva: values.tulsiSeva ?? false,
  };
}

export async function getAutofillTemplate(devoteeId) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("autofill_templates")
      .select("*")
      .eq("devotee_id", devoteeId)
      .maybeSingle();
    if (error) throw error;
    return mapTemplateRow(data);
  }

  await delay(150);
  return readAll()[devoteeId] ?? null;
}

export async function saveAutofillTemplate(devoteeId, values) {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from("autofill_templates")
      .upsert(toTemplateRow(devoteeId, values), { onConflict: "devotee_id" })
      .select()
      .single();
    if (error) throw error;
    return mapTemplateRow(data);
  }

  await delay(400);
  const all = readAll();
  all[devoteeId] = { ...values, updatedAt: new Date().toISOString() };
  writeAll(all);
  return all[devoteeId];
}
