import { useMemo, useState } from "react";

export const PAGE_SIZE = 50;

/**
 * Client-side paging for lists that are already loaded and filtered.
 * Clamps the page if the list shrinks.
 */
export function usePagination(items, { pageSize = PAGE_SIZE } = {}) {
  const [page, setPage] = useState(1);
  const [lastSignature, setLastSignature] = useState("");

  // Back to page 1 only when the list itself changes (filters, sort) — not
  // merely because the parent re-rendered and handed over a new array.
  const signature = `${items.length}:${items[0]?.id ?? ""}:${items[items.length - 1]?.id ?? ""}`;
  if (signature !== lastSignature) {
    setLastSignature(signature);
    if (page !== 1) setPage(1);
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;

  const pageItems = useMemo(() => items.slice(start, start + pageSize), [items, start, pageSize]);

  return {
    page: currentPage,
    totalPages,
    total,
    pageItems,
    from: total ? start + 1 : 0,
    to: Math.min(start + pageSize, total),
    setPage,
  };
}
