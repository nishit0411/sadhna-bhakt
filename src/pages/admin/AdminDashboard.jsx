import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle2, Clock3, Repeat, Armchair, PersonStanding, Search } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { addDays, formatLongDate, toISODate } from "../../utils/dateHelpers";
import { useTranslation } from "../../i18n/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import DevoteeTable from "../../components/admin/DevoteeTable";
import MalaBreakdownTable from "../../components/admin/MalaBreakdownTable";
import LoadingState from "../../components/ui/LoadingState";
import Card from "../../components/ui/Card";
import DatePicker from "../../components/ui/DatePicker";

/**
 * Daily Sadhana dashboard, shared by admin and mentor.
 *
 * Admin (default): every devotee. Mentor (`mode="mentor"`): the same view,
 * but every query is limited by RLS to the mentor's own mentees and rows open
 * the mentor's read-only devotee page. Mentors get no edit / user-management
 * actions here — admin keeps full control over users.
 *
 * The day picker changes every number and table on the page.
 */
export default function AdminDashboard({ mode = "admin" }) {
  const isMentor = mode === "mentor";
  const base = isMentor ? "/mentor" : "/admin";
  const { t, locale } = useTranslation();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const todayISO = toISODate(new Date());
  const [date, setDate] = useState(todayISO);
  const [devotees, setDevotees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    devoteeService
      .getDevoteeDirectory(date)
      .then((list) => {
        if (!active) return;
        setDevotees(list);
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
  }, [date]);

  const overview = useMemo(() => devoteeService.buildDayOverview(devotees), [devotees]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? devotees.filter((d) => d.name.toLowerCase().includes(q)) : devotees;
  }, [devotees, search]);

  const isToday = date === todayISO;
  const dayLabel = isToday ? t("admin.dashboardToday") : formatLongDate(date, locale);
  // Admin-only shortcuts into the Devotees list; mentors stay on this page.
  const toDevotees = (query = "") => (isMentor ? undefined : () => navigate(`/admin/devotees${query}`));
  const toAnalytics = () => navigate(`${base}/analytics`);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isMentor ? t("mentor.dashboardTitle") : t("admin.dashboardTitle")}
        subtitle={isMentor ? t("mentor.dashboardSubtitle", { count: devotees.length }) : t("admin.dashboardSubtitle")}
        action={
          <DatePicker
            label={dayLabel}
            onPrev={() => setDate((d) => addDays(d, -1))}
            onNext={() => !isToday && setDate((d) => addDays(d, 1))}
            nextDisabled={isToday}
          />
        }
      />

      {isLoading ? (
        <LoadingState fullHeight />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <StatCard
              icon={Users}
              label={isMentor ? t("mentor.totalMentees") : t("admin.totalDevotees")}
              value={overview.totalDevotees}
              tone="maroon"
              onClick={toDevotees()}
            />
            <StatCard
              icon={CheckCircle2}
              label={t("admin.submittedOn", { day: dayLabel })}
              value={overview.submittedToday}
              tone="sage"
              onClick={isToday ? toDevotees("?status=Completed") : undefined}
            />
            <StatCard
              icon={Clock3}
              label={t("admin.pendingOn", { day: dayLabel })}
              value={overview.pendingToday}
              tone="saffron"
              onClick={isToday ? toDevotees("?status=Pending") : undefined}
            />
          </div>

          <div>
            <h2 className="mb-3 font-display text-xl font-semibold text-maroon-600">{t("admin.malaSummaryOn", { day: dayLabel })}</h2>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard icon={Repeat} label={t("admin.averageMala")} value={overview.averageMala} tone="maroon" onClick={toAnalytics} />
              <StatCard icon={Repeat} label={t("admin.totalMalaChanted")} value={overview.totalMalaChanted} tone="saffron" onClick={toAnalytics} />
              <StatCard icon={Armchair} label={t("admin.totalOnAsan")} value={overview.totalMalaOnAsan} tone="sage" onClick={toAnalytics} />
              <StatCard
                icon={PersonStanding}
                label={t("admin.totalWithoutAsan")}
                value={overview.totalMalaWithoutAsan}
                tone="clay"
                onClick={toAnalytics}
              />
            </div>
          </div>

          <Card padded={false}>
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-brown-900/5 px-5 py-4 sm:px-6">
              <div>
                <h2 className="font-display text-lg font-semibold text-maroon-600">{t("admin.sadhanaOverviewOn", { day: dayLabel })}</h2>
                <p className="mt-0.5 text-xs text-brown-500">{t("admin.rowClickHint")}</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("admin.searchPlaceholder")}
                  aria-label={t("admin.searchPlaceholder")}
                  className="w-full rounded-xl border border-brown-900/10 bg-cream-50 py-2 pl-10 pr-4 text-base focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:text-sm"
                />
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <DevoteeTable devotees={filtered} basePath={`${base}/devotees`} />
            </div>
          </Card>

          <Card id="mala-breakdown" padded={false} className="scroll-mt-20">
            <div className="border-b border-brown-900/5 px-5 py-4 sm:px-6">
              <h2 className="font-display text-lg font-semibold text-maroon-600">{t("admin.malaBreakdown")}</h2>
              <p className="mt-0.5 text-xs text-brown-500">{t("admin.rowClickHint")}</p>
            </div>
            <div className="p-4 sm:p-6">
              <MalaBreakdownTable rows={overview.malaTable} basePath={`${base}/devotees`} />
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
