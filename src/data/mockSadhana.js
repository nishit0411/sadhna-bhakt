import { addDays, toISODate } from "../utils/dateHelpers";
import { GRANTH_OPTIONS, NO_GRANTH_VALUE } from "./granthList";
import { HARIKATHA_OPTIONS, NO_HARIKATHA_VALUE } from "./harikathaList";
import { MOCK_DEVOTEES, CURRENT_DEVOTEE_ID, getDevoteesOnly, getDevoteeById } from "./mockDevotees";

/** Deterministic PRNG so mock data stays stable across reloads. */
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function pickSome(rand, arr, maxCount = 2) {
  const shuffled = [...arr].sort(() => rand() - 0.5);
  const count = 1 + Math.floor(rand() * maxCount);
  return shuffled.slice(0, count);
}

function weightedBool(rand, probabilityTrue) {
  return rand() < probabilityTrue;
}

function randomTimeAround(rand, baseHour, baseMinute, spreadMinutes) {
  const offset = Math.floor(rand() * spreadMinutes * 2) - spreadMinutes;
  let totalMinutes = baseHour * 60 + baseMinute + offset;
  totalMinutes = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Skewed toward the higher end — these are sincere, committed practitioners.
const MALA_POOL = [10, 12, 12, 14, 14, 14, 16, 16, 16, 18];
const REAL_GRANTHS = GRANTH_OPTIONS.filter((g) => g !== "Other" && g !== NO_GRANTH_VALUE);
const REAL_HARIKATHA_SOURCES = HARIKATHA_OPTIONS.filter((h) => h !== "Other" && h !== NO_HARIKATHA_VALUE);

/** Builds a single realistic day of Sadhana for a devotee. */
function buildEntry(devoteeId, devoteeName, date, rand) {
  const wakeUpTime = randomTimeAround(rand, 5, 20, 25);
  const gurudevRemembrance = weightedBool(rand, 0.9);
  const mangalaAratiDone = weightedBool(rand, 0.85);
  const bhogOffered = weightedBool(rand, 0.88);

  const readGranthToday = weightedBool(rand, 0.82);
  const granthRead = readGranthToday ? pickSome(rand, REAL_GRANTHS, 2) : [NO_GRANTH_VALUE];

  const listenedHarikatha = weightedBool(rand, 0.7);
  const harikathaSources = listenedHarikatha ? pickSome(rand, REAL_HARIKATHA_SOURCES, 2) : [NO_HARIKATHA_VALUE];

  const gaudiyaKirtan = weightedBool(rand, 0.6);

  const totalMala = pick(rand, MALA_POOL);
  const asanRatio = 0.5 + rand() * 0.45;
  const malaOnAsan = Math.round(totalMala * asanRatio);
  const malaWithoutAsan = totalMala - malaOnAsan;

  const tulsiSeva = weightedBool(rand, 0.82);

  return {
    id: `${devoteeId}-${date}`,
    devoteeId,
    date,
    name: devoteeName,
    wakeUpTime,
    gurudevRemembrance,
    mangalaAratiDone,
    bhogOffered,
    granthRead,
    granthOther: "",
    harikathaSources,
    harikathaOther: "",
    gaudiyaKirtan,
    totalMala,
    malaOnAsan,
    malaWithoutAsan,
    tulsiSeva,
    submittedAt: `${date}T${wakeUpTime}:00`,
  };
}

/**
 * Generates `days` worth of history ending yesterday (mock "today" is left
 * open so the Daily Sadhana form flow can be demonstrated end-to-end).
 */
function generateHistory(devoteeId, devoteeName, days = 45) {
  const rand = mulberry32(seedFromString(devoteeId));
  const today = toISODate(new Date());
  const records = [];

  for (let i = days; i >= 1; i--) {
    const date = addDays(today, -i);
    // Day 8 back is always skipped so no devotee shows an implausibly long
    // streak, and a few more days are dropped at random for realism.
    if (i === 8 || weightedBool(rand, 0.08)) continue;
    records.push(buildEntry(devoteeId, devoteeName, date, rand));
  }

  return records;
}

const HISTORY_BY_DEVOTEE = {};
getDevoteesOnly().forEach((devotee) => {
  HISTORY_BY_DEVOTEE[devotee.id] = generateHistory(devotee.id, devotee.name);
});

// Give a subset of devotees a completed entry for "today" so the Admin
// dashboard/table has a realistic mix of Completed vs Pending devotees.
const today = toISODate(new Date());
getDevoteesOnly().forEach((devotee) => {
  if (devotee.id === CURRENT_DEVOTEE_ID) return; // keep the demo devotee's "today" open
  const rand = mulberry32(seedFromString(devotee.id + today));
  if (weightedBool(rand, 0.8)) {
    HISTORY_BY_DEVOTEE[devotee.id].push(buildEntry(devotee.id, devotee.name, today, rand));
  }
});

export function getAllRecordsForDevotee(devoteeId) {
  return [...(HISTORY_BY_DEVOTEE[devoteeId] ?? [])].sort((a, b) => a.date.localeCompare(b.date));
}

export function getRecordByDate(devoteeId, date) {
  return HISTORY_BY_DEVOTEE[devoteeId]?.find((r) => r.date === date) ?? null;
}

export function upsertRecord(devoteeId, record) {
  if (!HISTORY_BY_DEVOTEE[devoteeId]) HISTORY_BY_DEVOTEE[devoteeId] = [];
  const list = HISTORY_BY_DEVOTEE[devoteeId];
  const idx = list.findIndex((r) => r.date === record.date);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  return record;
}

/** Builds a Sadhana record from submitted form values — no scoring involved. */
export function buildSadhanaEntry(devoteeId, date, formValues) {
  const existing = getRecordByDate(devoteeId, date);
  return {
    id: `${devoteeId}-${date}`,
    devoteeId,
    date,
    name: formValues.name ?? getDevoteeById(devoteeId)?.name ?? "",
    submittedAt: existing?.submittedAt ?? new Date().toISOString(),
    updatedAt: existing ? new Date().toISOString() : undefined,
    totalMala: 0,
    malaOnAsan: 0,
    malaWithoutAsan: 0,
    ...formValues,
  };
}

export { MOCK_DEVOTEES };
