"use client";

import { Banknote, Check, Inbox, X } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import { useEmployeeNameMap } from "@/features/employees/hooks";
import {
  CategoryIcon,
  ExpenseStatusChip,
  categoryLabel,
} from "@/features/expenses/components/expense-bits";
import {
  useApproveExpense,
  useExpenseQueue,
  useMarkExpensePaid,
  useRejectExpense,
} from "@/features/expenses/hooks";
import { EXPENSE_STATUSES, type ExpenseClaim, type ExpenseStatus } from "@/features/expenses/types";
import { formatDate, money } from "@/lib/format";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Review drawer
// ─────────────────────────────────────────────────────────────────────────────

interface Review {
  claim: ExpenseClaim;
  kind: "approve" | "reject";
}

function ReviewDrawer({
  review,
  onClose,
}: {
  review: Review | null;
  onClose: () => void;
}) {
  const notesId = useId();
  const [notes, setNotes] = useState("");

  const approve = useApproveExpense();
  const reject = useRejectExpense();
  const pending = approve.isPending || reject.isPending;

  // Reset the note whenever a different claim or action is opened.
  const identity = review ? `${review.kind}:${review.claim.id}` : null;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  if (identity !== null && identity !== loadedFor) {
    setLoadedFor(identity);
    setNotes("");
  }

  if (!review) return null;
  const isApprove = review.kind === "approve";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!review) return;

    const payload = notes.trim() ? { reviewNotes: notes.trim() } : undefined;

    try {
      await (isApprove ? approve : reject).mutateAsync({
        id: review.claim.id,
        payload,
      });
      onClose();
    } catch {
      // Surfaced by the hook's error toast.
    }
  }

  return (
    <Drawer
      open
      onClose={onClose}
      title={isApprove ? "Approve claim" : "Reject claim"}
      description={`${review.claim.description} · ${money(review.claim.amount) ?? ""}`}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-field border border-border-strong text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="review-expense-form"
            disabled={pending}
            className={`h-12 flex-1 rounded-field text-body-md font-semibold text-white transition-colors disabled:bg-grey-300 disabled:text-text-subtle ${
              isApprove ? "bg-primary hover:brightness-95" : "bg-error hover:brightness-95"
            }`}
          >
            {pending ? "Saving…" : isApprove ? "Approve" : "Reject"}
          </button>
        </>
      }
    >
      <form
        id="review-expense-form"
        onSubmit={handleSubmit}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={notesId} className="text-body-md font-semibold text-text-strong">
            Review note
          </label>
          <textarea
            id={notesId}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={4}
            placeholder={
              isApprove ? "Approved — within policy" : "Missing receipt"
            }
            className="w-full resize-none rounded-field border border-border-subtle bg-surface-raised px-4 py-3 text-body-md text-text-strong outline-none transition-colors placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-body-sm text-text-muted">
            {isApprove
              ? "Optional."
              : "Optional, but this is the only thing that tells them why."}
          </p>
        </div>
      </form>
    </Drawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The queue
// ─────────────────────────────────────────────────────────────────────────────

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <SkeletonCircle size={40} />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="45%" />
        <SkeletonText width="60%" className="h-3" />
      </div>
      <Skeleton rounded="pill" className="h-6 w-20" />
    </div>
  );
}

