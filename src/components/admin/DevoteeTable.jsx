import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import { Users } from "lucide-react";
import { useTranslation } from "../../i18n/LanguageContext";
import { formatMentorNames } from "../../data/mentorList";
import { displayLocation } from "../../utils/reportFilters";
import { usePagination } from "../../hooks/usePagination";
import Pagination from "../ui/Pagination";

function initialsAvatar(devotee) {
  const tones = {
    maroon: "bg-maroon-100 text-maroon-600",
    saffron: "bg-saffron-100 text-saffron-600",
    sage: "bg-sage-100 text-sage-600",
  };
  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${tones[devotee.avatarColor] ?? tones.maroon}`}>
      {devotee.initials}
    </span>
  );
}

const YES_NO_RANK = { Yes: 2, No: 1 };

const SORTERS = {
  name: (d) => d.name?.toLowerCase() ?? "",
  totalMala: (d) => d.todayTotalMala ?? -1,
  granth: (d) => YES_NO_RANK[d.todayGranth] ?? 0,
  harikatha: (d) => YES_NO_RANK[d.todayHarikatha] ?? 0,
  gaudiyaKirtan: (d) => YES_NO_RANK[d.todayGaudiyaKirtan] ?? 0,
  status: (d) => d.status ?? "",
};

function SortableHeader({ label, sortKeyName, activeKey, dir, onSort }) {
  const isActive = activeKey === sortKeyName;
  const Icon = isActive ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className="px-4 py-3">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSort(sortKeyName);
        }}
        className={`flex items-center gap-1 uppercase tracking-wide hover:text-maroon-600 ${isActive ? "text-maroon-600" : ""}`}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

export default function DevoteeTable({ devotees, basePath = "/admin/devotees" }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  function yn(value) {
    if (value === "Yes") return t("common.yes");
    if (value === "No") return t("common.no");
    return "—";
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return devotees;
    const getValue = SORTERS[sortKey];
    const copy = [...devotees].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [devotees, sortKey, sortDir]);

  // 50 per page; back to page 1 whenever the list (filters) or sort changes.
  const paging = usePagination(sorted);

  if (!devotees.length) {
    return <EmptyState icon={Users} title={t("admin.noDevoteesFound")} description={t("admin.noDevoteesFoundDesc")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto rounded-2xl border border-brown-900/5">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
              <SortableHeader label={t("admin.table.devotee")} sortKeyName="name" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label={t("admin.table.totalMala")} sortKeyName="totalMala" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label={t("admin.table.granth")} sortKeyName="granth" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label={t("admin.table.harikatha")} sortKeyName="harikatha" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label={t("admin.table.gaudiyaKirtan")} sortKeyName="gaudiyaKirtan" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
              <SortableHeader label={t("admin.table.status")} sortKeyName="status" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {paging.pageItems.map((devotee) => (
              <tr
                key={devotee.id}
                onClick={() => navigate(`${basePath}/${devotee.id}`)}
                className="cursor-pointer border-b border-brown-900/5 bg-cream-50 transition-colors last:border-0 hover:bg-beige-100"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {initialsAvatar(devotee)}
                    <div>
                      <p className="font-medium text-brown-900">{devotee.name}</p>
                      <p className="text-xs text-brown-500">{[displayLocation(devotee.city), devotee.centre].filter(Boolean).join(" · ")}</p>
                      {devotee.mentor?.length > 0 && (
                        <p className="text-xs text-brown-400">
                          {t("admin.report.colMentor")}: {formatMentorNames(devotee.mentor, devotee.mentorOther)}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-brown-900">{devotee.todayTotalMala ?? (devotee.status === "Completed" ? 0 : "—")}</td>
                <td className="px-4 py-3 text-brown-700">{yn(devotee.todayGranth)}</td>
                <td className="px-4 py-3 text-brown-700">{yn(devotee.todayHarikatha)}</td>
                <td className="px-4 py-3 text-brown-700">{yn(devotee.todayGaudiyaKirtan)}</td>
                <td className="px-4 py-3">
                  <StatusBadge
                    status={devotee.status === "Completed" ? "completed" : "pending"}
                    label={devotee.status === "Completed" ? t("common.completed") : t("common.pending")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination {...paging} onPageChange={paging.setPage} />
    </div>
  );
}
