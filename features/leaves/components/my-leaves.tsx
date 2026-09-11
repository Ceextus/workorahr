"use client";

import { CalendarPlus, CalendarX2, X } from "lucide-react";
import { useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  LeaveStatusChip,
  formatRange,
  leaveDays,
} from "@/features/leaves/components/leave-bits";
import { SubmitLeaveDrawer } from "@/features/leaves/components/submit-leave-drawer";
import { useCancelLeave, useMyLeaves } from "@/features/leaves/hooks";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-11 w-11 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="45%" />
        <SkeletonText width="65%" className="h-3" />
      </div>
      <Skeleton rounded="pill" className="h-6 w-24" />
    </div>
  );
}

export function MyLeaves() {
  const { data, isLoading, error } = useMyLeaves();
  const cancel = useCancelLeave();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Newest first — the API promises no order.
  const leaves = [...(data ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  async function handleCancel(id: string) {
    if (!confirm("Cancel this leave request?")) return;
    setCancelError(null);
    try {
      await cancel.mutateAsync(id);
    } catch (cause) {
      setCancelError(cause instanceof Error ? cause.message : "Could not cancel it.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-11 items-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
        >
          <CalendarPlus size={17} aria-hidden />
          Request leave
        </button>
      </div>

      {cancelError ? (
        <p
          role="alert"
          className="rounded-card bg-error/8 p-4 text-body-md font-medium text-error ring-1 ring-error/25"
        >
          {cancelError}
        </p>
      ) : null}

      <div className="rounded-card bg-surface-raised p-6 shadow-card">
        {isLoading ? (
          <div className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2, 3].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </div>
        ) : error ? (
          <p className="py-4 text-body-md text-text-muted">
            Could not load your leave history. {error.message}
          </p>
        ) : leaves.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <CalendarX2 size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                No leave requests yet
              </p>
              <p className="mt-1 text-body-md text-text-muted">
                Anything you request will appear here with its status.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {leaves.map((leave) => {
              const days = leaveDays(leave.startDate, leave.endDate);

              return (
                <li
                  key={leave.id}
                  className="flex flex-wrap items-center gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-semibold text-text-strong">
                      {leave.leaveType.charAt(0) +
                        leave.leaveType.slice(1).toLowerCase()}{" "}
                      · {formatRange(leave.startDate, leave.endDate)}
                    </p>
                    <p className="text-body-sm text-text-muted">
                      {days ? `${days} ${days === 1 ? "day" : "days"}` : "—"}
                      {leave.reason ? ` · ${leave.reason}` : ""}
                    </p>
                  </div>

                  <LeaveStatusChip status={leave.status} />

                  {/* Only a pending request can be cancelled — the API enforces it too. */}
                  {leave.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={() => handleCancel(leave.id)}
                      disabled={cancel.isPending}
                      aria-label="Cancel this request"
                      className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-surface-sunk text-text-muted transition-colors hover:text-error disabled:opacity-50"
                    >
                      <X size={16} aria-hidden />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <SubmitLeaveDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

/*
 * THE CANCEL BUTTON ONLY EXISTS ON PENDING ROWS
 *
 * The API refuses to cancel anything already approved, rejected or cancelled, so
 * showing the control on those rows would be offering an action that can only
 * fail. The condition here mirrors the backend rule rather than inventing one.
 *
 * Sorting happens on a copy — `[...(data ?? [])]` — because `.sort()` mutates in
 * place and that array belongs to the query cache.
 */
