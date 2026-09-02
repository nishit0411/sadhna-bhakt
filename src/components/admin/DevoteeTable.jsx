import { useNavigate } from "react-router-dom";
import StatusBadge from "../ui/StatusBadge";
import EmptyState from "../ui/EmptyState";
import { Users } from "lucide-react";
import { useTranslation } from "../../i18n/LanguageContext";

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

export default function DevoteeTable({ devotees }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  function yn(value) {
    if (value === "Yes") return t("common.yes");
    if (value === "No") return t("common.no");
    return "—";
  }

  if (!devotees.length) {
    return <EmptyState icon={Users} title={t("admin.noDevoteesFound")} description={t("admin.noDevoteesFoundDesc")} />;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brown-900/5">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-brown-900/5 bg-beige-100 text-left text-xs font-medium uppercase tracking-wide text-brown-500">
            <th className="px-4 py-3">{t("admin.table.devotee")}</th>
            <th className="px-4 py-3">{t("admin.table.totalMala")}</th>
            <th className="px-4 py-3">{t("admin.table.granth")}</th>
            <th className="px-4 py-3">{t("admin.table.harikatha")}</th>
            <th className="px-4 py-3">{t("admin.table.gaudiyaKirtan")}</th>
            <th className="px-4 py-3">{t("admin.table.status")}</th>
          </tr>
        </thead>
        <tbody>
          {devotees.map((devotee) => (
            <tr
              key={devotee.id}
              onClick={() => navigate(`/admin/devotees/${devotee.id}`)}
              className="cursor-pointer border-b border-brown-900/5 bg-cream-50 transition-colors last:border-0 hover:bg-beige-50"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  {initialsAvatar(devotee)}
                  <div>
                    <p className="font-medium text-brown-900">{devotee.name}</p>
                    <p className="text-xs text-brown-500">{devotee.centre}</p>
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
  );
}
