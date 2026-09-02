import { useEffect, useMemo, useState } from "react";
import { Sparkles, Sprout } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import * as sadhanaService from "../../services/sadhanaService";
import { daysInMonth, formatMonthYear } from "../../utils/dateHelpers";
import { getActivityBreakdown } from "../../utils/activityBreakdown";
import { NO_GRANTH_VALUE } from "../../data/granthList";
import { NO_HARIKATHA_VALUE } from "../../data/harikathaList";
import { useTranslation } from "../../i18n/LanguageContext";
import PageHeader from "../../components/layout/PageHeader";
import DatePicker from "../../components/ui/DatePicker";
import Card from "../../components/ui/Card";
import ProgressCard from "../../components/dashboard/ProgressCard";
import ChartCard from "../../components/charts/ChartCard";
import JapaRoundsChart from "../../components/charts/JapaRoundsChart";
import ActivityConsistencyChart from "../../components/charts/ActivityConsistencyChart";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import ProgressBar from "../../components/ui/ProgressBar";
import { CalendarX } from "lucide-react";

export default function MonthlyReport() {
  const { user } = useAuth();
  const { t, locale } = useTranslation();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    sadhanaService.getMonthlyRecords(user.id, cursor.year, cursor.month).then((data) => {
      if (!active) return;
      setRecords([...data].sort((a, b) => a.date.localeCompare(b.date)));
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [user.id, cursor]);

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const totalDays = daysInMonth(cursor.year, cursor.month);

  const stats = useMemo(() => {
    if (!records.length) {
      return { totalMala: 0, avgMala: 0, granthDays: 0, harikathaDays: 0, bhogDays: 0, gurudevDays: 0 };
    }
    const totalMala = records.reduce((s, r) => s + r.totalMala, 0);
    return {
      totalMala,
      avgMala: Math.round((totalMala / records.length) * 100) / 100,
      granthDays: records.filter((r) => r.granthRead.some((g) => g !== NO_GRANTH_VALUE)).length,
      harikathaDays: records.filter((r) => r.harikathaSources.some((h) => h !== NO_HARIKATHA_VALUE)).length,
      bhogDays: records.filter((r) => r.bhogOffered).length,
      gurudevDays: records.filter((r) => r.gurudevRemembrance).length,
    };
  }, [records]);

  const breakdown = useMemo(() => getActivityBreakdown(records, t), [records, t]);
  const strongest = useMemo(() => [...breakdown].sort((a, b) => b.value - a.value)[0], [breakdown]);
  const weakest = useMemo(() => [...breakdown].sort((a, b) => a.value - b.value)[0], [breakdown]);

  function goToPrevMonth() {
    setCursor((prev) => (prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }));
  }
  function goToNextMonth() {
    if (isCurrentMonth) return;
    setCursor((prev) => (prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }));
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${formatMonthYear(new Date(cursor.year, cursor.month), locale)} ${t("monthlyReport.pageTitleSuffix")}`}
        subtitle={t("monthlyReport.subtitle")}
        action={
          <DatePicker
            label={formatMonthYear(new Date(cursor.year, cursor.month), locale)}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            nextDisabled={isCurrentMonth}
          />
        }
      />

      {isLoading ? (
        <LoadingState fullHeight />
      ) : !records.length ? (
        <EmptyState icon={CalendarX} title={t("monthlyReport.noRecordsTitle")} description={t("monthlyReport.noRecordsBody")} />
      ) : (
        <>
          <Card className="flex flex-col items-center gap-2 bg-maroon-500 text-center text-cream-50">
            <p className="font-display text-6xl font-semibold">{Math.round((records.length / totalDays) * 100)}%</p>
            <p className="text-sm text-cream-100/80">{t("monthlyReport.daysCompletedHero")}</p>
            <div className="mt-2 w-full max-w-xs">
              <ProgressBar value={records.length} max={totalDays} tone="saffron" trackClassName="bg-cream-100/20" />
            </div>
          </Card>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ProgressCard label={t("monthlyReport.daysSubmitted")} value={`${records.length} / ${totalDays}`} />
            <ProgressCard label={t("monthlyReport.totalMala")} value={`${stats.totalMala}`} />
            <ProgressCard label={t("monthlyReport.averageMala")} value={`${stats.avgMala}`} />
            <ProgressCard label={t("monthlyReport.granthReading")} value={`${stats.granthDays}`} />
            <ProgressCard label={t("monthlyReport.harikatha")} value={`${stats.harikathaDays}`} />
            <ProgressCard label={t("monthlyReport.bhogPrasadam")} value={`${stats.bhogDays}`} />
            <ProgressCard label={t("monthlyReport.gurudevRemembrance")} value={`${stats.gurudevDays}`} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title={t("monthlyReport.malaProgressChart")}>
              <JapaRoundsChart data={records.map((r) => ({ date: r.date, japaRounds: r.totalMala }))} />
            </ChartCard>
            <ChartCard title={t("monthlyReport.activityConsistencyChart")}>
              <ActivityConsistencyChart data={breakdown} />
            </ChartCard>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="flex items-start gap-3 bg-sage-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-brown-900">{t("monthlyReport.strongestPracticeTitle")}</p>
                <p className="mt-1 text-sm text-brown-600">
                  {t("monthlyReport.strongestPracticeBody", { label: strongest.label, value: strongest.value })}
                </p>
              </div>
            </Card>
            <Card className="flex items-start gap-3 bg-saffron-50">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saffron-100 text-saffron-600">
                <Sprout className="h-5 w-5" />
              </span>
              <div>
                <p className="font-display text-base font-semibold text-brown-900">{t("monthlyReport.consistencyAreaTitle")}</p>
                <p className="mt-1 text-sm text-brown-600">
                  {t("monthlyReport.consistencyAreaBody", { label: weakest.label, value: weakest.value })}
                </p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
