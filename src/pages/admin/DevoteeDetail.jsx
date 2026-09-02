import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Flame, Repeat, CalendarCheck, Sparkles, Users } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import * as sadhanaService from "../../services/sadhanaService";
import { getActivityBreakdown } from "../../utils/activityBreakdown";
import { useTranslation } from "../../i18n/LanguageContext";
import Card from "../../components/ui/Card";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import ChartCard from "../../components/charts/ChartCard";
import ActivityConsistencyChart from "../../components/charts/ActivityConsistencyChart";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import { formatLongDate } from "../../utils/dateHelpers";
import { NO_GRANTH_VALUE } from "../../data/granthList";
import { NO_HARIKATHA_VALUE } from "../../data/harikathaList";

const TONES = { maroon: "bg-maroon-500", saffron: "bg-saffron-500", sage: "bg-sage-500" };

function initiationSummary(devotee) {
  if (!devotee.dikshaStage) return null;
  const dateOrYear = devotee.initiationDate
    ? formatLongDate(devotee.initiationDate)
    : devotee.initiationYear
      ? devotee.initiationYear
      : null;
  return dateOrYear ? `${devotee.dikshaStage} · ${dateOrYear}` : devotee.dikshaStage;
}

export default function DevoteeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const now = new Date();
  const [devotee, setDevotee] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([devoteeService.getDevoteeSummary(id), sadhanaService.getMonthlyRecords(id, now.getFullYear(), now.getMonth())]).then(
      ([summary, month]) => {
        if (!active) return;
        setDevotee(summary);
        setRecords([...month].sort((a, b) => a.date.localeCompare(b.date)));
        setIsLoading(false);
      }
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const breakdown = useMemo(() => getActivityBreakdown(records, t), [records, t]);
  const totalMalaThisMonth = useMemo(() => records.reduce((sum, r) => sum + r.totalMala, 0), [records]);

  const yn = (v) => (v ? t("common.yes") : t("common.no"));

  if (isLoading) return <LoadingState fullHeight />;
  if (!devotee) {
    return (
      <EmptyState
        icon={Users}
        title={t("admin.devoteeNotFound")}
        description={t("admin.devoteeNotFoundDesc")}
        action={
          <Link to="/admin/devotees">
            <button className="text-sm font-medium text-maroon-600 hover:underline">{t("admin.backToDevotees")}</button>
          </Link>
        }
      />
    );
  }

  const initiation = initiationSummary(devotee);

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate("/admin/devotees")}
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brown-500 hover:text-maroon-600"
      >
        <ArrowLeft className="h-4 w-4" /> {t("admin.backToDevotees")}
      </button>

      <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-cream-50 ${TONES[devotee.avatarColor] ?? TONES.maroon}`}>
          {devotee.initials}
        </span>
        <div className="flex-1">
          <p className="font-display text-2xl font-semibold text-brown-900">{devotee.name}</p>
          <p className="text-sm text-brown-500">
            {devotee.centre} · {t("profile.mentor")}: {devotee.mentor}
          </p>
          <p className="text-xs text-brown-400">{devotee.email}</p>
          {initiation && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-xs font-medium text-saffron-600">
              <Sparkles className="h-3.5 w-3.5" /> {initiation}
            </p>
          )}
        </div>
        <StatusBadge
          status={devotee.status === "Completed" ? "completed" : "pending"}
          label={devotee.status === "Completed" ? t("common.completed") : t("common.pending")}
        />
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Repeat} label={t("admin.totalMalaThisMonth")} value={totalMalaThisMonth} tone="maroon" />
        <StatCard icon={Repeat} label={t("admin.averageMala")} value={devotee.averageMala} tone="saffron" />
        <StatCard icon={CalendarCheck} label={t("admin.completionRate")} value={devotee.completionRate} suffix="%" tone="sage" />
        <StatCard icon={Flame} label={t("admin.currentStreak")} value={devotee.currentStreak} suffix={t("dashboard.days")} tone="clay" />
      </div>

      {records.length ? (
        <>
          <ChartCard title={t("admin.activityConsistency")} subtitle={t("admin.thisMonthDaysSubmitted", { count: records.length })} height={280}>
            <ActivityConsistencyChart data={breakdown} />
          </ChartCard>

          <Card padded={false}>
            <div className="border-b border-brown-900/5 px-5 py-4 sm:px-6">
              <h2 className="font-display text-lg font-semibold text-maroon-600">{t("admin.monthlyHistory")}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
                    <th className="px-5 py-3">{t("common.date")}</th>
                    <th className="px-5 py-3">{t("admin.table.totalMala")}</th>
                    <th className="px-5 py-3">{t("admin.table.onAsan")}</th>
                    <th className="px-5 py-3">{t("admin.table.withoutAsan")}</th>
                    <th className="px-5 py-3">{t("admin.table.granth")}</th>
                    <th className="px-5 py-3">{t("admin.table.harikatha")}</th>
                    <th className="px-5 py-3">{t("admin.table.gaudiyaKirtan")}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...records].reverse().map((r) => (
                    <tr key={r.id} className="border-b border-brown-900/5 last:border-0">
                      <td className="px-5 py-3 font-medium text-brown-900">{formatLongDate(r.date)}</td>
                      <td className="px-5 py-3 text-brown-700">{r.totalMala ?? 0}</td>
                      <td className="px-5 py-3 text-brown-700">{r.malaOnAsan ?? 0}</td>
                      <td className="px-5 py-3 text-brown-700">{r.malaWithoutAsan ?? 0}</td>
                      <td className="px-5 py-3 text-brown-700">{yn(r.granthRead.some((g) => g !== NO_GRANTH_VALUE))}</td>
                      <td className="px-5 py-3 text-brown-700">{yn(r.harikathaSources.some((h) => h !== NO_HARIKATHA_VALUE))}</td>
                      <td className="px-5 py-3 text-brown-700">{yn(r.gaudiyaKirtan)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <EmptyState title={t("admin.noRecordsTitle")} description={t("admin.noRecordsDesc")} />
      )}
    </div>
  );
}
