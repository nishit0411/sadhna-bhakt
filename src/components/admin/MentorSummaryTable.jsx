import { useTranslation } from "../../i18n/LanguageContext";

/**
 * Mentor-wise summary for the selected month: total assigned devotees and
 * how many did / did not submit. `rows` = [{ mentorId, mentorName,
 * totalDevotees, submittedCount, notSubmittedCount }]. Clicking a row
 * applies that mentor as the report filter.
 */
export default function MentorSummaryTable({ rows, selectedId, onSelect }) {
  const { t } = useTranslation();

  return (
    <div className="overflow-x-auto rounded-2xl border border-brown-900/5">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
            <th className="px-4 py-3">{t("admin.report.colMentor")}</th>
            <th className="px-4 py-3 text-right">{t("admin.report.colTotalDevotees")}</th>
            <th className="px-4 py-3 text-right">{t("admin.report.colSubmitted")}</th>
            <th className="px-4 py-3 text-right">{t("admin.report.colNotSubmitted")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.mentorId}
              onClick={() => onSelect?.(row.mentorId)}
              aria-selected={row.mentorId === selectedId}
              className={`cursor-pointer border-b border-brown-900/5 transition-colors last:border-0 hover:bg-beige-100 ${
                row.mentorId === selectedId ? "bg-saffron-50" : "bg-cream-50"
              }`}
            >
              <td className="px-4 py-3 font-medium text-brown-900">{row.mentorName}</td>
              <td className="px-4 py-3 text-right text-brown-700">{row.totalDevotees}</td>
              <td className="px-4 py-3 text-right text-sage-600">{row.submittedCount}</td>
              <td className="px-4 py-3 text-right text-clay-600">{row.notSubmittedCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
