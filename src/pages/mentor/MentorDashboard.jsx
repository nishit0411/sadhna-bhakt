import { useEffect, useMemo, useState } from "react";
import { Search, Users, CheckCircle2, Repeat, CalendarCheck } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { formatMonthYear, toISODate } from "../../utils/dateHelpers";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import DevoteeTable from "../../components/admin/DevoteeTable";
import LoadingState from "../../components/ui/LoadingState";
import StatCard from "../../components/dashboard/StatCard";
import DatePicker from "../../components/ui/DatePicker";

/**
 * Mentor Dashboard — read-only, scoped to "my mentees" entirely by RLS.
 *
 * getDevoteeDirectory() calls fetchAllDevotees() + fetchAllRecordsGrouped(),
 * both limited by RLS policies:
 *   profiles:  mentor_id = auth.uid()
 *   records:   profiles.mentor_id = auth.uid()
 *
 * So a mentor calling this endpoint only ever sees their own mentees — no
 * admin access needed, no cross-mentor leakage possible.
 *
 * No edit, no password change, no user-modification features — mentors can
 * only view and download reports for their assigned devotees. Admin retains
 * complete control over user management.
 */
export default function MentorDashboard() {
  const { t, locale } = useTranslation();
  const { addToast } = useToast();
  const [devotees, setDevotees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const now = new Date();
  const [cursor, setCursor] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const [monthStats, setMonthStats] = useState(null);

  const date = toISODate(now);

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

  // Load monthly stats for the selected month (RLS-scoped to mentor's mentees)
  useEffect(() => {
    let active = true;
    devoteeService
      .getSanghaMonthlyOverview(cursor.year, cursor.month)
      .then((data) => {
        if (!active) return;
        setMonthStats(data);
      })
      .catch(() => {
        // Monthly stats are best-effort; don't show an error toast if they fail
        // since the main mentees list already loaded.
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

  const filtered = useMemo(
    () => devotees.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase())),
    [devotees, search]
  );

  const submittedToday = devotees.filter((d) => d.status === "Completed");
  const totalMalaToday = submittedToday.reduce((sum, d) => sum + (d.todayTotalMala ?? 0), 0);

  if (isLoading) return <LoadingState fullHeight />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("mentor.dashboardTitle")}
        subtitle={t("mentor.dashboardSubtitle", { count: devotees.length })}
        action={
          <DatePicker
            label={formatMonthYear(new Date(cursor.year, cursor.month), locale)}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            nextDisabled={isCurrentMonth}
          />
        }
      />

      {/* Stat cards — scoped to mentor's mentees via RLS */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label={t("mentor.totalMentees")}
          value={devotees.length}
          tone="maroon"
        />
        <StatCard
          icon={CheckCircle2}
          label={t("mentor.submittedToday")}
          value={submittedToday.length}
          tone="sage"
        />
        <StatCard
          icon={Repeat}
          label={t("mentor.totalMala")}
          value={monthStats?.totalMala ?? totalMalaToday}
          tone="saffron"
        />
        <StatCard
          icon={CalendarCheck}
          label={t("mentor.activeDays")}
          value={monthStats?.activeDays ?? 0}
          tone="clay"
        />
      </div>

      <Card>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            aria-label={t("admin.searchPlaceholder")}
            className="w-full rounded-xl border border-brown-900/10 bg-cream-50 py-2.5 pl-10 pr-4 text-base focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:text-sm"
          />
        </div>
      </Card>

      {filtered.length ? (
        <DevoteeTable devotees={filtered} basePath="/mentor/devotees" />
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-brown-500">
          <p>{t("mentor.noMentees")}</p>
          <p className="text-xs mt-1">{t("mentor.noMenteesDesc")}</p>
        </div>
      )}
    </div>
  );
}
