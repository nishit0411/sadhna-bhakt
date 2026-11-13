import { CITIES, INDIAN_STATES } from "../data/indianCities";

/**
 * Fuzzy location matching. Devotees type their city freely, so the same place
 * arrives as "Ghaziabad", "Gaziyabad", " ghaziabad ", "Kangra , Himachal
 * Pradesh" or "Mahilpur (distt hoshiarpur)". locationKey() folds those into
 * one comparable key; sameLocation() also tolerates a single-letter typo.
 * Nothing is written back to the database: this only affects grouping,
 * filtering and suggestions.
 */

/** Primary place name only: drops ", state", "(district …)" and extra spaces. */
export function primaryPlace(value) {
  let place = (value ?? "")
    .split(/[,(]/)[0]
    // "distt", "district", "city", "township", post-office suffixes "H.O" / "P.O" / "S.O"
    .replace(/\b(distt?|district|city|township|[hps]\.?\s?o)\b\.?/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
  // "Sangrur Punjab" → "Sangrur": drop a trailing state name (never the whole entry).
  for (const state of STATE_NAMES) {
    if (place.toLowerCase().endsWith(` ${state}`)) {
      place = place.slice(0, -state.length - 1).trim();
      break;
    }
  }
  return place;
}

const STATE_NAMES = INDIAN_STATES.map((s) => s.toLowerCase());

/** Spelling-insensitive key: "Gaziyabad" and "Ghaziabad" both → "gaziabad". */
export function locationKey(value) {
  return primaryPlace(value)
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .replace(/([bcdgjkpt])h/g, "$1") // gh→g, kh→k, bh→b, dh→d …
    .replace(/iy/g, "i")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/w/g, "v")
    .replace(/(.)\1+/g, "$1"); // "Ludhianna" → "ludiana"
}

function editDistance(a, b) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Two keys name the same place: identical, or one typo apart for names of 5+ letters. */
export function sameLocationKey(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  return Math.min(a.length, b.length) >= 5 && editDistance(a, b) <= 1;
}

const KNOWN_PLACES = [
  ...CITIES.map((c) => ({ ...c, key: locationKey(c.name) })),
  ...INDIAN_STATES.map((name) => ({ name, district: "", state: "", key: locationKey(name), isState: true })),
];

/** Correct spelling for a typed place, or null when it isn't recognised. */
export function canonicalPlace(value) {
  const key = locationKey(value);
  if (!key) return null;
  const exact = KNOWN_PLACES.find((p) => p.key === key);
  if (exact) return exact.name;
  return KNOWN_PLACES.find((p) => sameLocationKey(p.key, key))?.name ?? null;
}

/** Lower-case, punctuation-free, single-spaced text for plain matching. */
function plain(value) {
  return (value ?? "").toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Autocomplete suggestions for what the user has typed (2+ characters):
 * [{ name, district, state, match: [start, end] | null }].
 * Ranked: exact → prefix → word prefix → contains → spelling match
 * (e.g. "gaziyab" → Ghaziabad, "ludhyana" → Ludhiana), then A–Z.
 * `match` is the character range of `name` to highlight.
 */
export function suggestPlaces(value, limit = 8) {
  const typed = plain(primaryPlace(value));
  if (typed.length < 2) return [];
  const key = locationKey(typed);

  const ranked = [];
  for (const place of KNOWN_PLACES) {
    if (place.isState) continue;
    const name = place.name.toLowerCase();
    let rank = null;
    let at = -1;
    if (name === typed || place.key === key) rank = 0;
    else if (name.startsWith(typed)) rank = 1;
    else if ((at = name.indexOf(` ${typed}`)) >= 0) {
      rank = 2;
      at += 1;
    } else if ((at = name.indexOf(typed)) >= 0) rank = 3;
    else if (key.length >= 3 && place.key.startsWith(key)) rank = 4;
    else if (sameLocationKey(place.key, key) || (key.length >= 4 && sameLocationKey(place.key.slice(0, key.length), key))) rank = 5;
    if (rank === null) continue;

    const start = (rank === 0 && name === typed) || rank === 1 ? 0 : rank === 2 || rank === 3 ? at : -1;
    ranked.push({
      name: place.name,
      district: place.district,
      state: place.state,
      rank,
      match: start >= 0 ? [start, start + Math.min(typed.length, place.name.length)] : null,
    });
  }

  // Loose spelling matches only fill in when there are few real text matches.
  const strong = ranked.filter((r) => r.rank <= 3).length;
  return ranked
    .filter((r) => r.rank <= 3 || strong < 3)
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .slice(0, limit)
    .map(({ rank, ...rest }) => rest); // eslint-disable-line no-unused-vars
}

/** Title-cases a free-typed place ("lehra gaga" → "Lehra Gaga") for display. */
export function tidyPlace(value) {
  return primaryPlace(value).toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
}
