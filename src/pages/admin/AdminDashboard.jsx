import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, CheckCircle2, Clock3, Repeat, Armchair, PersonStanding } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { useTranslation } from "../../i18n/LanguageContext";
import PageHeader from "../../components/layout/PageHeader";
import StatCard from "../../components/dashboard/StatCard";
import DevoteeTable from "../../components/admin/DevoteeTable";
import MalaBreakdownTable from "../../components/admin/MalaBreakdownTable";
import LoadingState from "../../components/ui/LoadingState";
import Card from "../../components/ui/Card";

function scrollToMalaBreakdown() {
  document.getElementById("mala-breakdown")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [devotees, setDevotees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([devoteeService.getAdminOverview(), devoteeService.getDevoteeDirectory()]).then(([ov, list]) => {
      setOverview(ov);
      setDevotees(list);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) return <LoadingState fullHeight />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("admin.dashboardTitle")} subtitle={t("admin.dashboardSubtitle")} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard
          icon={Users}
          label={t("admin.totalDevotees")}
          value={overview.totalDevotees}
          tone="maroon"
          onClick={() => navigate("/admin/devotees")}
        />
        <StatCard
          icon={CheckCircle2}
          label={t("admin.submittedToday")}
          value={overview.submittedToday}
          tone="sage"
          onClick={() => navigate("/admin/devotees?status=Completed")}
        />
        <StatCard
          icon={Clock3}
          label={t("admin.pendingToday")}
          value={overview.pendingToday}
          tone="saffron"
          onClick={() => navigate("/admin/devotees?status=Pending")}
        />
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-semibold text-maroon-600">{t("admin.malaSummaryToday")}</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={Repeat} label={t("admin.averageMala")} value={overview.averageMala} tone="maroon" onClick={scrollToMalaBreakdown} />
          <StatCard
            icon={Repeat}
            label={t("admin.totalMalaChanted")}
            value={overview.totalMalaChanted}
            tone="saffron"
            onClick={scrollToMalaBreakdown}
          />
          <StatCard
            icon={Armchair}
            label={t("admin.totalOnAsan")}
            value={overview.totalMalaOnAsan}
            tone="sage"
            onClick={scrollToMalaBreakdown}
          />
          <StatCard
            icon={PersonStanding}
            label={t("admin.totalWithoutAsan")}
            value={overview.totalMalaWithoutAsan}
            tone="clay"
            onClick={scrollToMalaBreakdown}
          />
        </div>
      </div>

      <Card padded={false}>
        <div className="border-b border-brown-900/5 px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-maroon-600">{t("admin.todaysOverview")}</h2>
          <p className="mt-0.5 text-xs text-brown-500">{t("admin.rowClickHint")}</p>
        </div>
        <div className="p-4 sm:p-6">
          <DevoteeTable devotees={devotees} />
        </div>
      </Card>

      <Card id="mala-breakdown" padded={false} className="scroll-mt-20">
        <div className="border-b border-brown-900/5 px-5 py-4 sm:px-6">
          <h2 className="font-display text-lg font-semibold text-maroon-600">{t("admin.malaBreakdown")}</h2>
          <p className="mt-0.5 text-xs text-brown-500">{t("admin.rowClickHint")}</p>
        </div>
        <div className="p-4 sm:p-6">
          <MalaBreakdownTable rows={overview.malaTable} />
        </div>
      </Card>
    </div>
  );
}
