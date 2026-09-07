import { Link } from "react-router-dom";
import { Sparkles, Pencil, Repeat } from "lucide-react";
import { useTranslation } from "../../i18n/LanguageContext";
import { formatDateTime } from "../../utils/dateHelpers";
import Card from "../ui/Card";
import Button from "../ui/Button";
import StatusBadge from "../ui/StatusBadge";

export default function SadhanaCard({ todayEntry, formattedDate }) {
  const { t, locale } = useTranslation();
  const isSubmitted = Boolean(todayEntry);
  const submittedAtDisplay = formatDateTime(todayEntry?.submittedAt, locale);

  return (
    <Card className="relative overflow-hidden">
      <div className="devotional-pattern pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-xl font-semibold text-maroon-600">{t("dashboard.todaysSadhana")}</p>
            <p className="text-xs text-brown-500">{formattedDate}</p>
          </div>
          <StatusBadge
            status={isSubmitted ? "completed" : "pending"}
            label={isSubmitted ? t("common.completed") : t("common.notSubmitted")}
          />
        </div>

        {isSubmitted ? (
          <>
            <div className="flex items-center gap-2 text-sm text-brown-700">
              <Repeat className="h-4 w-4 text-maroon-500" />
              <span>
                <span className="font-display text-lg font-semibold text-maroon-600">{todayEntry.totalMala}</span>{" "}
                {t("dashboard.malaRoundsToday")} 🙏
              </span>
            </div>
            {submittedAtDisplay && (
              <p className="text-xs text-brown-400">
                {t("dashboard.submittedAt")} {submittedAtDisplay}
              </p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link to="/devotee/sadhana" className="w-full sm:w-auto">
                <Button variant="outline" size="md" icon={Pencil} className="w-full">
                  {t("dashboard.reviewEdit")}
                </Button>
              </Link>
              <Link to="/devotee/history" className="w-full sm:w-auto">
                <Button variant="ghost" size="md" className="w-full">
                  {t("dashboard.viewProgress")}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-brown-600">{t("dashboard.notSubmittedBody")}</p>
            <Link to="/devotee/sadhana">
              <Button variant="primary" size="lg" icon={Sparkles} className="w-full sm:w-auto">
                {t("dashboard.completeButton")}
              </Button>
            </Link>
          </>
        )}
      </div>
    </Card>
  );
}
