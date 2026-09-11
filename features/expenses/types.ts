export const EXPENSE_CATEGORIES = [
  "TRAVEL",
  "MEALS",
  "SUPPLIES",
  "SOFTWARE",
  "OTHER",
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/*
 * THESE CHANGED IN THE TEAMHUB DOCS.
 *
 * The earlier EMS collection listed ACCOMMODATION, EQUIPMENT and TRAINING.
 * Those are gone; SUPPLIES and SOFTWARE replaced them. The current docs state
 * the set explicitly — "category must be one of: TRAVEL, MEALS, SUPPLIES,
 * SOFTWARE, OTHER" — so unlike LEAVE_TYPES this list is confirmed, not
 * inherited.
 */

export const EXPENSE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "PAID"] as const;
export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export interface ExpenseClaim {
  id: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  receiptReference: string | null;
  status: ExpenseStatus;
  submittedAt: string;
  /** Who reviewed it — a name, per the documented response. */
  reviewedBy: string | null;
  reviewNotes: string | null;
  /** Not in the documented response; the queue falls back to the name map. */
  employeeId?: string;
  employeeName?: string | null;
}

export interface CreateExpensePayload {
  category: ExpenseCategory;
  amount: number;
  description: string;
  receiptReference?: string;
}

/** Approve and reject both take this, and the body is optional. */
export interface ReviewExpensePayload {
  reviewNotes?: string;
}
