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
import * as devoteeService from "../../services/devoteeService";
import ProgressCard from "../../components/dashboard/ProgressCard";
import ChartCard from "../../components/charts/ChartCard";
import JapaRoundsChart from "../../components/charts/JapaRoundsChart";
import ActivityConsistencyChart from "../../components/charts/ActivityConsistencyChart";
import LoadingState from "../../components/ui/LoadingState";
import DatePicker from "../../components/ui/DatePicker";
import Button from "../../components/ui/Button";

export default function Reports() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [cursor, setCursor] = useState(() => {
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth() };
  });
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

  const now = new Date();
  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

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
    if (!overview) return;
    downloadCSV(
      `sangha-report-${formatMonthYear(new Date(cursor.year, cursor.month), locale)}`,
      overview.dailyMalaAverages,
      [
        { key: "date", label: "Date" },
        { key: "japaRounds", label: "Average Mala" },
      ],
      `Exported by: ${user?.name ?? user?.email ?? "Admin"}`
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.reportsTitle")}
        subtitle={t("admin.reportsSubtitle")}
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
              {t("admin.exportCsv")}
            </Button>
          </div>
        }
      />

      {isLoading || !overview ? (
        <LoadingState fullHeight />
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

          <ChartCard title={t("admin.malaProgressChart")} subtitle={t("admin.acrossAllDevotees")}>
            <JapaRoundsChart data={overview.dailyMalaAverages} />
          </ChartCard>

          <ChartCard title={t("admin.activityConsistency")} subtitle={t("admin.sanghaWide")} height={300}>
            <ActivityConsistencyChart data={translatedBreakdown} />
          </ChartCard>
        </>
      )}
    </div>
  );
}
