import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import { useTranslation } from "../../i18n/LanguageContext";
import { formatDateDDMMYYYY } from "../../utils/dateFormatter";
import { formatMentorNames } from "../../data/mentorList";
import { displayLocation } from "../../utils/reportFilters";

/**
 * Master Report: one row per devotee for the selected month, from
 * getMonthlySubmissionReport(). Devotees with zero reports are shown as
 * Not Submitted. Rows open the existing devotee detail page.
 */
export default function MasterReportTable({ rows, basePath = "/admin/devotees" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!rows.length) {
    return <EmptyState icon={Users} title={t("admin.report.noResults")} description={t("admin.report.noResultsDesc")} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brown-900/5">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
            <th className="px-4 py-3">{t("admin.report.colDevotee")}</th>
            <th className="px-4 py-3">{t("admin.report.colPhone")}</th>
            <th className="px-4 py-3">{t("admin.report.colLocation")}</th>
            <th className="px-4 py-3">{t("admin.report.colMentor")}</th>
            <th className="px-4 py-3 text-right">{t("admin.report.colSubmissions")}</th>
            <th className="px-4 py-3">{t("admin.report.colLatest")}</th>
            <th className="px-4 py-3 text-right">{t("admin.report.colTotalMala")}</th>
            <th className="px-4 py-3">{t("admin.report.colStatus")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const submitted = row.submissions > 0;
            return (
              <tr
                key={row.id}
                onClick={() => navigate(`${basePath}/${row.id}`)}
                className="cursor-pointer border-b border-brown-900/5 bg-cream-50 transition-colors last:border-0 hover:bg-beige-100"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-brown-900">{row.name}</p>
                  {row.centre && <p className="text-xs text-brown-500">{row.centre}</p>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-brown-700">
                  {row.phone ? (
                    <a href={`tel:${row.phone}`} onClick={(e) => e.stopPropagation()} className="hover:text-maroon-600 hover:underline">
                      {row.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-brown-700">{displayLocation(row.city) || "—"}</td>
                <td className="px-4 py-3 text-brown-700">{formatMentorNames(row.mentor, row.mentorOther)}</td>
                <td className="px-4 py-3 text-right font-medium text-brown-900">{row.submissions}</td>
                <td className="px-4 py-3 text-brown-700">{row.latestSubmission ? formatDateDDMMYYYY(row.latestSubmission) : "—"}</td>
                <td className="px-4 py-3 text-right text-brown-700">{row.totalMala}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={submitted ? "completed" : "missed"}
                    label={submitted ? t("admin.filters.submitted") : t("admin.filters.notSubmitted")}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
