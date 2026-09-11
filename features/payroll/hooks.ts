"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as payrollApi from "./api";

export const payrollKeys = {
  all: ["payroll"] as const,
  list: () => [...payrollKeys.all, "list"] as const,
  me: () => [...payrollKeys.all, "me"] as const,
  detail: (id: string) => [...payrollKeys.all, "detail", id] as const,
  forEmployee: (id: string) => [...payrollKeys.all, "employee", id] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Reads
// ─────────────────────────────────────────────────────────────────────────────

/** Every employee can read their own payslips. */
export const useMyPayslips = () =>
  useQuery({ queryKey: payrollKeys.me(), queryFn: payrollApi.getMyPayslips });

/** [HR/ADMIN] — `retry: false` so a 403 settles instead of retrying. */
export function usePayroll(enabled = true) {
  return useQuery({
    queryKey: payrollKeys.list(),
    queryFn: payrollApi.listPayroll,
    enabled,
    retry: false,
  });
}

/** [HR/ADMIN] */
export function usePayrollForEmployee(employeeId: string, enabled = true) {
  return useQuery({
    queryKey: payrollKeys.forEmployee(employeeId),
    queryFn: () => payrollApi.getPayrollForEmployee(employeeId),
    enabled: enabled && Boolean(employeeId),
    retry: false,
  });
}

/** [HR/ADMIN] */
export function usePayrollRecord(id: string) {
  return useQuery({
    queryKey: payrollKeys.detail(id),
    queryFn: () => payrollApi.getPayroll(id),
    enabled: Boolean(id),
    retry: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Running payroll
// ─────────────────────────────────────────────────────────────────────────────

export function useRunPayroll() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: payrollApi.runPayroll,
    // A run creates a record per active employee — everything payroll is stale.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
      toast.success("Payroll run generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to run payroll");
    },
  });
}

/*
 * RUNNING PAYROLL IS THE HEAVIEST WRITE IN THIS API.
 *
 * One call generates a Payroll record for every active employee. There is no
 * endpoint to undo it, no delete, and no way to re-run a period cleanly — so the
 * UI treats it as irreversible, because as far as the API is concerned it is.
 *
 * That shapes three things in run-payroll-drawer.tsx: an explicit confirmation
 * step, a disabled button while pending so a double-click cannot fire twice, and
 * a warning if the chosen period already has records.
 *
 * `invalidateQueries({ queryKey: payrollKeys.all })` rather than anything
 * narrower: a run changes the register, every employee's payslips, and every
 * per-employee view at once. This is the rare case where the blast radius really
 * is everything under the prefix.
 */
