import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronUp, ChevronDown, ChevronsUpDown, Repeat } from "lucide-react";
import EmptyState from "../ui/EmptyState";
import { useTranslation } from "../../i18n/LanguageContext";

const SORTERS = {
  name: (r) => r.name?.toLowerCase() ?? "",
  totalMala: (r) => r.totalMala ?? 0,
  onAsan: (r) => r.malaOnAsan ?? 0,
  withoutAsan: (r) => r.malaWithoutAsan ?? 0,
};

function SortableHeader({ label, sortKeyName, activeKey, dir, onSort, align = "left" }) {
  const isActive = activeKey === sortKeyName;
  const Icon = isActive ? (dir === "asc" ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(sortKeyName)}
        className={`flex items-center gap-1 uppercase tracking-wide hover:text-maroon-600 ${
          align === "right" ? "ml-auto" : ""
        } ${isActive ? "text-maroon-600" : ""}`}
      >
        {align === "right" && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
        {label}
        {align !== "right" && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      </button>
    </th>
  );
}

export default function MalaBreakdownTable({ rows, basePath = "/admin/devotees" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const getValue = SORTERS[sortKey];
    const copy = [...rows].sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      if (av < bv) return -1;
      if (av > bv) return 1;
      return 0;
    });
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [rows, sortKey, sortDir]);

  if (!rows.length) {
    return <EmptyState icon={Repeat} title={t("admin.noMalaToday")} description={t("admin.noMalaTodayDesc")} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brown-900/5">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
            <SortableHeader label={t("admin.table.devotee")} sortKeyName="name" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableHeader label={t("admin.table.totalMala")} sortKeyName="totalMala" align="right" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableHeader label={t("admin.table.onAsan")} sortKeyName="onAsan" align="right" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
            <SortableHeader label={t("admin.table.withoutAsan")} sortKeyName="withoutAsan" align="right" activeKey={sortKey} dir={sortDir} onSort={handleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr
              key={row.id}
              onClick={() => navigate(`${basePath}/${row.id}`)}
              className="cursor-pointer border-b border-brown-900/5 bg-cream-50 transition-colors last:border-0 hover:bg-beige-100"
            >
              <td className="px-4 py-3 font-medium text-brown-900">{row.name}</td>
              <td className="px-4 py-3 text-right text-brown-700">{row.totalMala}</td>
              <td className="px-4 py-3 text-right text-brown-700">{row.malaOnAsan}</td>
              <td className="px-4 py-3 text-right text-brown-700">{row.malaWithoutAsan}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
