import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Trophy,
  Medal,
  Award,
  Repeat,
  Flame,
  Users,
  TrendingUp,
  TrendingDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { formatShortDate } from "../../utils/dateHelpers";
import { useTranslation } from "../../i18n/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";

// Same blush/rose palette as the rest of the app (src/index.css) — this
// page used to run a standalone dark "control room" theme; these
// constants now map every role it needs onto the shared light palette so
// it reads as the same app, not a different product.
const PAGE_BG = "#fffaf9"; // cream-50
const CARD = "#ffffff"; // beige-100
const CARD_BORDER = "rgba(51, 33, 42, 0.08)"; // brown-900/8, matches Card.jsx
const TRACK_BG = "#fdf1f4"; // cream-100 — recessed pill-track / table-header / tooltip backgrounds
const CHARCOAL = TRACK_BG; // kept for call sites still named after the old dark background
const GOLD = "#d1618f"; // saffron-500 — accent fills, chart lines/bars
const GOLD_SOFT = "#9c3159"; // maroon-600 — section headings & highlighted values
const TEXT_ON_GOLD = "#7d2647"; // maroon-700 — readable text set directly on a gold-filled pill
const ROSE = "#cc648c"; // maroon-400 — secondary chart series
const CREAM = "#33212a"; // brown-900 — primary text (kept the name; role is now "ink", not background)
const MUTED = "#7a5b64"; // brown-500 — secondary/meta text

const MEDAL_STYLE = [
  { icon: Trophy, color: "#f0cf6b", ring: "#f0cf6b55" },
  { icon: Medal, color: "#d7d7d7", ring: "#d7d7d755" },
  { icon: Award, color: "#d99a5c", ring: "#d99a5c55" },
];

function malaValueOf(devotee, malaType) {
  if (malaType === "onAsan") return devotee.windowMalaOnAsan ?? 0;
  if (malaType === "withoutAsan") return devotee.windowMalaWithoutAsan ?? 0;
  return devotee.windowTotalMala ?? 0;
}

function statusOf(devotee) {
  if (!devotee.daysSubmitted) return "new";
  if (devotee.completionRate >= 80) return "consistent";
  if (devotee.completionRate >= 40) return "active";
  return "inactive";
}

const STATUS_STYLE = {
  new: { label: "New", classes: "text-brown-600 bg-beige-300" },
  consistent: { label: "Consistent", classes: "text-sage-600 bg-sage-100" },
  active: { label: "Active", classes: "text-saffron-600 bg-saffron-100" },
  inactive: { label: "Inactive", classes: "text-clay-600 bg-clay-100" },
};

/* ---------- small building blocks ---------- */

function SectionTitle({ children, hint }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-xl font-semibold" style={{ color: GOLD_SOFT }}>
        {children}
      </h2>
      {hint && <p className="text-xs" style={{ color: MUTED }}>{hint}</p>}
    </div>
  );
}

function GoldDivider() {
  return <div className="my-10 h-px w-full" style={{ background: `linear-gradient(90deg, transparent, ${GOLD}66, transparent)` }} />;
}

