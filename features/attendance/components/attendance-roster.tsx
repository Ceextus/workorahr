"use client";

import { Users } from "lucide-react";
import { useState } from "react";

import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import {
  duration,
  formatTime,
  todayIso,
} from "@/features/attendance/components/attendance-bits";
import { useAttendance } from "@/features/attendance/hooks";
import { useDepartments } from "@/features/departments/hooks";
import { useEmployeeNameMap } from "@/features/employees/hooks";

const controlClass =
  "h-11 rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md " +
  "text-text-strong outline-none transition-colors focus:border-primary " +
  "focus:ring-2 focus:ring-primary/20";

function RowSkeleton() {
  return (
    <tr className="border-t border-border-subtle">
      <td className="px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={36} />
          <SkeletonText width="9rem" />
        </div>
      </td>
      <td className="px-4 py-4 lg:px-6"><SkeletonText width="4rem" /></td>
      <td className="hidden px-4 py-4 lg:table-cell lg:px-6"><SkeletonText width="4rem" /></td>
      <td className="px-4 py-4 lg:px-6"><Skeleton rounded="pill" className="h-5 w-16" /></td>
    </tr>
  );
}

export function AttendanceRoster() {
  const [date, setDate] = useState(todayIso());
  const [departmentId, setDepartmentId] = useState("");

  const filters = { date, ...(departmentId && { departmentId }) };
  const { data: records, isLoading, error } = useAttendance(filters);
  const { data: departments } = useDepartments();
  // Shared with the leave queue — see useEmployeeNameMap in employees/hooks.ts.
  const { nameById } = useEmployeeNameMap();

  const present = records?.length ?? 0;
  const stillIn = records?.filter((record) => !record.checkOut).length ?? 0;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-card bg-surface-raised p-4 shadow-card lg:flex-row lg:items-center">
        <label className="flex items-center gap-3 text-body-md font-semibold text-text-strong">
          <span className="shrink-0">Date</span>
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={`${controlClass} w-full`}
          />
        </label>

        <select
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
          aria-label="Filter by department"
          className={`${controlClass} w-full lg:w-56`}
        >
          <option value="">All departments</option>
          {departments?.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

        {!isLoading && records ? (
          <p className="text-body-md text-text-muted lg:ml-auto">
            <span className="font-bold text-text-strong">{present}</span> checked in
            {stillIn > 0 ? (
              <>
                {" · "}
                <span className="font-bold text-primary">{stillIn}</span> still in
              </>
            ) : null}
          </p>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
          <p className="text-body-lg font-semibold text-error">
            Could not load attendance.
          </p>
          <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {[
                    ["Employee", ""],
                    ["Checked in", ""],
                    ["Checked out", "hidden lg:table-cell"],
                    ["Duration", ""],
                  ].map(([column, hide]) => (
                    <th
                      key={column}
                      scope="col"
                      className={`bg-surface-sunk px-4 py-3.5 text-body-sm font-semibold uppercase tracking-wide text-text-muted lg:px-6 ${hide}`}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>

              {isLoading ? (
                <tbody>
                  {[0, 1, 2, 3, 4].map((row) => (
                    <RowSkeleton key={row} />
                  ))}
                </tbody>
              ) : (
                <tbody>
                  {records?.map((record) => {
                    const name = nameById.get(record.employeeId);

                    return (
                      <tr
                        key={record.id}
                        className="border-t border-border-subtle transition-colors hover:bg-surface-sunk"
                      >
                        <td className="px-4 py-4 lg:px-6">
                          <div className="flex items-center gap-3">
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-pill bg-primary/10 text-body-sm font-bold text-primary">
                              {name
                                ? name
                                    .split(" ")
                                    .map((part) => part[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()
                                : "?"}
                            </span>
                            <span className="text-body-md font-semibold text-text-strong">
                              {name ?? `Employee ${record.employeeId.slice(0, 8)}`}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 lg:px-6 text-body-md tabular-nums text-text-muted">
                          {formatTime(record.checkIn) ?? "—"}
                        </td>

                        <td className="hidden px-4 py-4 text-body-md tabular-nums text-text-muted lg:table-cell lg:px-6">
                          {record.checkOut ? (
                            formatTime(record.checkOut)
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-2.5 py-1 text-body-sm font-semibold text-primary">
                              <span
                                aria-hidden
                                className="h-1.5 w-1.5 rounded-pill bg-primary"
                              />
                              Still in
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4 text-body-md font-semibold tabular-nums text-text-strong lg:px-6">
                          {/* The hidden column's state has to survive somewhere. */}
                          {record.checkOut ? (
                            duration(record.checkIn, record.checkOut) ?? "—"
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-pill bg-primary/10 px-2.5 py-1 text-body-sm font-semibold text-primary lg:hidden">
                              <span
                                aria-hidden
                                className="h-1.5 w-1.5 rounded-pill bg-primary"
                              />
                              In
                            </span>
                          )}
                          <span className="hidden lg:inline">
                            {record.checkOut ? "" : (duration(record.checkIn, null) ?? "—")}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              )}
            </table>
          </div>

          {!isLoading && !records?.length ? (
            <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
                <Users size={22} aria-hidden />
              </span>
              <div>
                <p className="text-body-lg font-semibold text-text-strong">
                  Nobody checked in
                </p>
                <p className="mt-1 text-body-md text-text-muted">
                  No attendance recorded for this date
                  {departmentId ? " in this department" : ""}.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}

/*
 * JOINING NAMES CLIENT-SIDE, AND WHY IT IS FINE HERE
 *
 * Attendance records carry `employeeId` and no name — the same gap as the leave
 * queue. A roster of UUIDs is useless: the entire question this screen answers
 * is "who is in today".
 *
 * Anyone who can read /attendance can read /employees, so the list is fetched
 * and turned into an id -> name Map. Three things make that cheap rather than
 * wasteful:
 *
 *   - one extra request, not one per row;
 *   - the employees query is already cached, so the directory having been opened
 *     means this costs nothing;
 *   - the Map is memoised on `employees`, so it is rebuilt only when that
 *     changes, not on every filter change or render.
 *
 * The fallback is still a truncated id rather than a blank — visibly a
 * placeholder if an employee has been deactivated and dropped out of the list.
 *
 * The real fix is the backend including a name on the record. The same join
 * would improve the leave queue, which currently shows raw ids.
 *
 * NOTE WHAT THIS SCREEN CANNOT DO
 *
 * There is no way to clock someone else in or out. Both endpoints read the
 * session and take no employeeId, so HR correcting a forgotten check-out has
 * nothing to call. Worth knowing before someone asks for an edit button.
 */
