/**
 * Shared Sadhana constants.
 *
 * The scoring/points system has been intentionally removed from this
 * platform (see project decision log) — this file now only holds the small
 * set of constants shared across the Daily Sadhana form, mock data, and
 * analytics (Activity Breakdown consistency percentages, which are NOT a
 * score — they simply describe how often a practice was performed).
 */

export const MALA_MIN = 0;
export const MALA_MAX = 100;

/** Reference round-count used only to express Mala consistency as a percentage. */
export const MALA_TARGET_ROUNDS = 16;

export const NO_GRANTH_VALUE = "None / नहीं पढ़ा";
export const NO_HARIKATHA_VALUE = "Did not listen to Harikatha today / आज हरिकथा नहीं सुनी";
