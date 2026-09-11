"use client";

import { Receipt } from "lucide-react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { useMyPayslips } from "@/features/payroll/hooks";
import { formatDate, formatDateTime, money } from "@/lib/format";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-4">
      <Skeleton className="h-11 w-11 shrink-0" />
      <div className="flex flex-1 flex-col gap-2">
        <SkeletonText width="40%" />
        <SkeletonText width="60%" className="h-3" />
      </div>
      <SkeletonText width="5rem" className="h-4" />
    </div>
  );
}

export function MyPayslips() {
  const { data, isLoading, error } = useMyPayslips();

  // Newest period first — the API promises no order.
  const payslips = [...(data ?? [])].sort((a, b) =>
    b.payPeriod.localeCompare(a.payPeriod),
  );

  const latest = payslips[0];

  return (
    <div className="flex flex-col gap-4">
      {/* The most recent net pay, called out — it is the number people open this for. */}
      {!isLoading && latest ? (
        <section className="flex flex-col gap-1 rounded-card bg-surface-raised p-6 shadow-card">
          <p className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
            Latest net pay
          </p>
          <p className="text-h3 tabular-nums text-text-strong">
            {money(latest.netSalary) ?? "—"}
          </p>
          <p className="text-body-md text-text-muted">
            For {formatDate(latest.payPeriod) ?? latest.payPeriod}
            {latest.processedAt
              ? ` · processed ${formatDateTime(latest.processedAt)}`
              : ""}
          </p>
        </section>
      ) : null}

      <section className="rounded-card bg-surface-raised p-4 shadow-card sm:p-6">
        <h2 className="text-body-sm font-semibold uppercase tracking-wide text-text-muted">
          Payslip history
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
              Could not load your payslips. {error.message}
            </p>
          ) : payslips.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
                <Receipt size={22} aria-hidden />
              </span>
              <div>
                <p className="text-body-lg font-semibold text-text-strong">
                  No payslips yet
                </p>
                <p className="mt-1 text-body-md text-text-muted">
                  They appear here once payroll has been run for a period.
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-border-subtle">
              {payslips.map((payslip) => (
                <li
                  key={payslip.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4 first:pt-0 last:pb-0"
                >
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                    <Receipt size={18} aria-hidden />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-body-md font-semibold text-text-strong">
                      {formatDate(payslip.payPeriod) ?? payslip.payPeriod}
                    </p>
                    <p className="text-body-sm text-text-muted">
                      Gross {money(payslip.grossSalary) ?? "—"} · Deductions{" "}
                      {money(payslip.deductions) ?? "—"}
                    </p>
                  </div>

                  <p className="text-body-lg font-bold tabular-nums text-text-strong">
                    {money(payslip.netSalary) ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

/*
 * `localeCompare` ON THE PERIOD STRING
 *
 * `payPeriod` is YYYY-MM-DD, which sorts correctly as text — no Date parsing,
 * and an unparseable value cannot throw the sort off.
 *
 * WHY THE LATEST PAYSLIP GETS ITS OWN CARD
 *
 * Everything in the list is the same shape, so a plain history buries the one
 * number most people came for. Lifting the latest net pay out means the answer
 * is visible without reading a row.
 *
 * It renders only when there is data — no empty card promising a figure that
 * does not exist yet.
 *
 * NO DOWNLOAD BUTTON
 *
 * The mockups show a PDF download per payslip. There is no endpoint for it —
 * /payroll returns JSON records and nothing streams a document. A button that
 * downloads nothing is worse than its absence.
 */
