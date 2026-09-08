import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, UserCheck, BookOpenText, Repeat, Search } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import { formatLongDate } from "../../utils/dateHelpers";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import StatCard from "../../components/dashboard/StatCard";
import StatusBadge from "../../components/ui/StatusBadge";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest Registration" },
  { value: "alphabetical", label: "Alphabetical" },
  { value: "progress", label: "Sadhana Progress" },
];

export default function MentorDashboard() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t, locale } = useTranslation();
  const navigate = useNavigate();

  const [mentees, setMentees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [sexFilter, setSexFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    // windowDays: Infinity gives each mentee's true all-time total mala /
    // days-submitted for the stat cards below, while todayEntry/status
    // (used by the table's Status column) is always computed against
    // today regardless of the window. No devotee_id filter here — RLS
    // alone restricts this to just this mentor's own mentees.
    devoteeService
      .getDevoteeDirectory(undefined, Infinity)
      .then((list) => {
        if (!active) return;
        setMentees(list);
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

  const stats = useMemo(() => {
    const totalUsers = mentees.length;
    const activeUsers = mentees.filter((m) => m.daysSubmitted > 0).length;
    const totalRecords = mentees.reduce((sum, m) => sum + m.daysSubmitted, 0);
    const totalMala = mentees.reduce((sum, m) => sum + m.windowTotalMala, 0);
    return { totalUsers, activeUsers, totalRecords, totalMala };
  }, [mentees]);

  const cityOptions = useMemo(() => [...new Set(mentees.map((m) => m.city).filter(Boolean))].sort(), [mentees]);
  const stageOptions = useMemo(() => [...new Set(mentees.map((m) => m.dikshaStage).filter(Boolean))], [mentees]);

  const filtered = useMemo(() => {
    let list = mentees.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || (m.phone ?? "").includes(q);
        if (!matches) return false;
      }
      if (stageFilter !== "all" && m.dikshaStage !== stageFilter) return false;
      if (cityFilter !== "all" && m.city !== cityFilter) return false;
      if (sexFilter !== "all" && m.sex !== sexFilter) return false;
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      return true;
    });

    list = [...list];
    if (sortBy === "alphabetical") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortBy === "progress") list.sort((a, b) => b.completionRate - a.completionRate);
    else list.sort((a, b) => new Date(b.joinedOn ?? 0) - new Date(a.joinedOn ?? 0));
    return list;
  }, [mentees, search, stageFilter, cityFilter, sexFilter, statusFilter, sortBy]);

  const recentRegistrations = useMemo(
    () => [...mentees].sort((a, b) => new Date(b.joinedOn ?? 0) - new Date(a.joinedOn ?? 0)).slice(0, 5),
    [mentees]
  );

  if (isLoading) return <LoadingState fullHeight label="Loading your mentees…" />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={`Welcome, ${user.name}`} subtitle="Devotees assigned to you, and their Sadhana progress." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Registered Users" value={stats.totalUsers} tone="maroon" />
        <StatCard icon={UserCheck} label="Active Users" value={stats.activeUsers} tone="sage" />
        <StatCard icon={BookOpenText} label="Total Sadhana Records" value={stats.totalRecords} tone="saffron" />
        <StatCard icon={Repeat} label="Total Mala" value={stats.totalMala} tone="clay" />
      </div>

      {recentRegistrations.length > 0 && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-semibold text-maroon-600">Recent Registrations</h2>
          <ul className="flex flex-col divide-y divide-brown-900/5">
            {recentRegistrations.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium text-brown-900">{m.name}</span>
                <span className="text-xs text-brown-500">{formatLongDate(m.joinedOn ? m.joinedOn.slice(0, 10) : null, locale)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[200px] flex-1">
          <Input label="Search" placeholder="Name, email, or mobile…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="min-w-[160px]">
          <Select label="Initiation Stage" value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="all">All Stages</option>
            {stageOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[140px]">
          <Select label="City" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="all">All Cities</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-[120px]">
          <Select label="Sex" value={sexFilter} onChange={(e) => setSexFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </Select>
        </div>
        <div className="min-w-[140px]">
          <Select label="Today's Status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
          </Select>
        </div>
        <div className="min-w-[170px]">
          <Select label="Sort By" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!filtered.length ? (
        <EmptyState icon={Search} title="No users match these filters" description="Try a different search or filter." />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Mobile</th>
                  <th className="px-4 py-3">Initiation Stage</th>
                  <th className="px-4 py-3">City</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr
                    key={m.id}
                    className="cursor-pointer border-b border-brown-900/5 bg-cream-50 transition-colors last:border-0 hover:bg-beige-100"
                    onClick={() => navigate(`/mentor-dashboard/users/${m.id}`)}
                  >
                    <td className="px-4 py-3 font-medium text-brown-900">{m.name}</td>
                    <td className="px-4 py-3 text-brown-700">{m.email}</td>
                    <td className="px-4 py-3 text-brown-700">{m.phone || "—"}</td>
                    <td className="px-4 py-3 text-brown-700">{m.dikshaStage || "—"}</td>
                    <td className="px-4 py-3 text-brown-700">{m.city || "—"}</td>
                    <td className="px-4 py-3 text-brown-700">{formatLongDate(m.joinedOn ? m.joinedOn.slice(0, 10) : null, locale)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={m.status === "Completed" ? "completed" : "pending"}
                        label={m.status === "Completed" ? "Completed" : "Pending"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
