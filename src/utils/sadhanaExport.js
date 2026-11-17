import { downloadCSV } from "./csvExport";
import { toISODate } from "./dateHelpers";

const yesNo = (value) => (value ? "Yes" : "No");

function listWithOther(list, other) {
  const items = (list ?? []).filter((v) => v && v !== "Other");
  if (other) items.push(other);
  return items.join("; ");
}

/** Columns of the personal Sadhana export — every field the devotee fills in, nothing else. */
const COLUMNS = [
  { key: "date", label: "Date" },
  { key: "wakeUpTime", label: "Wake-up Time" },
  { key: "malaOnAsan", label: "Mala on Asan" },
  { key: "malaWithoutAsan", label: "Mala without Asan" },
  { key: "totalMala", label: "Total Mala" },
  { key: "mangalaArati", label: "Mangala Arati" },
  { key: "gurudevRemembrance", label: "Gurudev Remembrance" },
  { key: "bhogOffered", label: "Bhog Offered" },
  { key: "tulsiSeva", label: "Tulsi Seva" },
  { key: "gaudiyaKirtan", label: "Gaudiya Kirtan" },
  { key: "granthRead", label: "Granth Read" },
  { key: "harikatha", label: "Harikatha Heard" },
  { key: "submittedAt", label: "Submitted At" },
];

/**
 * Downloads the signed-in devotee's own Sadhana history as CSV (Excel /
 * Sheets friendly: ISO dates, plain numbers, Yes/No). `records` come from
 * sadhanaService.getHistory(user.id) — RLS only ever returns their own rows.
 * Returns the number of rows exported.
 */
export function downloadMySadhana(records, user) {
  const rows = [...records]
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .map((r) => ({
      date: String(r.date).slice(0, 10),
      wakeUpTime: r.wakeUpTime ?? "",
      malaOnAsan: r.malaOnAsan ?? 0,
      malaWithoutAsan: r.malaWithoutAsan ?? 0,
      totalMala: r.totalMala ?? 0,
      mangalaArati: yesNo(r.mangalaAratiDone),
      gurudevRemembrance: yesNo(r.gurudevRemembrance),
      bhogOffered: yesNo(r.bhogOffered),
      tulsiSeva: yesNo(r.tulsiSeva),
      gaudiyaKirtan: yesNo(r.gaudiyaKirtan),
      granthRead: listWithOther(r.granthRead, r.granthOther),
      harikatha: listWithOther(r.harikathaSources, r.harikathaOther),
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString("en-IN") : "",
    }));
  const today = toISODate(new Date());
  const who = (user?.name && !/@/.test(user.name) ? user.name : "my").replace(/[^\p{L}\p{N}]+/gu, "-");
  downloadCSV(`sadhana-${who}-${today}`, rows, COLUMNS, `Sadhana records of ${user?.name ?? ""} · exported ${today}`);
  return rows.length;
}
