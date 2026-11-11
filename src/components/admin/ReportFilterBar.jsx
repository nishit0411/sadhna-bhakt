import { Search, RotateCcw } from "lucide-react";
import Card from "../ui/Card";
import Select from "../ui/Select";
import Button from "../ui/Button";
import DatePicker from "../ui/DatePicker";
import { formatMonthYear } from "../../utils/dateHelpers";
import { useTranslation } from "../../i18n/LanguageContext";
import { ALL, STATUS_SUBMITTED, STATUS_NOT_SUBMITTED, hasActiveFilters, currentMonthCursor } from "../../utils/reportFilters";

/**
 * Shared filter bar for Reports / Master Report / Devotees. Controlled:
 * `filters` + `onChange(next)` + `onReset()`. Each page decides which
 * controls apply via `show` (location, mentor, month, status, search).
 * `children` adds page-specific controls into the same grid; `canReset`
 * overrides when Reset is enabled (for pages with extra filter state).
 */
export default function ReportFilterBar({
  filters,
  onChange,
  onReset,
  locationOptions = [],
  mentorOptions = [],
  show = { location: true, mentor: true, month: true, status: true, search: true },
  canReset,
  children,
}) {
  const { t, locale } = useTranslation();
  const set = (patch) => onChange({ ...filters, ...patch });

  const today = currentMonthCursor();
  const { year, month } = filters.cursor;
  const isCurrentMonth = year === today.year && month === today.month;
  const prevMonth = () => set({ cursor: month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 } });
  const nextMonth = () => {
    if (isCurrentMonth) return;
    set({ cursor: month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 } });
  };

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {show.search && (
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-400" />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => set({ search: e.target.value })}
                placeholder={t("admin.filters.search")}
                aria-label={t("admin.filters.search")}
                className="w-full rounded-xl border border-brown-900/10 bg-cream-50 py-2.5 pl-10 pr-4 text-base focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:text-sm"
              />
            </div>
          )}
          {show.location && (
            <Select aria-label={t("admin.filters.location")} value={filters.location} onChange={(e) => set({ location: e.target.value })}>
              <option value={ALL}>{t("admin.filters.allLocations")}</option>
              {locationOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} ({o.count})
                </option>
              ))}
            </Select>
          )}
          {show.mentor && (
            <Select aria-label={t("admin.filters.mentor")} value={filters.mentorId} onChange={(e) => set({ mentorId: e.target.value })}>
              <option value={ALL}>{t("admin.filters.allMentors")}</option>
              {mentorOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          )}
          {show.status && (
            <Select aria-label={t("admin.filters.status")} value={filters.status} onChange={(e) => set({ status: e.target.value })}>
              <option value={ALL}>{t("admin.filters.allStatuses")}</option>
              <option value={STATUS_SUBMITTED}>{t("admin.filters.submitted")}</option>
              <option value={STATUS_NOT_SUBMITTED}>{t("admin.filters.notSubmitted")}</option>
            </Select>
          )}
          {children}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {show.month ? (
            <DatePicker
              label={formatMonthYear(new Date(year, month), locale)}
              onPrev={prevMonth}
              onNext={nextMonth}
              nextDisabled={isCurrentMonth}
            />
          ) : (
            <span />
          )}
          <Button variant="ghost" size="sm" icon={RotateCcw} onClick={onReset} disabled={!(canReset ?? hasActiveFilters(filters))}>
            {t("admin.filters.reset")}
          </Button>
        </div>
      </div>
    </Card>
  );
}
