"use client";

import { AlertCircle, LogIn, LogOut } from "lucide-react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  duration,
  formatTime,
  recordFor,
  todayIso,
} from "@/features/attendance/components/attendance-bits";
import {
  useCheckIn,
  useCheckOut,
  useMyAttendance,
} from "@/features/attendance/hooks";

export function CheckInCard() {
  const { data, isLoading, error } = useMyAttendance();
  const clockIn = useCheckIn();
  const clockOut = useCheckOut();

  const today = recordFor(data, todayIso());
  const pending = clockIn.isPending || clockOut.isPending;
  const actionError = clockIn.error ?? clockOut.error;

  /*
   * Three states, decided entirely by today's record:
   *
   *   no record          -> not in yet          -> Check in
   *   record, no checkOut -> currently in       -> Check out
   *   record with checkOut -> done for today    -> no action
   */
  const state = !today ? "out" : today.checkOut ? "done" : "in";

  if (isLoading) {
    return (
      <section className="flex flex-col gap-5 rounded-card bg-surface-raised p-6 shadow-card">
        <div className="flex flex-col gap-2">
          <SkeletonText width="35%" className="h-4" />
          <SkeletonText width="55%" className="h-3" />
        </div>
        <Skeleton className="h-12 w-full" />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-card bg-surface-raised p-6 shadow-card">
      <div>
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
          Today
        </h2>

        {state === "out" ? (
          <p className="mt-2 text-h5 text-text-strong">Not checked in yet</p>
        ) : (
          <>
            <p className="mt-2 text-h5 tabular-nums text-text-strong">
              {formatTime(today!.checkIn)}
              {today!.checkOut ? ` – ${formatTime(today!.checkOut)}` : ""}
            </p>
            <p className="mt-1 text-body-md text-text-muted">
              {state === "in"
                ? `Checked in · ${duration(today!.checkIn, null) ?? ""} so far`
                : `Total ${duration(today!.checkIn, today!.checkOut) ?? "—"}`}
            </p>
          </>
        )}
      </div>

      {state === "out" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => clockIn.mutate()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-field bg-primary text-body-md font-semibold text-white transition-colors hover:brightness-95 disabled:opacity-60"
        >
          <LogIn size={17} aria-hidden />
          {clockIn.isPending ? "Checking in…" : "Check in"}
        </button>
      ) : state === "in" ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => clockOut.mutate()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:opacity-60"
        >
          <LogOut size={17} aria-hidden />
          {clockOut.isPending ? "Checking out…" : "Check out"}
        </button>
      ) : (
        <p className="rounded-field bg-primary/8 px-4 py-3 text-center text-body-md font-semibold text-primary">
          Done for today
        </p>
      )}

      {error ? (
        <p className="text-body-sm text-text-muted">
          Could not load today&rsquo;s record. {error.message}
        </p>
      ) : null}

      {actionError ? (
        <p
          role="alert"
          className="flex items-start gap-2 text-body-sm font-medium text-error"
        >
          <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
          {actionError.message}
        </p>
      ) : null}
    </section>
  );
}

/*
 * THE STATE IS DERIVED, NEVER STORED
 *
 * There is no `isCheckedIn` in component state. It is read from today's record
 * on every render, so a check-in from another tab or device shows up here the
 * moment the query refetches.
 *
 * Local state would drift the instant the two disagreed, and the disagreement is
 * exactly the case that matters: someone clocked in on their phone.
 *
 * THE "DONE" STATE OFFERS NO BUTTON
 *
 * Once today's record has a checkOut, there is nothing to call — POST check-in
 * would either fail or create a second record, and PUT check-out has nothing
 * left to close. The API has no re-open, so neither does the card.
 */
