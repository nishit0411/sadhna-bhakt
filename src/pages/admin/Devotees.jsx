import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Download } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { toISODate } from "../../utils/dateHelpers";
import { downloadCSV } from "../../utils/csvExport";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Button from "../../components/ui/Button";
import DevoteeTable from "../../components/admin/DevoteeTable";
import LoadingState from "../../components/ui/LoadingState";
import ReportFilterBar from "../../components/admin/ReportFilterBar";
import { getAllMentors } from "../../services/mentorService";
import {
  applyReportFilters,
  buildLocationOptions,
  displayLocation,
  defaultReportFilters,
  exportColumns,
  exportSafeName,
  hasActiveFilters,
  toExportRow,
} from "../../utils/reportFilters";

// Allowlisted export fields only (see utils/reportFilters) — no DOB, email,
// phone or credentials, so the file is safe to share outside the admin panel.
const EXPORT_KEYS = ["date", "name", "spiritualName", "phone", "location", "centre", "mentors", "statusToday", "totalMala"];

const VALID_STATUS_FILTERS = ["Completed", "Pending"];

export default function Devotees() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [devotees, setDevotees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // Shared location / mentor / name-or-mobile filters (same logic as Reports).
  const [filters, setFilters] = useState(defaultReportFilters);
  const [mentors, setMentors] = useState([]);
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
    getAllMentors()
      .then((list) => active && setMentors(list.map((m) => ({ id: m.id, name: m.name }))))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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

  const filtered = useMemo(() => {
    return applyReportFilters(devotees, filters, { mentors }).filter((d) => {
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (malaFilter !== "all") {
        if (d.todayTotalMala === null) return false;
        if (malaFilter === "16plus" && d.todayTotalMala < 16) return false;
        if (malaFilter === "8to15" && (d.todayTotalMala < 8 || d.todayTotalMala > 15)) return false;
        if (malaFilter === "below8" && d.todayTotalMala >= 8) return false;
      }
      return true;
    });
  }, [devotees, filters, mentors, malaFilter, statusFilter]);

  const locationOptions = useMemo(() => buildLocationOptions(devotees), [devotees]);
  const today = toISODate(new Date());
  const canReset = hasActiveFilters(filters) || malaFilter !== "all" || statusFilter !== "all" || date !== today;

  function handleReset() {
    setFilters(defaultReportFilters());
    setMalaFilter("all");
    handleStatusFilterChange("all");
    setDate(today);
  }

  function handleExport() {
    const rows = filtered.map((d) =>
      toExportRow(
        {
          date,
          name: exportSafeName(d.name, t),
          spiritualName: d.spiritualName,
          phone: d.phone,
          location: displayLocation(d.city),
          centre: d.centre,
          mentors: (d.mentor ?? []).map((v) => (v === "Other" && d.mentorOther ? d.mentorOther : v)).join("; "),
          statusToday: d.status === "Completed" ? t("common.completed") : t("common.pending"),
          totalMala: d.todayTotalMala ?? "",
        },
        EXPORT_KEYS,
      ),
    );
    downloadCSV(`devotees-${date}`, rows, exportColumns(EXPORT_KEYS, t), `Exported by: ${user?.name ?? user?.email ?? "Admin"} · ${date}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("admin.devoteesTitle")}
        action={
          <Button variant="outline" size="sm" icon={Download} onClick={handleExport} disabled={!filtered.length}>
            {t("admin.exportCsv")}
          </Button>
        }
        subtitle={`${t("admin.devoteesSubtitle")} ${filtered.length} ${t("admin.of")} ${devotees.length} ${t("admin.devoteesWord")}.`}
      />

      <ReportFilterBar
        filters={filters}
        onChange={setFilters}
        onReset={handleReset}
        canReset={canReset}
        locationOptions={locationOptions}
        mentorOptions={mentors}
        show={{ search: true, location: true, mentor: true }}
      >
        <Input label="" type="date" aria-label={t("common.date")} value={date} onChange={(e) => setDate(e.target.value)} max={today} />
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
      </ReportFilterBar>

      {isLoading ? <LoadingState /> : <DevoteeTable devotees={filtered} />}
    </div>
  );
}
