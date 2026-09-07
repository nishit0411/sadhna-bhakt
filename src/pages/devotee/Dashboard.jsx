import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Repeat,
  BookOpenText,
  Flame,
  Leaf,
  Headphones,
  UtensilsCrossed,
  Sparkles,
  Music,
  Sunrise,
  CalendarX,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import * as sadhanaService from "../../services/sadhanaService";
import { formatLongDate, formatMonthYear, toISODate } from "../../utils/dateHelpers";
import { getActivityBreakdown } from "../../utils/activityBreakdown";
import { NO_GRANTH_VALUE } from "../../data/granthList";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import StatCard from "../../components/dashboard/StatCard";
import ActivityCard from "../../components/dashboard/ActivityCard";
import ProgressCard from "../../components/dashboard/ProgressCard";
import SadhanaCard from "../../components/dashboard/SadhanaCard";
import ChartCard from "../../components/charts/ChartCard";
import JapaRoundsChart from "../../components/charts/JapaRoundsChart";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

const ACTIVITY_ICONS = {
  japa: Repeat,
  tulsi: Leaf,
  granth: BookOpenText,
  harikatha: Headphones,
  kirtan: Music,
  mangalaarati: Sunrise,
  bhog: UtensilsCrossed,
  gurudev: Sparkles,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t, locale } = useTranslation();
  const displayName = user.spiritualName || user.name.split(" ")[0];
  const [isLoading, setIsLoading] = useState(true);
  const [todayEntry, setTodayEntry] = useState(null);
  const [recentDays, setRecentDays] = useState([]);
  const [monthRecords, setMonthRecords] = useState([]);
  const [streak, setStreak] = useState(0);

  const today = toISODate(new Date());
  const now = new Date();

  useEffect(() => {
    let active = true;
    async function load() {
      const [entry, recent, month, currentStreak] = await Promise.all([
        sadhanaService.getTodayEntry(user.id),
        sadhanaService.getRecentDays(user.id, 7),
        sadhanaService.getMonthlyRecords(user.id, now.getFullYear(), now.getMonth()),
        sadhanaService.getCurrentStreak(user.id),
      ]);
      if (!active) return;
      setTodayEntry(entry);
      setRecentDays(recent);
      setMonthRecords(month);
      setStreak(currentStreak);
      setIsLoading(false);
    }
    load().catch((err) => {
      if (!active) return;
      addToast(friendlyErrorMessage(err, t, "errors.loadFailed"), "error");
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const monthlyStats = useMemo(() => {
    if (!monthRecords.length) return { totalMala: 0, daysCompleted: 0, avgMala: 0, granthDays: 0 };
    const totalMala = monthRecords.reduce((s, r) => s + r.totalMala, 0);
    const avgMala = Math.round((totalMala / monthRecords.length) * 10) / 10;
    const granthDays = monthRecords.filter((r) => r.granthRead.some((g) => g !== NO_GRANTH_VALUE)).length;
    return { totalMala, daysCompleted: monthRecords.length, avgMala, granthDays };
  }, [monthRecords]);

  const activityBreakdown = useMemo(() => getActivityBreakdown(monthRecords, t), [monthRecords, t]);
  const chartData = useMemo(
    () =>
      [...monthRecords]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((r) => ({ date: r.date, japaRounds: r.totalMala })),
    [monthRecords]
  );
  const daysInThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  if (isLoading) return <LoadingState fullHeight />;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-maroon-600 sm:text-3xl">
          {t("dashboard.greeting")} {displayName} 🙏
        </h1>
        <p className="mt-1 text-sm text-brown-600">{t("dashboard.subtitle")}</p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-brown-400">{formatLongDate(today, locale)}</p>
      </div>

      <SadhanaCard todayEntry={todayEntry} formattedDate={formatLongDate(today, locale)} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Repeat} label={t("dashboard.totalMala")} value={todayEntry ? todayEntry.totalMala : "—"} tone="maroon" />
        <StatCard
          icon={BookOpenText}
          label={t("dashboard.granthRead")}
          value={todayEntry ? (todayEntry.granthRead.some((g) => g !== NO_GRANTH_VALUE) ? t("common.yes") : t("common.no")) : "—"}
          tone="sage"
        />
        <StatCard icon={Flame} label={t("dashboard.currentStreak")} value={streak} suffix={`${t("dashboard.days")} 🔥`} tone="clay" />
      </div>

      <ChartCard
        title={formatMonthYear(now, locale)}
        subtitle={t("dashboard.malaProgress")}
        action={
          <Link to="/devotee/monthly-report" className="text-xs font-medium text-maroon-500 hover:underline">
            {t("dashboard.fullReport")} →
          </Link>
        }
      >
        {chartData.length ? (
          <JapaRoundsChart data={chartData} />
        ) : (
          <EmptyState icon={CalendarX} title={t("dashboard.noEntriesYetTitle")} description={t("dashboard.noEntriesYetBody")} />
        )}
      </ChartCard>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ProgressCard label={t("dashboard.totalMala")} value={`${monthlyStats.totalMala}`} />
        <ProgressCard label={t("dashboard.daysCompleted")} value={`${monthlyStats.daysCompleted} / ${daysInThisMonth}`} />
        <ProgressCard label={t("dashboard.averageMala")} value={`${monthlyStats.avgMala}`} />
        <ProgressCard label={t("dashboard.granthReading")} value={`${monthlyStats.granthDays} ${t("dashboard.days")}`} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-semibold text-maroon-600">{t("dashboard.activityBreakdown")}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {activityBreakdown.map((activity) => (
            <ActivityCard key={activity.key} icon={ACTIVITY_ICONS[activity.key]} label={activity.label} percentage={activity.value} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-semibold text-maroon-600">{t("dashboard.recentDays")}</h2>
        {recentDays.length ? (
          <div className="overflow-x-auto rounded-2xl border border-brown-900/5">
            <table className="w-full min-w-[480px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
                  <th className="px-4 py-3">{t("common.date")}</th>
                  <th className="px-4 py-3">{t("activity.mala")}</th>
                  <th className="px-4 py-3">{t("activity.granthReading")}</th>
                  <th className="px-4 py-3">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {recentDays.map((record) => (
                  <tr key={record.id} className="border-b border-brown-900/5 bg-cream-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-brown-900">{formatLongDate(record.date, locale)}</td>
                    <td className="px-4 py-3 text-brown-700">{record.totalMala}</td>
                    <td className="px-4 py-3 text-brown-700">
                      {record.granthRead.some((g) => g !== NO_GRANTH_VALUE) ? t("common.yes") : t("common.no")}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status="completed" label={t("common.completed")} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={CalendarX} title={t("dashboard.noRecentTitle")} description={t("dashboard.noRecentBody")} />
        )}
      </div>
    </div>
  );
}
