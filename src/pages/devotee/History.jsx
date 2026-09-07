import { useEffect, useMemo, useState } from "react";
import { CalendarX } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import * as sadhanaService from "../../services/sadhanaService";
import { formatMonthYear, getMonthGrid } from "../../utils/dateHelpers";
import { useTranslation } from "../../i18n/LanguageContext";
import { friendlyErrorMessage } from "../../utils/friendlyError";
import PageHeader from "../../components/layout/PageHeader";
import DatePicker from "../../components/ui/DatePicker";
import Card from "../../components/ui/Card";
import LoadingState from "../../components/ui/LoadingState";
import EmptyState from "../../components/ui/EmptyState";
import Calendar from "../../components/history/Calendar";
import DayDetailModal from "../../components/history/DayDetailModal";

export default function History() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const { t, locale } = useTranslation();
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    sadhanaService
      .getMonthlyRecords(user.id, cursor.year, cursor.month)
      .then((data) => {
        if (!active) return;
        setRecords(data);
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
  }, [user.id, cursor]);

  const recordsByDate = useMemo(() => {
    const map = new Map();
    records.forEach((r) => map.set(r.date, r));
    return map;
  }, [records]);

  const cells = useMemo(() => getMonthGrid(cursor.year, cursor.month), [cursor]);

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();

  function goToPrevMonth() {
    setCursor((prev) => (prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }));
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setCursor((prev) => (prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }));
  }

  return (
    <div>
      <PageHeader
        title={t("history.pageTitle")}
        subtitle={t("history.subtitle")}
        action={
          <DatePicker
            label={formatMonthYear(new Date(cursor.year, cursor.month), locale)}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            nextDisabled={isCurrentMonth}
          />
        }
      />

      <Card>
        {isLoading ? (
          <LoadingState label={t("common.loading")} />
        ) : records.length ? (
          <Calendar cells={cells} recordsByDate={recordsByDate} onSelectDay={setSelectedRecord} />
        ) : (
          <EmptyState icon={CalendarX} title={t("history.noRecordsTitle")} description={t("history.noRecordsBody")} />
        )}
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-brown-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-sage-300" /> {t("history.submitted")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-cream-300" /> {t("history.notSubmitted")}
        </span>
      </div>

      <DayDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />
    </div>
  );
}
