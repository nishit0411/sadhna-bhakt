import { MALA_TARGET_ROUNDS, NO_GRANTH_VALUE } from "./scoring";
import { NO_HARIKATHA_VALUE } from "../data/harikathaList";

function percentTrue(records, predicate) {
  if (!records.length) return 0;
  const count = records.filter(predicate).length;
  return Math.round((count / records.length) * 100);
}

const readGranth = (r) => (r.granthRead ?? []).some((g) => g && g !== NO_GRANTH_VALUE);
const listenedHarikatha = (r) => (r.harikathaSources ?? []).some((h) => h && h !== NO_HARIKATHA_VALUE);

/** Maps an activity `key` (as used across breakdown arrays) to its i18n key. */
export const ACTIVITY_LABEL_KEYS = {
  japa: "activity.mala",
  tulsi: "activity.tulsiSeva",
  granth: "activity.granthReading",
  harikatha: "activity.harikatha",
  kirtan: "activity.gaudiyaKirtan",
  mangalaarati: "activity.mangalaArati",
  bhog: "activity.bhogPrasadam",
  gurudev: "activity.gurudevRemembrance",
};

/**
 * Consistency percentages for the Activity Breakdown cards — how often (not
 * how well) each practice was performed across the given set of records.
 * `t` is the translation function from `useTranslation()`; when omitted,
 * English labels are used as a fallback.
 */
export function getActivityBreakdown(records, t = (key, fallback) => fallback) {
  const avgMala = records.length ? records.reduce((sum, r) => sum + r.totalMala, 0) / records.length : 0;

  return [
    { key: "japa", label: t("activity.mala", "Mala"), value: Math.round(Math.min(100, (avgMala / MALA_TARGET_ROUNDS) * 100)) },
    { key: "tulsi", label: t("activity.tulsiSeva", "Tulsi Seva"), value: percentTrue(records, (r) => r.tulsiSeva) },
    { key: "granth", label: t("activity.granthReading", "Granth Reading"), value: percentTrue(records, readGranth) },
    { key: "harikatha", label: t("activity.harikatha", "Harikatha"), value: percentTrue(records, listenedHarikatha) },
    { key: "kirtan", label: t("activity.gaudiyaKirtan", "Gaudiya Kirtan"), value: percentTrue(records, (r) => r.gaudiyaKirtan) },
    { key: "mangalaarati", label: t("activity.mangalaArati", "Mangala Arati"), value: percentTrue(records, (r) => r.mangalaAratiDone) },
    { key: "bhog", label: t("activity.bhogPrasadam", "Bhog & Prasadam"), value: percentTrue(records, (r) => r.bhogOffered) },
    { key: "gurudev", label: t("activity.gurudevRemembrance", "Gurudev Remembrance"), value: percentTrue(records, (r) => r.gurudevRemembrance) },
  ];
}