function FilterGroup({ options, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1.5 rounded-full p-1" style={{ backgroundColor: CHARCOAL, border: `1px solid ${CARD_BORDER}` }}>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
          style={
            value === opt.value
              ? { background: `linear-gradient(135deg, ${GOLD}, #b14a76)`, color: TEXT_ON_GOLD }
              : { color: MUTED }
          }
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, suffix, trend }) {
  return (
    <div
      className="rounded-2xl p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-transform duration-200 hover:-translate-y-0.5"
      style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ backgroundColor: `${GOLD}22`, color: GOLD_SOFT }}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        {trend != null && (
          <span
            className="flex items-center gap-0.5 text-xs font-medium"
            style={{ color: trend >= 0 ? "#6f9459" : "#e37e73" }}
          >
            {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-semibold" style={{ color: CREAM }}>
        {value}
        {suffix && <span className="ml-1 text-sm font-sans font-normal" style={{ color: MUTED }}>{suffix}</span>}
      </p>
    </div>
  );
}

function DailyGauge({ percent, current, total }) {
  const clamped = Math.max(0, Math.min(100, percent));
  const angle = (clamped / 100) * 360;
  const color = clamped >= 70 ? "#6f9459" : clamped >= 40 ? "#d1618f" : "#e37e73";

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-5">
      <div
        className="relative flex h-40 w-40 items-center justify-center rounded-full"
        style={{ background: `conic-gradient(${color} ${angle}deg, ${CARD_BORDER} ${angle}deg)` }}
      >
        <div className="flex h-32 w-32 flex-col items-center justify-center rounded-full" style={{ backgroundColor: CARD }}>
          <p className="font-display text-3xl font-semibold" style={{ color: CREAM }}>
            {clamped}%
          </p>
          <p className="text-xs" style={{ color: MUTED }}>
            {current} / {total}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShimmerBlock({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-2xl ${className}`}
      style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}
    />
  );
}

/* ---------- charts ---------- */

function TopMalaBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 32)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <defs>
          <linearGradient id="goldRose" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={GOLD} />
            <stop offset="100%" stopColor={ROSE} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke={CARD_BORDER} horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: CARD_BORDER }} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fontSize: 11, fill: CREAM }}
          axisLine={{ stroke: CARD_BORDER }}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(209,97,143,0.08)" }}
          contentStyle={{ backgroundColor: CHARCOAL, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, color: CREAM }}
          labelStyle={{ color: GOLD_SOFT }}
        />
        <Bar dataKey="value" fill="url(#goldRose)" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function WeeklyTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity={0.45} />
            <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke={CARD_BORDER} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tick={{ fontSize: 11, fill: MUTED }}
          axisLine={{ stroke: CARD_BORDER }}
          tickLine={false}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} width={24} />
        <Tooltip
          labelFormatter={formatShortDate}
          contentStyle={{ backgroundColor: CHARCOAL, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, color: CREAM }}
          labelStyle={{ color: GOLD_SOFT }}
        />
        <Area
          type="monotone"
          dataKey="submissions"
          stroke={GOLD}
          strokeWidth={2}
          fill="url(#trendFill)"
          dot={{ r: 3, fill: GOLD, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function MalaDistributionPie({ onAsan, withoutAsan, malaType, onSelect }) {
  const total = onAsan + withoutAsan;
  const data = [
    { key: "onAsan", name: "On Asan", value: onAsan },
    { key: "withoutAsan", name: "Without Asan", value: withoutAsan },
  ];
  const colors = { onAsan: GOLD, withoutAsan: ROSE };

  if (!total) {
    return <p className="py-10 text-center text-sm" style={{ color: MUTED }}>No Mala logged today yet.</p>;
  }

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={2}
            onClick={(entry) => onSelect(entry.key === malaType ? "total" : entry.key)}
            label={({ percent }) => `${Math.round(percent * 100)}%`}
            labelLine={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={colors[entry.key]}
                stroke={CARD}
                strokeWidth={2}
                opacity={malaType === "total" || malaType === entry.key ? 1 : 0.35}
                cursor="pointer"
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: CHARCOAL, border: `1px solid ${CARD_BORDER}`, borderRadius: 10, color: CREAM }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-5 text-xs" style={{ color: MUTED }}>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: GOLD }} /> On Asan ({onAsan})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: ROSE }} /> Without Asan ({withoutAsan})
        </span>
      </div>
    </div>
  );
}

/* ---------- sortable table ---------- */

const TABLE_SORTERS = {
  name: (d) => d.name?.toLowerCase() ?? "",
  totalMala: (d, malaType) => malaValueOf(d, malaType),
  averageMala: (d) => d.averageMala ?? 0,
  consistency: (d) => d.completionRate ?? 0,
  lastSubmitted: (d) => d.lastSubmittedDate ?? "",
};

function TableHeader({ label, sortKeyName, activeKey, dir, onSort, align = "left" }) {
  const isActive = activeKey === sortKeyName;
  const Icon = isActive ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKeyName)}
        className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors"
        style={{ color: isActive ? GOLD_SOFT : MUTED }}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

function DetailedTable({ devotees, malaType, onRowClick }) {
  const [sortKey, setSortKey] = useState("totalMala");
  const [sortDir, setSortDir] = useState("desc");

  function handleSort(key) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = useMemo(() => {
    const getValue = TABLE_SORTERS[sortKey];
    const copy = [...devotees].sort((a, b) => {
      const av = getValue(a, malaType);
      const bv = getValue(b, malaType);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [devotees, sortKey, sortDir, malaType]);

  return (
    <div className="overflow-x-auto rounded-2xl" style={{ border: `1px solid ${CARD_BORDER}` }}>
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr style={{ backgroundColor: CHARCOAL, borderBottom: `1px solid ${CARD_BORDER}` }}>
            <TableHeader label="Devotee" sortKeyName="name" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <TableHeader label="Total Mala" sortKeyName="totalMala" activeKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <TableHeader label="Avg / Day" sortKeyName="averageMala" activeKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <TableHeader label="Consistency" sortKeyName="consistency" activeKey={sortKey} dir={sortDir} onSort={handleSort} align="right" />
            <TableHeader label="Last Submitted" sortKeyName="lastSubmitted" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide" style={{ color: MUTED }}>
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((d) => {
            const status = statusOf(d);
            return (
              <tr
                key={d.id}
                onClick={() => onRowClick(d.id)}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = `${GOLD}0d`)}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td className="px-4 py-3 font-medium" style={{ color: CREAM }}>
                  {d.name}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: GOLD_SOFT }}>
                  {malaValueOf(d, malaType)}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: MUTED }}>
                  {d.averageMala}
                </td>
                <td className="px-4 py-3 text-right" style={{ color: MUTED }}>
                  {d.completionRate}%
                </td>
                <td className="px-4 py-3" style={{ color: MUTED }}>
                  {d.lastSubmittedDate ? formatShortDate(d.lastSubmittedDate) : "—"}
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[status].classes}`}>
                    {STATUS_STYLE[status].label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- page ---------- */

export default function Analytics() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [period, setPeriod] = useState("30");
  const [malaType, setMalaType] = useState("total");
  const [sortBy, setSortBy] = useState("top");
  const [viewAs, setViewAs] = useState("list");
  const [devotees, setDevotees] = useState([]);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const windowDays = period === "7" ? 7 : period === "30" ? 30 : Infinity;

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    Promise.all([
      devoteeService.getDevoteeDirectory(undefined, windowDays),
      devoteeService.getAdminOverview(),
      devoteeService.getSubmissionTrend(7),
    ])
      .then(([list, ov, trendData]) => {
        if (!active) return;
        setDevotees(list);
        setOverview(ov);
        setTrend(trendData);
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
  }, [windowDays]);

  const sortedForLists = useMemo(() => {
    const copy = [...devotees];
    if (sortBy === "newest") copy.sort((a, b) => new Date(b.joinedOn ?? 0) - new Date(a.joinedOn ?? 0));
    else if (sortBy === "consistency") copy.sort((a, b) => b.completionRate - a.completionRate);
    else copy.sort((a, b) => malaValueOf(b, malaType) - malaValueOf(a, malaType));
    return copy;
  }, [devotees, sortBy, malaType]);

  const topTen = useMemo(
    () => [...devotees].sort((a, b) => malaValueOf(b, malaType) - malaValueOf(a, malaType)).slice(0, 10),
    [devotees, malaType]
  );

  const barData = useMemo(
    () => topTen.slice(0, 15).map((d) => ({ name: d.name, value: malaValueOf(d, malaType) })),
    [topTen, malaType]
  );

  const metrics = useMemo(() => {
    const withSubs = devotees.filter((d) => d.daysSubmitted > 0);
    const totalMala = devotees.reduce((sum, d) => sum + malaValueOf(d, malaType), 0);
    const avgMala = withSubs.length ? Math.round((totalMala / withSubs.length) * 10) / 10 : 0;
    const avgConsistency = devotees.length
      ? Math.round(devotees.reduce((sum, d) => sum + d.completionRate, 0) / devotees.length)
      : 0;
    const mostActive = devotees.filter((d) => d.completionRate >= 70).length;
    return { totalMala, avgMala, avgConsistency, mostActive };
  }, [devotees, malaType]);

  function goToDevotee(id) {
    navigate(`/admin/devotees/${id}`);
  }

  return (
    <div className="-mx-4 -mt-5 min-h-screen px-4 pb-16 pt-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8" style={{ backgroundColor: PAGE_BG }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            {t("admin.dashboardTitle")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold" style={{ color: CREAM }}>
            {t("admin.analyticsTitle")}
          </h1>
          <p className="mt-1 text-sm" style={{ color: MUTED }}>
            {t("admin.analyticsSubtitle")}
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <FilterGroup
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7", label: t("admin.last7Days") },
              { value: "30", label: t("admin.last30Days") },
              { value: "all", label: t("admin.allTime") },
            ]}
          />
          <FilterGroup
            value={malaType}
            onChange={setMalaType}
            options={[
              { value: "total", label: t("admin.allMalaTypes") },
              { value: "onAsan", label: t("admin.totalOnAsan") },
              { value: "withoutAsan", label: t("admin.totalWithoutAsan") },
            ]}
          />
          <FilterGroup
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "top", label: t("admin.sortTopPerformers") },
              { value: "newest", label: t("admin.sortNewest") },
              { value: "consistency", label: t("admin.sortConsistency") },
            ]}
          />
          <div className="ml-auto inline-flex gap-1 rounded-full p-1" style={{ backgroundColor: CHARCOAL, border: `1px solid ${CARD_BORDER}` }}>
            <button
              type="button"
              onClick={() => setViewAs("grid")}
              aria-label={t("admin.viewGrid")}
              className="rounded-full p-2"
              style={viewAs === "grid" ? { backgroundColor: `${GOLD}33`, color: GOLD_SOFT } : { color: MUTED }}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewAs("list")}
              aria-label={t("admin.viewList")}
              className="rounded-full p-2"
              style={viewAs === "list" ? { backgroundColor: `${GOLD}33`, color: GOLD_SOFT } : { color: MUTED }}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ShimmerBlock key={i} className="h-28" />
            ))}
          </div>
        ) : !devotees.length ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl py-20 text-center" style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}>
            <Users className="h-10 w-10" style={{ color: MUTED }} />
            <p className="font-display text-lg" style={{ color: CREAM }}>
              {t("admin.noDevoteesFound")}
            </p>
            <p className="text-sm" style={{ color: MUTED }}>
              {t("admin.noDevoteesFoundDesc")}
            </p>
          </div>
        ) : (
          <>
            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <MetricCard icon={Repeat} label={t("admin.averageMala")} value={metrics.avgMala} />
              <MetricCard icon={Repeat} label={t("admin.totalMalaChanted")} value={metrics.totalMala} />
              <MetricCard icon={Flame} label={t("admin.analyticsConsistencyRate")} value={metrics.avgConsistency} suffix="%" />
              <MetricCard icon={Users} label={t("admin.analyticsMostActive")} value={metrics.mostActive} />
            </div>

            <GoldDivider />

            {/* Top performers leaderboard */}
            <SectionTitle hint={t("admin.rowClickHint")}>{t("admin.analyticsTopPerformers")}</SectionTitle>
            {viewAs === "list" ? (
              <div className="flex flex-col gap-2">
                {topTen.map((d, i) => {
                  const medal = MEDAL_STYLE[i];
                  return (
                    <button
                      key={d.id}
                      onClick={() => goToDevotee(d.id)}
                      className="flex items-center gap-4 rounded-2xl px-4 py-3 text-left transition-all duration-150 hover:-translate-y-0.5"
                      style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm font-semibold"
                        style={medal ? { backgroundColor: `${medal.color}22`, color: medal.color } : { backgroundColor: `${GOLD}1a`, color: MUTED }}
                      >
                        {medal ? <medal.icon className="h-4 w-4" /> : i + 1}
                      </span>
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                        style={{ backgroundColor: `${GOLD}22`, color: GOLD_SOFT }}
                      >
                        {d.initials}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium" style={{ color: CREAM }}>
                          {d.name}
                        </p>
                        <p className="text-xs" style={{ color: MUTED }}>
                          {d.completionRate}% {t("admin.analyticsConsistencyRate").toLowerCase()}
                        </p>
                      </div>
                      <p className="font-display text-lg font-semibold" style={{ color: GOLD_SOFT }}>
                        {malaValueOf(d, malaType)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {topTen.map((d, i) => {
                  const medal = MEDAL_STYLE[i];
                  return (
                    <button
                      key={d.id}
                      onClick={() => goToDevotee(d.id)}
                      className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all duration-150 hover:-translate-y-0.5"
                      style={{ backgroundColor: CARD, border: `1px solid ${medal ? medal.ring : CARD_BORDER}` }}
                    >
                      <span
                        className="flex h-14 w-14 items-center justify-center rounded-full text-sm font-semibold"
                        style={{ backgroundColor: `${GOLD}22`, color: GOLD_SOFT }}
                      >
                        {d.initials}
                      </span>
                      {medal && <medal.icon className="h-4 w-4" style={{ color: medal.color }} />}
                      <p className="truncate text-sm font-medium" style={{ color: CREAM }}>
                        {d.name}
                      </p>
                      <p className="font-display text-base font-semibold" style={{ color: GOLD_SOFT }}>
                        {malaValueOf(d, malaType)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}

            <GoldDivider />

            {/* Charts */}
            <SectionTitle>{t("admin.analyticsCharts")}</SectionTitle>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}>
                <p className="mb-3 text-sm font-medium" style={{ color: CREAM }}>
                  {t("admin.analyticsTopMalaChart")}
                </p>
                <TopMalaBarChart data={barData} />
              </div>
              <div className="rounded-2xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}>
                <p className="mb-3 text-sm font-medium" style={{ color: CREAM }}>
                  {t("admin.analyticsWeeklyTrend")}
                </p>
                <WeeklyTrendChart data={trend} />
              </div>
              <div className="rounded-2xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}>
                <p className="mb-1 text-sm font-medium" style={{ color: CREAM }}>
                  {t("admin.malaBreakdown")}
                </p>
                <p className="mb-2 text-xs" style={{ color: MUTED }}>
                  {t("admin.analyticsClickSegment")}
                </p>
                <MalaDistributionPie
                  onAsan={overview.totalMalaOnAsan}
                  withoutAsan={overview.totalMalaWithoutAsan}
                  malaType={malaType}
                  onSelect={setMalaType}
                />
              </div>
              <div className="rounded-2xl p-5" style={{ backgroundColor: CARD, border: `1px solid ${CARD_BORDER}` }}>
                <p className="mb-1 text-sm font-medium" style={{ color: CREAM }}>
                  {t("admin.analyticsTodayGauge")}
                </p>
                <p className="mb-2 text-xs" style={{ color: MUTED }}>
                  {t("admin.submittedToday")} / {t("admin.totalDevotees")}
                </p>
                <DailyGauge
                  percent={overview.totalDevotees ? Math.round((overview.submittedToday / overview.totalDevotees) * 100) : 0}
                  current={overview.submittedToday}
                  total={overview.totalDevotees}
                />
              </div>
            </div>

            <GoldDivider />

            {/* Detailed table */}
            <SectionTitle hint={t("admin.rowClickHint")}>{t("admin.analyticsDetailedTable")}</SectionTitle>
            <DetailedTable devotees={sortedForLists} malaType={malaType} onRowClick={goToDevotee} />

            <p className="mt-10 text-center text-xs italic" style={{ color: MUTED }}>
              {t("admin.analyticsFooterNote")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
