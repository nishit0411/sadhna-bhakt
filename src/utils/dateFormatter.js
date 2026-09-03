/**
 * Formats a `YYYY-MM-DD` date string (or Date) for display as `DD-MM-YYYY`.
 * Storage/DB format is untouched — this is a display-only transform.
 * Anything that isn't a parseable full date (e.g. a year-only string like
 * "2021") is returned unchanged, since there's nothing to reformat.
 */
export function formatDateDDMMYYYY(date) {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}
