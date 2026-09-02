import Modal from "../ui/Modal";
import { formatLongDate, to12Hour } from "../../utils/dateHelpers";
import { NO_GRANTH_VALUE } from "../../data/granthList";
import { NO_HARIKATHA_VALUE } from "../../data/harikathaList";
import { useTranslation } from "../../i18n/LanguageContext";

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-brown-900/5 py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-brown-500">{label}</span>
      <span className="text-right font-medium text-brown-900">{value}</span>
    </div>
  );
}

function formatList(values, otherText) {
  if (!values?.length) return "—";
  return values.map((v) => (v === "Other" && otherText ? otherText : v)).join(", ");
}

export default function DayDetailModal({ record, onClose }) {
  const { t, locale } = useTranslation();
  if (!record) return null;

  const granthDisplay =
    record.granthRead?.includes(NO_GRANTH_VALUE) || !record.granthRead?.length
      ? "—"
      : formatList(record.granthRead, record.granthOther);

  const harikathaDisplay =
    record.harikathaSources?.includes(NO_HARIKATHA_VALUE) || !record.harikathaSources?.length
      ? "—"
      : formatList(record.harikathaSources, record.harikathaOther);

  const yn = (v) => (v ? t("common.yes") : t("common.no"));

  return (
    <Modal isOpen={Boolean(record)} onClose={onClose} title={formatLongDate(record.date, locale)} size="md">
      <div className="flex flex-col gap-1">
        <DetailRow label={t("history.wakeUpTime")} value={to12Hour(record.wakeUpTime)} />
        <DetailRow label={t("history.gurudevRemembrance")} value={yn(record.gurudevRemembrance)} />
        <DetailRow label={t("history.mangalaArati")} value={yn(record.mangalaAratiDone)} />
        <DetailRow label={t("history.bhogPrasadam")} value={yn(record.bhogOffered)} />
        <DetailRow label={t("history.granthRead")} value={granthDisplay} />
        <DetailRow label={t("history.harikatha")} value={harikathaDisplay} />
        <DetailRow label={t("history.gaudiyaKirtan")} value={yn(record.gaudiyaKirtan)} />
        <DetailRow label={t("history.totalMala")} value={record.totalMala ?? 0} />
        <DetailRow label={t("history.malaOnAsan")} value={record.malaOnAsan ?? 0} />
        <DetailRow label={t("history.malaWithoutAsan")} value={record.malaWithoutAsan ?? 0} />
        <DetailRow label={t("history.tulsiSeva")} value={yn(record.tulsiSeva)} />
      </div>
    </Modal>
  );
}
