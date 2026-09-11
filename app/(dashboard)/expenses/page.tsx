import type { Metadata } from "next";

import { ExpenseQueue } from "@/features/expenses/components/expense-queue";
import { MyExpenses } from "@/features/expenses/components/my-expenses";
import { getSession } from "@/lib/auth";
import { isHR, isManager } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Expenses · Workora",
};

export default async function ExpensesPage() {
  const user = await getSession();
  const canReview = isManager(user?.userType);
  const canMarkPaid = isHR(user?.userType);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-h4 text-text-strong sm:text-h3">Expenses</h1>
        <p className="mt-1 text-body-lg text-text-muted">
          Claim what you have spent, and track it through to payment.
        </p>
      </header>

      <MyExpenses />

      {canReview ? (
        <section className="flex flex-col gap-4 border-t border-border-subtle pt-6">
          <div>
            <h2 className="text-h5 text-text-strong">Review queue</h2>
            <p className="mt-1 text-body-md text-text-muted">
              Claims submitted across the team.
            </p>
          </div>
          <ExpenseQueue canMarkPaid={canMarkPaid} />
        </section>
      ) : null}
    </div>
  );
}

/*
 * THREE PERMISSION LEVELS, AND THEY DO NOT COLLAPSE INTO ONE.
 *
 *   everyone   GET /expenses, POST /expenses — your own claims
 *   Manager+   GET /expenses/all, approve, reject
 *   HR+        mark-paid
 *
 * So a manager reviews the spend and HR records the payment. `canReview` and
 * `canMarkPaid` are separate checks for that reason — reusing one would put a
 * "Mark as paid" button in front of managers that only ever 403s.
 *
 * Same shape as attendance and payroll: the personal half always renders, the
 * team half is appended. All three gates are courtesy; the backend re-checks
 * every call, and `useExpenseQueue` sets `retry: false` so a 403 settles rather
 * than being retried.
 */
