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
import Button from "../../components/ui/Button";

export default function Reports() {
  const { t, locale } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const now = new Date();
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    devoteeService
      .getSanghaMonthlyOverview(now.getFullYear(), now.getMonth())
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
  }, []);

  const translatedBreakdown = useMemo(() => {
    if (!overview) return [];
    return overview.activityBreakdown.map((item) => ({
      ...item,
      label: ACTIVITY_LABEL_KEYS[item.key] ? t(ACTIVITY_LABEL_KEYS[item.key]) : item.label,
    }));
  }, [overview, t]);

  if (isLoading) return <LoadingState fullHeight />;

  function handleExport() {
    downloadCSV(
      `sangha-report-${formatMonthYear(now, locale)}`,
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
        subtitle={`${formatMonthYear(now, locale)} · ${t("admin.reportsSubtitle")}`}
        action={
          <Button variant="outline" size="sm" icon={Download} onClick={handleExport} disabled={!overview.dailyMalaAverages?.length}>
            {t("admin.exportCsv")}
          </Button>
        }
      />

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
    </div>
  );
}
