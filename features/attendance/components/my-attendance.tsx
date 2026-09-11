"use client";

import { CalendarClock } from "lucide-react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import {
  duration,
  formatDate,
  formatTime,
} from "@/features/attendance/components/attendance-bits";
import { useMyAttendance } from "@/features/attendance/hooks";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3.5">
      <SkeletonText width="7rem" />
      <div className="flex-1" />
      <SkeletonText width="5rem" className="h-3" />
      <Skeleton rounded="pill" className="h-4 w-16" />
    </div>
  );
}

export function MyAttendance() {
  const { data, isLoading, error } = useMyAttendance();

  // Newest first — the API promises no order.
  const records = [...(data ?? [])].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="rounded-card bg-surface-raised p-6 shadow-card">
      <h2 className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
        My attendance
      </h2>

      <div className="mt-4">
        {isLoading ? (
          <div className="flex flex-col divide-y divide-border-subtle">
            {[0, 1, 2, 3, 4].map((row) => (
              <RowSkeleton key={row} />
            ))}
          </div>
        ) : error ? (
          <p className="py-3 text-body-md text-text-muted">
            Could not load your attendance. {error.message}
          </p>
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <CalendarClock size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                No attendance recorded
              </p>
              <p className="mt-1 text-body-md text-text-muted">
                Check in above and your days will start appearing here.
              </p>
            </div>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-border-subtle">
            {records.map((record) => (
              <li
                key={record.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3.5 first:pt-0 last:pb-0"
              >
                <p className="min-w-32 text-body-md font-semibold text-text-strong">
                  {formatDate(record.date)}
                </p>

                <p className="flex-1 text-body-md tabular-nums text-text-muted">
                  {formatTime(record.checkIn)}
                  {record.checkOut ? ` – ${formatTime(record.checkOut)}` : ""}
                </p>

                {record.checkOut ? (
                  <span className="text-body-md font-semibold tabular-nums text-text-strong">
                    {duration(record.checkIn, record.checkOut) ?? "—"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-2.5 py-1 text-body-sm font-semibold text-primary">
                    <span aria-hidden className="h-1.5 w-1.5 rounded-pill bg-primary" />
                    Still in
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/*
 * `b.date.localeCompare(a.date)` sorts YYYY-MM-DD strings correctly without
 * parsing them into Dates — the format is lexicographically ordered by design.
 * Cheaper, and it cannot be tripped by an unparseable value.
 *
 * A record with no checkOut gets a chip rather than a blank duration. "Still in"
 * is a state worth naming: on a past date it usually means someone forgot to
 * clock out, and a blank cell would hide that.
 */
