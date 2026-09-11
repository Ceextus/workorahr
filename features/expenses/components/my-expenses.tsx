"use client";

import { Plus, Receipt } from "lucide-react";
import { useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  CategoryIcon,
  ExpenseStatusChip,
  categoryLabel,
} from "@/features/expenses/components/expense-bits";
import { SubmitExpenseDrawer } from "@/features/expenses/components/submit-expense-drawer";
import { useMyExpenses } from "@/features/expenses/hooks";
import { formatDate, money } from "@/lib/format";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-11 w-11 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="50%" />
        <SkeletonText width="35%" className="h-3" />
      </div>
      <Skeleton rounded="pill" className="h-6 w-20" />
    </div>
  );
}

export function MyExpenses() {
  const { data, isLoading, error } = useMyExpenses();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Newest first — the API promises no order.
  const claims = [...(data ?? [])].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );

  // What you are still owed: approved but not yet paid.
  const outstanding = claims
    .filter((claim) => claim.status === "APPROVED")
    .reduce((sum, claim) => sum + (claim.amount ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {outstanding > 0 ? (
          <p className="text-body-md text-text-muted">
            <span className="font-bold text-text-strong">{money(outstanding)}</span>{" "}
            approved and awaiting payment
          </p>
        ) : (
          <span />
        )}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
        >
          <Plus size={17} aria-hidden />
          New claim
        </button>
      </div>

      <section className="rounded-card bg-surface-raised p-4 shadow-card sm:p-6">
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
          My claims
        </h2>

        <div className="mt-4">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-border-subtle">
              {[0, 1, 2, 3].map((row) => (
                <RowSkeleton key={row} />
              ))}
            </div>
          ) : error ? (
            <p className="py-3 text-body-md text-text-muted">
              Could not load your claims. {error.message}
            </p>
          ) : claims.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
                <Receipt size={22} aria-hidden />
              </span>
              <div>
                <p className="text-body-lg font-semibold text-text-strong">
                  No claims yet
                </p>
                <p className="mt-1 text-body-md text-text-muted">
                  Submit one and you can follow it through to payment here.
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {claims.map((claim) => (
                <li
                  key={claim.id}
                  className="flex flex-wrap items-start gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                    <CategoryIcon category={claim.category} />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-semibold text-text-strong">
                      {claim.description}
                    </p>
                    <p className="text-body-sm text-text-muted">
                      {categoryLabel(claim.category)} ·{" "}
                      {formatDate(claim.submittedAt) ?? claim.submittedAt}
                      {claim.receiptReference ? ` · ${claim.receiptReference}` : ""}
                    </p>

                    {/* The reviewer's note is the reason for a rejection. */}
                    {claim.reviewNotes ? (
                      <p className="mt-1 rounded-field bg-surface-sunk px-3 py-2 text-body-sm text-text-muted">
                        {claim.reviewedBy ? `${claim.reviewedBy}: ` : ""}
                        {claim.reviewNotes}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-3">
                    <ExpenseStatusChip status={claim.status} />
                    <p className="text-body-lg font-bold tabular-nums text-text-strong">
                      {money(claim.amount) ?? "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <SubmitExpenseDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

/*
 * THE OUTSTANDING TOTAL IS THE POINT OF THIS SCREEN
 *
 * "How much am I owed" is the question people open expenses to answer, and it is
 * not any single row — it is the sum of everything APPROVED but not yet PAID.
 *
 * Rendered only when it is above zero: a card announcing you are owed nothing is
 * noise, and its absence already says so.
 *
 * REVIEW NOTES ARE SHOWN ON THE CLAIM, NOT HIDDEN BEHIND A CLICK
 *
 * A rejected claim without its reason is just a dead end. `reviewNotes` is the
 * only place the reason exists, so it sits inline with the reviewer's name.
 *
 * NO CANCEL OR EDIT
 *
 * Leave has DELETE /leaves/{id} for withdrawing your own pending request.
 * Expenses has no equivalent — no delete, no update. Once submitted, a claim can
 * only be moved on by a reviewer. Worth knowing before someone asks for a
 * withdraw button; it would have nothing to call.
 */
