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
