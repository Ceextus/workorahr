"use client";

import { Check, Inbox, X } from "lucide-react";
import { useState } from "react";

import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import { useEmployeeNameMap } from "@/features/employees/hooks";
import {
  LeaveStatusChip,
  formatRange,
  leaveDays,
} from "@/features/leaves/components/leave-bits";
import { useApproveLeave, useLeaveQueue, useRejectLeave } from "@/features/leaves/hooks";
import { LEAVE_STATUSES, type LeaveStatus } from "@/features/leaves/types";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <SkeletonCircle size={40} />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="40%" />
        <SkeletonText width="60%" className="h-3" />
      </div>
      <Skeleton rounded="pill" className="h-6 w-24" />
    </div>
  );
}

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function LeaveQueue() {
  // Default to PENDING: this screen exists to clear a queue, not browse history.
  const [status, setStatus] = useState<LeaveStatus | "">("PENDING");
  const [employeeId, setEmployeeId] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useLeaveQueue({
    ...(status && { status }),
    ...(employeeId && { employeeId }),
  });

  const { nameById, employees } = useEmployeeNameMap();

  const approve = useApproveLeave();
  const reject = useRejectLeave();
  const isPending = approve.isPending || reject.isPending;

  async function act(kind: "approve" | "reject", id: string) {
    setActionError(null);
    try {
      await (kind === "approve" ? approve : reject).mutateAsync(id);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "That did not work.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Status tabs scroll rather than wrap on a narrow screen. */}
      <div className="no-scrollbar max-w-full overflow-x-auto">
        <div className="flex w-max gap-1.5 rounded-card bg-surface-raised p-1.5 shadow-card">
          {(["", ...LEAVE_STATUSES] as const).map((option) => (
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

      {/*
        `employeeId` is a documented filter on GET /leaves that nothing was
        using. Now that the employee list is loaded for names anyway, offering
        it costs one <select>.
      */}
      <select
        value={employeeId}
        onChange={(event) => setEmployeeId(event.target.value)}
        aria-label="Filter by employee"
        className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:max-w-xs"
      >
        <option value="">Everyone</option>
        {employees?.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.firstName} {employee.lastName}
          </option>
        ))}
      </select>

      {actionError ? (
        <p
          role="alert"
          className="rounded-card bg-error/8 p-4 text-body-md font-medium text-error ring-1 ring-error/25"
        >
          {actionError}
        </p>
      ) : null}

      <div className="rounded-card bg-surface-raised p-4 shadow-card sm:p-6">
        {isLoading ? (
          <div className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2, 3].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </div>
        ) : error ? (
          <p className="py-4 text-body-md text-text-muted">
            Could not load the queue. {error.message}
          </p>
        ) : !data?.length ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <Inbox size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                {status === "PENDING" ? "Nothing waiting on you" : "No requests here"}
              </p>
              <p className="mt-1 text-body-md text-text-muted">
                {status === "PENDING"
                  ? "Every request has been dealt with."
                  : "Try a different status or employee."}
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {data.map((leave) => {
              const days = leaveDays(leave.startDate, leave.endDate);
              const name =
                leave.employeeName ?? nameById.get(leave.employeeId) ?? null;

              return (
                <li key={leave.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-pill bg-primary/10 text-body-sm font-bold text-primary">
                      {name ? initialsOf(name) : "?"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-md font-semibold text-text-strong">
                        {name ?? `Employee ${leave.employeeId.slice(0, 8)}`}
                      </p>
                      <p className="text-body-sm text-text-muted">
                        {leave.leaveType.charAt(0) +
                          leave.leaveType.slice(1).toLowerCase()}{" "}
                        · {formatRange(leave.startDate, leave.endDate)}
                        {days ? ` · ${days} ${days === 1 ? "day" : "days"}` : ""}
                      </p>
                      {leave.reason ? (
                        <p className="mt-0.5 text-body-sm text-text-subtle">
                          {leave.reason}
                        </p>
                      ) : null}
                    </div>

                    <LeaveStatusChip status={leave.status} />
                  </div>

                  {/* Full-width on a phone, inline from sm up. */}
                  {leave.status === "PENDING" ? (
                    <div className="flex gap-2 sm:pl-13">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => act("approve", leave.id)}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-field bg-primary/10 px-3 text-body-md font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 sm:h-9 sm:flex-none sm:text-body-sm"
                      >
                        <Check size={15} aria-hidden />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => act("reject", leave.id)}
                        className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-field bg-error/10 px-3 text-body-md font-semibold text-error transition-colors hover:bg-error/20 disabled:opacity-50 sm:h-9 sm:flex-none sm:text-body-sm"
                      >
                        <X size={15} aria-hidden />
                        Reject
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/*
 * THE UUID PROBLEM, FIXED
 *
 * The record carries `employeeId` and — per the docs — no name. This queue used
 * to print "Employee 3fa85f64", which tells a manager nothing about whose leave
 * they are approving.
 *
 * `useEmployeeNameMap` fetches the directory once and joins locally. Anyone who
 * can read /leaves can read /employees, so it needs no extra permission, and the
 * employees query is shared with the rest of the app.
 *
 * `leave.employeeName ?? nameById.get(...)` prefers a name the API sends if it
 * ever starts sending one, and falls back to the join. The truncated id remains
 * the last resort — visible if someone has been deactivated and dropped out of
 * the directory, which is exactly when you want to notice.
 *
 * THE EMPLOYEE FILTER WAS FREE
 *
 * GET /leaves documents `employeeId` as a filter and nothing was using it. The
 * employee list is now loaded anyway, so the dropdown costs one element and
 * turns "find Jane's requests" from scrolling into a selection.
 *
 * Both filters go into the query key via `useLeaveQueue`, so changing either
 * refetches — no effect, no manual refetch.
 *
 * MOBILE LAYOUT
 *
 * The row stacks: identity and status on one line, actions beneath. Approve and
 * Reject are full-width 44px targets on a phone and revert to compact inline
 * buttons from `sm`. Deciding someone's leave by mis-tapping a 36px button is
 * the kind of mistake worth designing out.
 *
 * The status tabs scroll horizontally rather than wrapping, so the row keeps a
 * predictable height at any width.
 */
