import { api, asList } from "@/lib/api-client";

import type {
  CreateExpensePayload,
  ExpenseClaim,
  ExpenseStatus,
  ReviewExpensePayload,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Mine
// ─────────────────────────────────────────────────────────────────────────────

export const getMyExpenses = async () =>
  asList<ExpenseClaim>(await api.get("/expenses"), "GET /expenses");

export const submitExpense = (payload: CreateExpensePayload) =>
  api.post<ExpenseClaim>("/expenses", payload);

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The queue [Manager/HR/Admin]
// ─────────────────────────────────────────────────────────────────────────────

export const listExpenses = async (status?: ExpenseStatus) =>
  asList<ExpenseClaim>(
    await api.get("/expenses/all", { query: { status } }),
    "GET /expenses/all",
  );

/** [Manager+] Body is optional. */
export const approveExpense = (id: string, payload: ReviewExpensePayload = {}) =>
  api.post<ExpenseClaim>(`/expenses/${id}/approve`, payload);

/** [Manager+] Body is optional. */
export const rejectExpense = (id: string, payload: ReviewExpensePayload = {}) =>
  api.post<ExpenseClaim>(`/expenses/${id}/reject`, payload);

/** [HR+] The final step, after approval. */
export const markExpensePaid = (id: string) =>
  api.post<ExpenseClaim>(`/expenses/${id}/mark-paid`);

/*
 * TWO PATHS, NOT ONE ENDPOINT WITH A FLAG
 *
 * `/expenses` is your own claims. `/expenses/all` is the review queue. Note the
 * asymmetry with leaves, where the personal view is the one with the suffix
 * (`/leaves/me`). Same idea, opposite naming — worth reading the path rather
 * than assuming.
 *
 * A FOUR-STEP LIFECYCLE, UNLIKE LEAVE
 *
 *   PENDING -> APPROVED -> PAID
 *   PENDING -> REJECTED
 *
 * Leave stops at approved or rejected. An expense that is approved still owes
 * someone money, so `mark-paid` is a separate action at a higher permission —
 * a manager may approve the spend, but recording payment is HR's.
 *
 * `approve` and `reject` are POST here. The equivalent leave actions are PUT.
 * Nothing in the API is consistent about this, so each one is worth checking
 * against the docs rather than inferring from a sibling.
 */
