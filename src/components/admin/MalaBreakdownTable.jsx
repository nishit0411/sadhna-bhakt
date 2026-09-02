import EmptyState from "../ui/EmptyState";
import { Repeat } from "lucide-react";
import { useTranslation } from "../../i18n/LanguageContext";

export default function MalaBreakdownTable({ rows }) {
  const { t } = useTranslation();

  if (!rows.length) {
    return <EmptyState icon={Repeat} title={t("admin.noMalaToday")} description={t("admin.noMalaTodayDesc")} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brown-900/5">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
            <th className="px-4 py-3">{t("admin.table.devotee")}</th>
            <th className="px-4 py-3 text-right">{t("admin.table.totalMala")}</th>
            <th className="px-4 py-3 text-right">{t("admin.table.onAsan")}</th>
            <th className="px-4 py-3 text-right">{t("admin.table.withoutAsan")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-brown-900/5 bg-cream-50 last:border-0">
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
