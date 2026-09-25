const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(date) {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatLongDate(dateStr, locale = "en-IN") {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

export function formatShortDate(dateStr, locale = "en-IN") {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function formatMonthYear(date, locale = "en-IN") {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

export function formatWeekday(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

/** Formats a full timestamptz (e.g. sadhana_records.submitted_at) as a local date + time string. */
export function formatDateTime(isoTimestamp, locale = "en-IN") {
  if (!isoTimestamp) return null;
  return new Date(isoTimestamp).toLocaleString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function to12Hour(time24) {
  if (!time24) return "—";
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function getMonthGrid(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday-first grid
  const totalDays = daysInMonth(year, monthIndex);
  const cells = [];

  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let day = 1; day <= totalDays; day++) {
    cells.push(toISODate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

export function addDays(dateStr, amount) {
  const d = new Date(`${dateStr}T00:00:00`);
  return toISODate(new Date(d.getTime() + amount * DAY_MS));
}

export function isToday(dateStr) {
  return dateStr === toISODate(new Date());
}

export function isFuture(dateStr) {
  return new Date(`${dateStr}T00:00:00`) > new Date(toISODate(new Date()) + "T00:00:00");
}

/** "YYYY-MM-DD" (date input value) -> "DDMMYYYY", used as the default account password. */
export function dobToPassword(dobISO) {
  const [year, month, day] = dobISO.split("-");
  return `${day}${month}${year}`;
}

/**
 * DOB <-> display conversion. Deliberately pure string manipulation: a
 * `date` column carries no time or zone, so routing it through the Date
 * constructor is what introduces a one-day shift. `new Date("2002-08-15")`
 * parses as UTC midnight, which renders as 14/08/2002 in every timezone
 * behind UTC. Nothing below constructs a Date, so no shift is possible in
 * any timezone.
 */
export function isoToDisplayDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** "15/08/2002" -> "2002-08-15". Returns null when the date isn't a real one. */
export function displayDateToIso(text) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((text ?? "").trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12) return null;
  if (year < 1900 || year > 2200) return null;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const lastDay = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (day < 1 || day > lastDay) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** Groups typed digits as DD/MM/YYYY while the user types. */
export function maskDisplayDate(text) {
  const digits = (text ?? "").replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}