export function ExpenseQueue({ canMarkPaid }: { canMarkPaid: boolean }) {
  const [status, setStatus] = useState<ExpenseStatus | "">("PENDING");
  const [review, setReview] = useState<Review | null>(null);

  const { data, isLoading, error } = useExpenseQueue(status || undefined);
  const { nameById } = useEmployeeNameMap();
  const markPaid = useMarkExpensePaid();

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs scroll rather than wrap on a narrow screen. */}
      <div className="no-scrollbar max-w-full overflow-x-auto">
        <div className="flex w-max gap-1.5 rounded-card bg-surface-raised p-1.5 shadow-card">
          {(["", ...EXPENSE_STATUSES] as const).map((option) => (
            <button
              key={option || "all"}
              type="button"
              onClick={() => setStatus(option)}
              aria-pressed={status === option}
              className={`shrink-0 rounded-field px-4 py-2.5 text-body-md font-semibold transition-colors ${
                status === option
                  ? "bg-grey-900 text-white"
                  : "text-text-muted hover:bg-surface-sunk hover:text-text-strong"
              }`}
            >
              {option ? option.charAt(0) + option.slice(1).toLowerCase() : "All"}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
          <p className="text-body-lg font-semibold text-error">
            Could not load the queue.
          </p>
          <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
        </div>
      ) : (
        <div className="rounded-card bg-surface-raised p-4 shadow-card sm:p-6">
          {isLoading ? (
            <div className="flex flex-col divide-y divide-border-subtle">
              {[0, 1, 2, 3].map((row) => (
                <RowSkeleton key={row} />
              ))}
            </div>
          ) : !data?.length ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
                <Inbox size={22} aria-hidden />
              </span>
              <div>
                <p className="text-body-lg font-semibold text-text-strong">
                  {status === "PENDING"
                    ? "Nothing waiting on you"
                    : "No claims here"}
                </p>
                <p className="mt-1 text-body-md text-text-muted">
                  {status === "PENDING"
                    ? "Every claim has been reviewed."
                    : "Try a different status."}
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {data.map((claim) => {
                const name =
                  claim.employeeName ??
                  (claim.employeeId ? nameById.get(claim.employeeId) : null) ??
                  null;

                return (
                  <li
                    key={claim.id}
                    className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                        <CategoryIcon category={claim.category} />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body-md font-semibold text-text-strong">
                          {claim.description}
                        </p>
                        <p className="text-body-sm text-text-muted">
                          {name ? `${name} · ` : ""}
                          {categoryLabel(claim.category)} ·{" "}
                          {formatDate(claim.submittedAt) ?? claim.submittedAt}
                        </p>
                        {claim.reviewNotes ? (
                          <p className="mt-1 text-body-sm text-text-subtle">
                            {claim.reviewedBy ? `${claim.reviewedBy}: ` : ""}
                            {claim.reviewNotes}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <p className="text-body-lg font-bold tabular-nums text-text-strong">
                          {money(claim.amount) ?? "—"}
                        </p>
                        <ExpenseStatusChip status={claim.status} />
                      </div>
                    </div>

                    {/*
                      PENDING can be approved or rejected. APPROVED can be paid,
                      and only by HR. Everything else is terminal.
                    */}
                    {claim.status === "PENDING" ? (
                      <div className="flex gap-2 sm:pl-13">
                        <button
                          type="button"
                          onClick={() => setReview({ claim, kind: "approve" })}
                          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-field bg-primary/10 px-3 text-body-md font-semibold text-primary transition-colors hover:bg-primary/20 sm:h-9 sm:flex-none sm:text-body-sm"
                        >
                          <Check size={15} aria-hidden />
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => setReview({ claim, kind: "reject" })}
                          className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-field bg-error/10 px-3 text-body-md font-semibold text-error transition-colors hover:bg-error/20 sm:h-9 sm:flex-none sm:text-body-sm"
                        >
                          <X size={15} aria-hidden />
                          Reject
                        </button>
                      </div>
                    ) : claim.status === "APPROVED" && canMarkPaid ? (
                      <div className="flex sm:pl-13">
                        <button
                          type="button"
                          disabled={markPaid.isPending}
                          onClick={() => markPaid.mutate(claim.id)}
                          className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-field bg-grey-900 px-4 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:opacity-50 sm:h-9 sm:w-auto sm:text-body-sm"
                        >
                          <Banknote size={15} aria-hidden />
                          Mark as paid
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <ReviewDrawer review={review} onClose={() => setReview(null)} />
    </div>
  );
}

/*
 * WHY APPROVE AND REJECT OPEN A DRAWER RATHER THAN ACTING IMMEDIATELY
 *
 * Both endpoints accept an optional `reviewNotes`, and for a rejection that note
 * is the only explanation the submitter ever gets. Firing the mutation straight
 * from the row would make the useful case — saying why — impossible.
 *
 * The drawer defaults to empty and the note stays optional, so approving is
 * still two clicks rather than a form to fill in.
 *
 * WHICH ACTIONS APPEAR IS DRIVEN BY THE LIFECYCLE, NOT BY ROLE ALONE
 *
 *   PENDING   -> Approve / Reject     [Manager+]
 *   APPROVED  -> Mark as paid         [HR+]
 *   REJECTED  -> nothing
 *   PAID      -> nothing
 *
 * `canMarkPaid` is a separate prop from the page's Manager+ gate, because a
 * manager can approve spending without being able to record that it was paid.
 * Reusing one flag would offer managers a button that 403s.
 *
 * The two terminal states get no controls at all — the API has no un-reject and
 * no un-pay, so there is nothing to offer.
 */
