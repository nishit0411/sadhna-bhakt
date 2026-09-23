import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import * as devoteeService from "../../services/devoteeService";
import { toISODate } from "../../utils/dateHelpers";
import { useToast } from "../../context/ToastContext";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import Card from "../../components/ui/Card";
import DevoteeTable from "../../components/admin/DevoteeTable";
import LoadingState from "../../components/ui/LoadingState";

/**
 * Read-only, scoped to "my mentees" entirely by RLS — getDevoteeDirectory()
 * has no hardcoded filter, so calling it as a mentor session automatically
 * returns only devotees whose mentor_id is this mentor (see schema.sql
 * §16f). No client-side filtering needed to enforce that scoping.
 */
export default function MentorDashboard() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [devotees, setDevotees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const date = toISODate(new Date());

  useEffect(() => {
    let active = true;
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
  }, []);

  const filtered = useMemo(
    () => devotees.filter((d) => !search || d.name.toLowerCase().includes(search.toLowerCase())),
    [devotees, search]
  );

  if (isLoading) return <LoadingState fullHeight />;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t("mentor.dashboardTitle")} subtitle={t("mentor.dashboardSubtitle", { count: devotees.length })} />

      <Card>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brown-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("admin.searchPlaceholder")}
            aria-label={t("admin.searchPlaceholder")}
            className="w-full rounded-xl border border-brown-900/10 bg-cream-50 py-2.5 pl-10 pr-4 text-base focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 sm:text-sm"
          />
        </div>
      </Card>

      <DevoteeTable devotees={filtered} basePath="/mentor/devotees" />
    </div>
  );
}
