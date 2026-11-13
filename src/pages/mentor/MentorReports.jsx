import { useMemo } from "react";
import { Download } from "lucide-react";
import { formatMonthYear } from "../../utils/dateHelpers";
import { ACTIVITY_LABEL_KEYS } from "../../utils/activityBreakdown";
import { downloadCSV } from "../../utils/csvExport";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { useMonthlyReport } from "../../hooks/useMonthlyReport";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../../components/ui/Pagination";
import { describeFilters, exportColumns, exportFileSuffix, toMasterExportRows, MASTER_EXPORT_KEYS } from "../../utils/reportFilters";
import PageHeader from "../../components/layout/PageHeader";
import ProgressCard from "../../components/dashboard/ProgressCard";
import ChartCard from "../../components/charts/ChartCard";
import JapaRoundsChart from "../../components/charts/JapaRoundsChart";
import ActivityConsistencyChart from "../../components/charts/ActivityConsistencyChart";
import LoadingState from "../../components/ui/LoadingState";
import Button from "../../components/ui/Button";
import ReportFilterBar from "../../components/admin/ReportFilterBar";
import MasterReportTable from "../../components/admin/MasterReportTable";

// Stable reference — the mentor view has no mentor filter (RLS already
// scopes every query to this mentor's own mentees).
const NO_MENTORS = [];
const MENTOR_FILTERS = { search: true, location: true, month: true, status: true, mentor: false };

/**
 * Mentor Reports — read-only, scoped to the mentor's own mentees by RLS.
 * Shares the admin report's filter state, aggregation, Master Report table
 * and CSV allowlist; mentors can view and download only.
 */
export default function MentorReports() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const onError = (err) => addToast(friendlyErrorMessage(err, t, "errors.loadFailed"), "error");

  const { filters, setFilters, resetFilters, rows, filteredRows, locationOptions, overview, isLoading, isOverviewLoading } =
    useMonthlyReport({ mentors: NO_MENTORS, onError });

  const translatedBreakdown = useMemo(() => {
    if (!overview) return [];
    return overview.activityBreakdown.map((item) => ({
      ...item,
      label: ACTIVITY_LABEL_KEYS[item.key] ? t(ACTIVITY_LABEL_KEYS[item.key]) : item.label,
    }));
  }, [overview, t]);

  const monthLabel = formatMonthYear(new Date(filters.cursor.year, filters.cursor.month), locale);
  const filterText = describeFilters(filters, { locationOptions, mentors: NO_MENTORS, t, monthLabel });
  const chartSubtitle = filterText
    ? t("admin.report.chartFiltered", { filters: filterText, count: filteredRows.length })
    : t("admin.report.chartAll", { month: monthLabel });
  const masterPage = usePagination(filteredRows);
  const submittedCount = filteredRows.filter((r) => r.submissions > 0).length;
  const suffix = exportFileSuffix(filters, { locationOptions });
  const exportNote = `Exported by: ${user?.name ?? user?.email ?? "Mentor"}`;

  // Master Report shows 50 devotees per page; its export downloads the page on screen.
  function handleExportMaster() {
    downloadCSV(`mentees-master-report-${suffix}-page-${masterPage.page}`, toMasterExportRows(masterPage.pageItems, t, filters.cursor), exportColumns(MASTER_EXPORT_KEYS, t), exportNote);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("mentor.reportsTitle")}
        subtitle={t("mentor.reportsSubtitle")}
      />

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={resetFilters}
        locationOptions={locationOptions}
        show={MENTOR_FILTERS}
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
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <ProgressCard label={t("mentor.activeMentees")} value={overview.activeDevotees} />
                <ProgressCard label={t("mentor.totalSubmissions")} value={overview.totalSubmissions} />
                <ProgressCard label={t("mentor.totalMala")} value={overview.totalMala} />
                <ProgressCard
                  label={t("mentor.averageMalaPerSubmission")}
                  value={overview.totalSubmissions ? Math.round((overview.totalMala / overview.totalSubmissions) * 10) / 10 : 0}
                />
              </div>

              {overview.dailyMalaAverages.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <ChartCard title={t("mentor.monthlyOverview")} subtitle={chartSubtitle}>
                    <JapaRoundsChart data={overview.dailyMalaAverages} />
                  </ChartCard>
                  <ChartCard title={t("admin.activityConsistency")} subtitle={chartSubtitle} height={300}>
                    <ActivityConsistencyChart data={translatedBreakdown} />
                  </ChartCard>
                </div>
              )}
            </>
          )}

          <section className="flex flex-col gap-3 border-t border-brown-900/5 pt-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-lg font-semibold text-maroon-600">{t("mentor.masterReport")}</h2>
                <p className="text-xs text-brown-500">{t("admin.report.masterDesc")}</p>
              </div>
              <Button variant="outline" size="sm" icon={Download} onClick={handleExportMaster} disabled={!filteredRows.length}>
                {masterPage.totalPages > 1
                  ? t("admin.report.exportMasterPage", { from: masterPage.from, to: masterPage.to })
                  : t("admin.report.exportMaster")}
              </Button>
            </div>
            <MasterReportTable rows={masterPage.pageItems} basePath="/mentor/devotees" />
            <Pagination {...masterPage} onPageChange={masterPage.setPage} />
          </section>
        </>
      )}
    </div>
  );
}
