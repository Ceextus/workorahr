"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import * as expensesApi from "./api";
import type { ExpenseStatus, ReviewExpensePayload } from "./types";

export const expenseKeys = {
  all: ["expenses"] as const,
  mine: () => [...expenseKeys.all, "mine"] as const,
  queue: (status?: ExpenseStatus) => [...expenseKeys.all, "queue", status ?? "ALL"] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Reads
// ─────────────────────────────────────────────────────────────────────────────

export const useMyExpenses = () =>
  useQuery({ queryKey: expenseKeys.mine(), queryFn: expensesApi.getMyExpenses });

/** [Manager+] — `retry: false` so a 403 settles instead of retrying. */
export function useExpenseQueue(status?: ExpenseStatus, enabled = true) {
  return useQuery({
    queryKey: expenseKeys.queue(status),
    queryFn: () => expensesApi.listExpenses(status),
    enabled,
    retry: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Writes
// ─────────────────────────────────────────────────────────────────────────────

function useExpenseMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  successMessage: string,
  fallbackErrorMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: () => {
      // One claim lives in both the submitter's list and the reviewer's queue.
      queryClient.invalidateQueries({ queryKey: expenseKeys.all });
      queryClient.invalidateQueries({ queryKey: ["ops-pulse"] });
      toast.success(successMessage);
    },
    onError: (error: Error) => {
      toast.error(error.message || fallbackErrorMessage);
    },
  });
}

export const useSubmitExpense = () =>
  useExpenseMutation(
    expensesApi.submitExpense,
    "Expense claim submitted",
    "Failed to submit expense claim",
  );

export const useApproveExpense = () =>
  useExpenseMutation(
    ({ id, payload }: { id: string; payload?: ReviewExpensePayload }) =>
      expensesApi.approveExpense(id, payload),
    "Expense approved",
    "Failed to approve expense",
  );

export const useRejectExpense = () =>
  useExpenseMutation(
    ({ id, payload }: { id: string; payload?: ReviewExpensePayload }) =>
      expensesApi.rejectExpense(id, payload),
    "Expense rejected",
    "Failed to reject expense",
  );

export const useMarkExpensePaid = () =>
  useExpenseMutation(
    expensesApi.markExpensePaid,
    "Expense marked as paid",
    "Failed to mark expense as paid",
  );

/*
 * EVERY MUTATION INVALIDATES THE WHOLE PREFIX, PLUS OPS-PULSE.
 *
 * Same reasoning as leaves: one claim appears in the submitter's `/expenses` and
 * the reviewer's `/expenses/all`, so approving in one leaves the other stale.
 *
 * `ops-pulse` shows `pendingExpenses`. Approve one and that count is wrong by
 * exactly one — the kind of staleness nobody notices until they are counting.
 * Submitting changes it too, in the other direction.
 */
