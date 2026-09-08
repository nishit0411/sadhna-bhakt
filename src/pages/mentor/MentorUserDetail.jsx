import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Flame, Repeat, CalendarCheck, Sparkles, Users } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import * as sadhanaService from "../../services/sadhanaService";
import { getActivityBreakdown } from "../../utils/activityBreakdown";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import Card from "../../components/ui/Card";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import ChartCard from "../../components/charts/ChartCard";
import ActivityConsistencyChart from "../../components/charts/ActivityConsistencyChart";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import { formatLongDate } from "../../utils/dateHelpers";
import { formatDateDDMMYYYY } from "../../utils/dateFormatter";
import { NO_GRANTH_VALUE } from "../../data/granthList";
import { NO_HARIKATHA_VALUE } from "../../data/harikathaList";

const TONES = { maroon: "bg-maroon-500", saffron: "bg-saffron-500", sage: "bg-sage-500" };

function initiationSummary(devotee) {
  if (!devotee.dikshaStage) return null;
  const dateOrYear = devotee.initiationDate
    ? formatDateDDMMYYYY(devotee.initiationDate)
    : devotee.initiationYear
      ? devotee.initiationYear
      : null;
  return dateOrYear ? `${devotee.dikshaStage} · ${dateOrYear}` : devotee.dikshaStage;
}

/**
 * A mentor can only ever land here for their own mentees — there is no
 * separate authorization check in this component because none is
 * needed: getDevoteeSummary()/getMonthlyRecords() are RLS-scoped, so
 * trying to view any other devotee's id (typed directly into the URL,
 * or via DevTools) simply returns no row, which renders the same
 * "not found" state as a genuinely invalid id — never another mentor's
 * real data.
 */
export default function MentorUserDetail() {
  const { id } = useParams();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const now = new Date();
  const [devotee, setDevotee] = useState(null);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([devoteeService.getDevoteeSummary(id), sadhanaService.getMonthlyRecords(id, now.getFullYear(), now.getMonth())])
      .then(([summary, month]) => {
        if (!active) return;
        setDevotee(summary);
        setRecords([...month].sort((a, b) => a.date.localeCompare(b.date)));
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
  }, [id]);

  const breakdown = useMemo(() => getActivityBreakdown(records, t), [records, t]);
  const totalMalaThisMonth = useMemo(() => records.reduce((sum, r) => sum + r.totalMala, 0), [records]);

  const yn = (v) => (v ? t("common.yes") : t("common.no"));

  if (isLoading) return <LoadingState fullHeight />;
  if (!devotee) {
    return (
      <EmptyState
        icon={Users}
        title="User not found"
        description="This devotee doesn't exist, or isn't assigned to you."
        action={
          <Link to="/mentor-dashboard">
            <button className="text-sm font-medium text-maroon-600 hover:underline">Back to Dashboard</button>
          </Link>
        }
      />
    );
  }

  const initiation = initiationSummary(devotee);

  return (
    <div className="flex flex-col gap-6">
      <Link to="/mentor-dashboard" className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brown-500 hover:text-maroon-600">
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </Link>

      <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
        <span className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-cream-50 ${TONES[devotee.avatarColor] ?? TONES.maroon}`}>
          {devotee.initials}
        </span>
        <div className="flex-1">
          <p className="font-display text-2xl font-semibold text-brown-900">{devotee.name}</p>
          <p className="text-sm text-brown-500">{devotee.centre || devotee.city}</p>
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

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-maroon-600">Personal Information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm"><span className="text-brown-500">First Name:</span> <span className="text-brown-900">{devotee.firstName || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Last Name:</span> <span className="text-brown-900">{devotee.lastName || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Spiritual Name:</span> <span className="text-brown-900">{devotee.spiritualName || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Date of Birth:</span> <span className="text-brown-900">{devotee.dob ? formatDateDDMMYYYY(devotee.dob) : "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Sex:</span> <span className="text-brown-900">{devotee.sex || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">City:</span> <span className="text-brown-900">{devotee.city || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Mobile:</span> <span className="text-brown-900">{devotee.phone || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Email:</span> <span className="text-brown-900">{devotee.email}</span></p>
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-semibold text-maroon-600">Spiritual Information</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <p className="text-sm"><span className="text-brown-500">Srila Gurudev:</span> <span className="text-brown-900">{devotee.gurudevName || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Initiation Stage:</span> <span className="text-brown-900">{devotee.dikshaStage || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Initiation Date:</span> <span className="text-brown-900">{devotee.initiationDate ? formatDateDDMMYYYY(devotee.initiationDate) : devotee.initiationYear || "—"}</span></p>
          <p className="text-sm"><span className="text-brown-500">Registered:</span> <span className="text-brown-900">{formatLongDate(devotee.joinedOn?.slice(0, 10))}</span></p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Repeat} label="Mala This Month" value={totalMalaThisMonth} tone="maroon" />
        <StatCard icon={Repeat} label="Average Mala" value={devotee.averageMala} tone="saffron" />
        <StatCard icon={CalendarCheck} label="Completion Rate" value={devotee.completionRate} suffix="%" tone="sage" />
        <StatCard icon={Flame} label="Current Streak" value={devotee.currentStreak} suffix={t("dashboard.days")} tone="clay" />
      </div>

      {records.length ? (
        <>
          <ChartCard title="Activity Consistency" subtitle={`${records.length} days submitted this month`} height={280}>
            <ActivityConsistencyChart data={breakdown} />
          </ChartCard>

          <Card padded={false}>
            <div className="border-b border-brown-900/5 px-5 py-4 sm:px-6">
              <h2 className="font-display text-lg font-semibold text-maroon-600">Monthly History</h2>
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
