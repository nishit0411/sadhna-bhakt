import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "./Button";
import { useTranslation } from "../../i18n/LanguageContext";

/** Prev / Next pager for usePagination(). Hidden when everything fits on one page. */
export default function Pagination({ page, totalPages, total, from, to, onPageChange }) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-xs text-brown-500">{t("common.pageInfo", { from, to, total, page, pages: totalPages })}</p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" icon={ChevronLeft} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t("common.prev")}
        </Button>
        <Button variant="outline" size="sm" icon={ChevronRight} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
