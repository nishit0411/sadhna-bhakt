import { addDays, toISODate } from "./dateHelpers";

/**
 * Counts consecutive submitted days working backwards from today (or
 * yesterday, if today hasn't been submitted yet).
 */
export function calculateCurrentStreak(records) {
  const byDate = new Set(records.map((r) => r.date));
  const today = toISODate(new Date());
  let cursor = byDate.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (byDate.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}
