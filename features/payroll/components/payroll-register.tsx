"use client";

import { Play, Wallet } from "lucide-react";
import { useMemo, useState } from "react";

import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import { useEmployeeNameMap } from "@/features/employees/hooks";
import { RunPayrollDrawer } from "@/features/payroll/components/run-payroll-drawer";
import { usePayroll } from "@/features/payroll/hooks";
import { formatDate, money } from "@/lib/format";

function RowSkeleton() {
  return (
    <tr className="border-t border-border-subtle">
      <td className="px-4 py-4 lg:px-6">
        <div className="flex items-center gap-3">
          <SkeletonCircle size={36} />
          <SkeletonText width="9rem" />
        </div>
      </td>
      <td className="hidden px-4 py-4 lg:table-cell lg:px-6">
        <SkeletonText width="5rem" />
      </td>
      <td className="hidden px-4 py-4 lg:table-cell lg:px-6">
        <SkeletonText width="5rem" />
      </td>
      <td className="px-4 py-4 lg:px-6">
        <Skeleton className="h-4 w-20" />
      </td>
    </tr>
  );
}

export function PayrollRegister({ canRun }: { canRun: boolean }) {
  const { data, isLoading, error } = usePayroll();
  const { nameById } = useEmployeeNameMap();

  const [period, setPeriod] = useState<string>("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Every period that has records, newest first.
  const periods = useMemo(() => {
    const unique = new Set((data ?? []).map((record) => record.payPeriod));
    return [...unique].sort((a, b) => b.localeCompare(a));
  }, [data]);

  // Default to the newest period rather than showing every run at once.
  const activePeriod = period || periods[0] || "";

  const rows = useMemo(
    () => (data ?? []).filter((record) => record.payPeriod === activePeriod),
    [data, activePeriod],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, record) => ({
          gross: sum.gross + (record.grossSalary ?? 0),
          deductions: sum.deductions + (record.deductions ?? 0),
          net: sum.net + (record.netSalary ?? 0),
        }),
        { gross: 0, deductions: 0, net: 0 },
      ),
    [rows],
  );

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load the payroll register.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {periods.length > 0 ? (
          <select
            value={activePeriod}
            onChange={(event) => setPeriod(event.target.value)}
            aria-label="Pay period"
            className="h-11 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-64"
          >
            {periods.map((value) => (
              <option key={value} value={value}>
                {formatDate(value) ?? value}
              </option>
            ))}
          </select>
        ) : null}

        {canRun ? (
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 sm:ml-auto"
          >
            <Play size={16} aria-hidden />
            Run payroll
          </button>
        ) : null}
      </div>

      {/* Totals for the selected period — the number HR is usually after. */}
      {!isLoading && rows.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {(
            [
              ["Gross", totals.gross, "text-text-strong"],
              ["Deductions", totals.deductions, "text-error"],
              ["Net", totals.net, "text-primary"],
            ] as const
          ).map(([label, value, tone]) => (
            <div key={label} className="rounded-card bg-surface-raised p-5 shadow-card">
              <p className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
                {label}
              </p>
              <p className={`mt-1 text-h5 tabular-nums ${tone}`}>{money(value) ?? "—"}</p>
              <p className="mt-0.5 text-body-sm text-text-subtle">
                {rows.length} {rows.length === 1 ? "employee" : "employees"}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-card bg-surface-raised shadow-card">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {(
                  [
                    ["Employee", ""],
                    ["Gross", "hidden lg:table-cell"],
                    ["Deductions", "hidden lg:table-cell"],
                    ["Net pay", ""],
                  ] as const
                ).map(([column, hide]) => (
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
                {rows.map((record) => {
                  const name =
                    record.employeeName ?? nameById.get(record.employeeId) ?? null;

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
                          <div className="min-w-0">
                            <p className="truncate text-body-md font-semibold text-text-strong">
                              {name ?? `Employee ${record.employeeId.slice(0, 8)}`}
                            </p>
                            {/* Stands in for the two columns hidden below lg. */}
                            <p className="text-body-sm text-text-subtle lg:hidden">
                              {money(record.grossSalary) ?? "—"} −{" "}
                              {money(record.deductions) ?? "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="hidden px-4 py-4 text-body-md tabular-nums text-text-muted lg:table-cell lg:px-6">
                        {money(record.grossSalary) ?? "—"}
                      </td>

                      <td className="hidden px-4 py-4 text-body-md tabular-nums text-error lg:table-cell lg:px-6">
                        {money(record.deductions) ?? "—"}
                      </td>

                      <td className="px-4 py-4 text-body-md font-bold tabular-nums text-text-strong lg:px-6">
                        {money(record.netSalary) ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

        {!isLoading && rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
              <Wallet size={22} aria-hidden />
            </span>
            <div>
              <p className="text-body-lg font-semibold text-text-strong">
                No payroll has been run
              </p>
              <p className="mt-1 max-w-sm text-body-md text-text-muted">
                {canRun
                  ? "Run a period and every active employee gets a payslip."
                  : "Payslips appear here once an administrator runs a period."}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <RunPayrollDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </div>
  );
}

/*
 * GROUPED BY PERIOD, NOT ONE FLAT LIST
 *
 * GET /payroll returns every record ever generated — a run per month times every
 * employee. Rendered flat, September and August interleave and nothing adds up.
 *
 * The periods are derived from the data itself rather than being a fixed range,
 * so the selector only ever offers periods that exist. It defaults to the newest,
 * which is what someone opening this page is almost always after.
 *
 * THE TOTALS ARE WHY HR OPENS THIS
 *
 * Gross, deductions and net for the selected period. Computed locally because
 * the API has no summary endpoint — accurate here only because /payroll returns
 * every record with no pagination, so the sum is over the whole set rather than
 * a page of it.
 *
 * If pagination is ever added, these totals silently become "the total of
 * whatever happened to load", which looks identical and is wrong. Move them to
 * the server at the same time.
 */
