import { useEffect, useState, useMemo } from "react";
import { Download } from "lucide-react";
import { formatMonthYear } from "../../utils/dateHelpers";
import { ACTIVITY_LABEL_KEYS } from "../../utils/activityBreakdown";
import { downloadCSV } from "../../utils/csvExport";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import { getAllMentors } from "../../services/mentorService";
import { useMonthlyReport } from "../../hooks/useMonthlyReport";
import {
  applyReportFilters,
  buildMentorSummary,
  describeFilters,
  exportColumns,
  exportFileSuffix,
  toExportRow,
  toMasterExportRows,
  MASTER_EXPORT_KEYS,
  MENTOR_SUMMARY_EXPORT_KEYS,
} from "../../utils/reportFilters";
import ProgressCard from "../../components/dashboard/ProgressCard";
import ChartCard from "../../components/charts/ChartCard";
import JapaRoundsChart from "../../components/charts/JapaRoundsChart";
import ActivityConsistencyChart from "../../components/charts/ActivityConsistencyChart";
import LoadingState from "../../components/ui/LoadingState";
import Button from "../../components/ui/Button";
import ReportFilterBar from "../../components/admin/ReportFilterBar";
import MasterReportTable from "../../components/admin/MasterReportTable";
import MentorSummaryTable from "../../components/admin/MentorSummaryTable";

export default function Reports() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [mentors, setMentors] = useState([]);
  const onError = (err) => addToast(friendlyErrorMessage(err, t, "errors.loadFailed"), "error");

  useEffect(() => {
    let active = true;
    getAllMentors()
      .then((list) => active && setMentors(list.map((m) => ({ id: m.id, name: m.name }))))
      .catch(onError);
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { filters, setFilters, resetFilters, rows, filteredRows, locationOptions, overview, isLoading, isOverviewLoading } =
    useMonthlyReport({ mentors, onError });

  // Mentor summary honours location + search + month, but not mentor/status (it *is* the per-mentor split).
  const mentorSummary = useMemo(
    () => buildMentorSummary(applyReportFilters(rows, filters, { mentors, skip: ["mentor", "status"] }), mentors),
    [rows, filters, mentors],
  );

  const translatedBreakdown = useMemo(() => {
    if (!overview) return [];
    return overview.activityBreakdown.map((item) => ({
      ...item,
      label: ACTIVITY_LABEL_KEYS[item.key] ? t(ACTIVITY_LABEL_KEYS[item.key]) : item.label,
    }));
  }, [overview, t]);

  const monthLabel = formatMonthYear(new Date(filters.cursor.year, filters.cursor.month), locale);
  const filterText = describeFilters(filters, { locationOptions, mentors: mentors, t, monthLabel });
  const chartSubtitle = filterText
    ? t("admin.report.chartFiltered", { filters: filterText, count: filteredRows.length })
    : t("admin.report.chartAll", { month: monthLabel });
  const submittedCount = filteredRows.filter((r) => r.submissions > 0).length;
  const suffix = exportFileSuffix(filters, { locationOptions, mentors });
  const exportNote = `Exported by: ${user?.name ?? user?.email ?? "Admin"}`;

  function handleExportDaily() {
    if (!overview) return;
    downloadCSV(
      `sangha-report-${suffix}`,
      overview.dailyMalaAverages,
      [
        { key: "date", label: "Date" },
        { key: "japaRounds", label: "Average Mala" },
        { key: "submissions", label: "Submissions" },
      ],
      exportNote,
    );
  }

  function handleExportMaster() {
    downloadCSV(`master-report-${suffix}`, toMasterExportRows(filteredRows, t), exportColumns(MASTER_EXPORT_KEYS, t), exportNote);
  }

  function handleExportMentorSummary() {
    downloadCSV(
      `mentor-summary-${suffix}`,
      mentorSummary.map((r) => toExportRow(r, MENTOR_SUMMARY_EXPORT_KEYS)),
      exportColumns(MENTOR_SUMMARY_EXPORT_KEYS, t),
      exportNote,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.reportsTitle")}
        subtitle={t("admin.reportsSubtitle")}
        action={
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportDaily} disabled={!overview?.dailyMalaAverages?.length}>
            {t("admin.exportCsv")}
          </Button>
        }
      />

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        locationOptions={locationOptions}
        mentorOptions={mentors}
      />

      {isLoading ? (
        <LoadingState fullHeight />
      ) : (
        <>
          <p className="-mt-2 text-xs text-brown-500">{t("admin.report.showing", { count: filteredRows.length, total: rows.length })}</p>

          <div className="grid grid-cols-3 gap-4">
            <ProgressCard label={t("admin.report.devotees")} value={filteredRows.length} />
            <ProgressCard label={t("admin.report.submitted")} value={submittedCount} />
            <ProgressCard label={t("admin.report.notSubmitted")} value={filteredRows.length - submittedCount} />
          </div>

          {isOverviewLoading || !overview ? (
            <LoadingState />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                <ProgressCard label={t("admin.totalMalaChanted")} value={overview.totalMala} />
                <ProgressCard label={t("admin.activeDaysLogged")} value={overview.activeDays} />
                <ProgressCard
                  label={t("admin.averageMalaPerDay")}
                  value={overview.activeDays ? Math.round((overview.totalMala / overview.activeDays) * 10) / 10 : 0}
                />
              </div>

              <ChartCard title={t("admin.malaProgressChart")} subtitle={chartSubtitle}>
                <JapaRoundsChart data={overview.dailyMalaAverages} />
              </ChartCard>

              <ChartCard title={t("admin.activityConsistency")} subtitle={chartSubtitle} height={300}>
                <ActivityConsistencyChart data={translatedBreakdown} />
              </ChartCard>
            </>
          )}

          {mentors.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-semibold text-maroon-600">{t("admin.report.mentorWiseTitle")}</h2>
                  <p className="text-xs text-brown-500">{t("admin.report.mentorWiseDesc")}</p>
                </div>
                <Button variant="outline" size="sm" icon={Download} onClick={handleExportMentorSummary}>
                  {t("admin.report.exportMentorWise")}
                </Button>
              </div>
              <MentorSummaryTable
                rows={mentorSummary}
                selectedId={filters.mentorId}
                onSelect={(mentorId) => setFilters({ ...filters, mentorId })}
              />
            </section>
          )}

          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-maroon-600">{t("admin.report.masterTitle")}</h2>
                <p className="text-xs text-brown-500">{t("admin.report.masterDesc")}</p>
              </div>
              <Button variant="outline" size="sm" icon={Download} onClick={handleExportMaster} disabled={!filteredRows.length}>
                {t("admin.report.exportMaster")}
              </Button>
            </div>
            <MasterReportTable rows={filteredRows} />
          </section>
        </>
      )}
    </div>
  );
}
