"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as attendanceApi from "./api";
import type { AttendanceFilters, MonthlyReportQuery } from "./types";

export const attendanceKeys = {
  all: ["attendance"] as const,
  mine: () => [...attendanceKeys.all, "mine"] as const,
  list: (filters: AttendanceFilters) => [...attendanceKeys.all, "list", filters] as const,
  report: (query: MonthlyReportQuery) =>
    [...attendanceKeys.all, "report", query] as const,
};

export const useMyAttendance = () =>
  useQuery({ queryKey: attendanceKeys.mine(), queryFn: attendanceApi.getMyAttendance });

export function useAttendance(filters: AttendanceFilters = {}, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.list(filters),
    queryFn: () => attendanceApi.listAttendance(filters),
    enabled,
    // A 403 for a non-HR viewer will not become a 200 on retry.
    retry: false,
  });
}

export function useMonthlyReport(query: MonthlyReportQuery, enabled = true) {
  return useQuery({
    queryKey: attendanceKeys.report(query),
    queryFn: () => attendanceApi.getMonthlyReport(query),
    enabled,
    retry: false,
  });
}

function useClockMutation<T>(
  mutationFn: () => Promise<T>,
  successMessage: string,
  fallbackErrorMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      // The dashboard's "checked in today" count just changed.
      queryClient.invalidateQueries({ queryKey: ["ops-pulse"] });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || fallbackErrorMessage);
    },
  });
}

export const useCheckIn = () =>
  useClockMutation(
    attendanceApi.checkIn,
    "Checked in successfully",
    "Failed to check in",
  );
export const useCheckOut = () =>
  useClockMutation(
    attendanceApi.checkOut,
    "Checked out successfully",
    "Failed to check out",
  );

/*
 * WHY CLOCKING IN INVALIDATES `ops-pulse`
 *
 * The dashboard shows `todayCheckIns`. Clock in and that number is immediately
 * wrong — by exactly one, which is the kind of stale value nobody notices until
 * they are counting.
 *
 * It is the second place in this codebase where a mutation has to reach outside
 * its own key prefix (deleting a role invalidating employees is the other). Both
 * exist because the relationship is real, not for safety.
 */
