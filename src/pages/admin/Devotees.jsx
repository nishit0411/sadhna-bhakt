import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { toISODate } from "../../utils/dateHelpers";
import { useTranslation } from "../../i18n/LanguageContext";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import DevoteeTable from "../../components/admin/DevoteeTable";
import LoadingState from "../../components/ui/LoadingState";

const VALID_STATUS_FILTERS = ["Completed", "Pending"];

export default function Devotees() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [devotees, setDevotees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [date, setDate] = useState(toISODate(new Date()));
  const [malaFilter, setMalaFilter] = useState("all");
  // Seeded from ?status=Completed|Pending (the Admin Dashboard's "Submitted
  // Today" / "Pending Today" cards link here) — falls back to "all" for a
  // plain visit, and stays in sync if the user changes it via the select.
  const [statusFilter, setStatusFilter] = useState(() => {
    const fromUrl = searchParams.get("status");
    return VALID_STATUS_FILTERS.includes(fromUrl) ? fromUrl : "all";
  });

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value === "all") next.delete("status");
        else next.set("status", value);
        return next;
      },
      { replace: true }
    );
  }

  const MALA_FILTERS = [
    { value: "all", label: t("admin.anyMalaCount") },
    { value: "16plus", label: t("admin.mala16Plus") },
    { value: "8to15", label: t("admin.mala8to15") },
    { value: "below8", label: t("admin.malaBelow8") },
  ];

  const STATUS_FILTERS = [
    { value: "all", label: t("admin.allStatuses") },
    { value: "Completed", label: t("common.completed") },
    { value: "Pending", label: t("common.pending") },
  ];

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    devoteeService.getDevoteeDirectory(date).then((list) => {
      if (!active) return;
      setDevotees(list);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [date]);

  const filtered = useMemo(() => {
    return devotees.filter((d) => {
      if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (malaFilter !== "all") {
        if (d.todayTotalMala === null) return false;
        if (malaFilter === "16plus" && d.todayTotalMala < 16) return false;
        if (malaFilter === "8to15" && (d.todayTotalMala < 8 || d.todayTotalMala > 15)) return false;
        if (malaFilter === "below8" && d.todayTotalMala >= 8) return false;
      }
      return true;
    });
  }, [devotees, search, malaFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.devoteesTitle")}
        subtitle={`${t("admin.devoteesSubtitle")} ${filtered.length} ${t("admin.of")} ${devotees.length} ${t("admin.devoteesWord")}.`}
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("admin.searchPlaceholder")}
              aria-label={t("admin.searchPlaceholder")}
              className="w-full rounded-xl border border-brown-900/10 bg-cream-50 py-2.5 pl-10 pr-4 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
            />
          </div>
          <Input label="" type="date" aria-label={t("common.date")} value={date} onChange={(e) => setDate(e.target.value)} max={toISODate(new Date())} />
          <Select aria-label={t("admin.anyMalaCount")} value={malaFilter} onChange={(e) => setMalaFilter(e.target.value)}>
            {MALA_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
          <Select aria-label={t("admin.allStatuses")} value={statusFilter} onChange={(e) => handleStatusFilterChange(e.target.value)}>
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {isLoading ? <LoadingState /> : <DevoteeTable devotees={filtered} />}
    </div>
  );
}
