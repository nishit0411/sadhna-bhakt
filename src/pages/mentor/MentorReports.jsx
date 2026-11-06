import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { formatMonthYear } from "../../utils/dateHelpers";
import { ACTIVITY_LABEL_KEYS } from "../../utils/activityBreakdown";
import { downloadCSV } from "../../utils/csvExport";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import * as devoteeService from "../../services/devoteeService";
import ProgressCard from "../../components/dashboard/ProgressCard";
import ChartCard from "../../components/charts/ChartCard";
import JapaRoundsChart from "../../components/charts/JapaRoundsChart";
import ActivityConsistencyChart from "../../components/charts/ActivityConsistencyChart";
import LoadingState from "../../components/ui/LoadingState";
import DatePicker from "../../components/ui/DatePicker";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";

/**
 * Mentor Reports — read-only, scoped to the mentor's own mentees via RLS.
 *
 * getSanghaMonthlyOverview() calls fetchAllRecordsGrouped(), which is limited
 * by the sadhana_select_own_or_admin RLS policy to records where
 * profiles.mentor_id = auth.uid(). So a mentor calling this endpoint only ever
 * sees their own mentees' data — no admin access needed, no cross-mentor
 * leakage possible.
 *
 * No edit, no password change, no user-modification features — mentors can
 * only view and download reports for their assigned devotees.
 */
export default function MentorReports() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const now = new Date();
  const [cursor, setCursor] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    devoteeService
      .getSanghaMonthlyOverview(cursor.year, cursor.month)
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        addToast(friendlyErrorMessage(err, t, "errors.loadFailed"), "error");
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor]);

  const isCurrentMonth =
    cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  function goToPrevMonth() {
    setCursor((prev) => (prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }));
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setCursor((prev) => (prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }));
  }

  const translatedBreakdown = useMemo(() => {
    if (!overview) return [];
    return overview.activityBreakdown.map((item) => ({
      ...item,
      label: ACTIVITY_LABEL_KEYS[item.key] ? t(ACTIVITY_LABEL_KEYS[item.key]) : item.label,
    }));
  }, [overview, t]);

  function handleExport() {
    if (!overview?.dailyMalaAverages?.length) return;
    downloadCSV(
      `mentees-report-${formatMonthYear(new Date(cursor.year, cursor.month), locale)}`,
      overview.dailyMalaAverages,
      [
        { key: "date", label: "Date" },
        { key: "japaRounds", label: "Average Mala" },
        { key: "submissions", label: "Submissions" },
      ],
      `Exported by: ${user?.name ?? user?.email ?? "Mentor"}`
    );
  }

  if (isLoading) return <LoadingState fullHeight />;

  if (!overview || !overview.dailyMalaAverages?.length) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={t("mentor.reportsTitle")}
          subtitle={t("mentor.reportsSubtitle")}
          action={
            <DatePicker
              label={formatMonthYear(new Date(cursor.year, cursor.month), locale)}
              onPrev={goToPrevMonth}
              onNext={goToNextMonth}
              nextDisabled={isCurrentMonth}
            />
          }
        />
        <EmptyState
          icon={Download}
          title={t("mentor.noReportData")}
          description={t("mentor.noReportDataDesc")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("mentor.reportsTitle")}
        subtitle={t("mentor.reportsSubtitle")}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              label={formatMonthYear(new Date(cursor.year, cursor.month), locale)}
              onPrev={goToPrevMonth}
              onNext={goToNextMonth}
              nextDisabled={isCurrentMonth}
            />
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExport}
              disabled={!overview?.dailyMalaAverages?.length}
            >
              {t("mentor.exportMenteesCsv")}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <ProgressCard label={t("mentor.activeMentees")} value={overview.activeDevotees} />
        <ProgressCard label={t("mentor.totalSubmissions")} value={overview.totalSubmissions} />
        <ProgressCard label={t("mentor.totalMala")} value={overview.totalMala} />
        <ProgressCard
          label={t("mentor.averageMalaPerSubmission")}
          value={overview.totalSubmissions ? Math.round((overview.totalMala / overview.totalSubmissions) * 10) / 10 : 0}
        />
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
        <ChartCard title={t("mentor.monthlyOverview")} subtitle={t("admin.acrossAllDevotees")}>
          <JapaRoundsChart data={overview.dailyMalaAverages} />
        </ChartCard>

        <ChartCard title={t("admin.activityConsistency")} subtitle={t("admin.sanghaWide")} height={300}>
          <ActivityConsistencyChart data={translatedBreakdown} />
        </ChartCard>
      </div>

      <div className="border-t border-brown-900/5 pt-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-maroon-600">
          {t("mentor.masterReport")}
        </h2>
        <p className="text-xs text-brown-500 mb-4">
          {t("mentor.dailyBreakdownDesc")}
        </p>
        <div className="overflow-x-auto rounded-xl border border-brown-900/5">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
                <th className="px-4 py-3">{t("mentor.colDate")}</th>
                <th className="px-4 py-3">{t("mentor.colAvgMala")}</th>
                <th className="px-4 py-3">{t("mentor.colSubmissions")}</th>
              </tr>
            </thead>
            <tbody>
              {overview.dailyMalaAverages.map((row) => (
                <tr key={row.date} className="border-b border-brown-900/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-brown-900">{row.date}</td>
                  <td className="px-4 py-3 text-brown-700">{row.japaRounds}</td>
                  <td className="px-4 py-3 text-brown-700">{row.submissions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
