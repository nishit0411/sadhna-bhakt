import { useEffect, useMemo, useState } from "react";
import * as devoteeService from "../services/devoteeService";
import { applyReportFilters, buildLocationOptions, defaultReportFilters, ALL } from "../utils/reportFilters";

/**
 * Shared state for the filtered monthly report (admin Reports + mentor
 * Reports): one filter object, one data load per month, and one filtered
 * dataset that the cards, charts, Master Report table and CSV exports all
 * read — so display and export can never disagree.
 *
 * `mentors` ([{ id, name }]) powers the mentor filter; pass [] where it
 * doesn't apply (mentor view — RLS already scopes data to their mentees).
 */
export function useMonthlyReport({ mentors = [], onError } = {}) {
  const [filters, setFilters] = useState(defaultReportFilters);
  const [rows, setRows] = useState([]);
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const { year, month } = filters.cursor;

  // Per-devotee submission rows for the month (all devotees, incl. zero reports).
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    devoteeService
      .getMonthlySubmissionReport(year, month)
      .then((data) => {
        if (!active) return;
        setRows(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        onError?.(err);
        setRows([]);
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const filteredRows = useMemo(() => applyReportFilters(rows, filters, { mentors }), [rows, filters, mentors]);
  const locationOptions = useMemo(() => buildLocationOptions(rows), [rows]);

  // Any non-month filter active → aggregate only the filtered devotees.
  const isNarrowed = filters.location !== ALL || filters.mentorId !== ALL || filters.status !== ALL || Boolean(filters.search.trim());
  const idsKey = isNarrowed ? filteredRows.map((r) => r.id).join(",") : "";

  // Charts/summary via the existing aggregation, scoped to the same filtered set.
  useEffect(() => {
    if (isLoading) return undefined;
    let active = true;
    setIsOverviewLoading(true);
    devoteeService
      .getSanghaMonthlyOverview(year, month, isNarrowed ? { devoteeIds: filteredRows.map((r) => r.id) } : {})
      .then((data) => {
        if (!active) return;
        setOverview(data);
        setIsOverviewLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        onError?.(err);
        setIsOverviewLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, isLoading, idsKey]);

  return {
    filters,
    setFilters,
    resetFilters: () => setFilters(defaultReportFilters()),
    rows,
    filteredRows,
    locationOptions,
    overview,
    isLoading,
    isOverviewLoading,
  };
}
