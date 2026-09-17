"use client";

import { AlertCircle, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { usePayroll, useRunPayroll } from "@/features/payroll/hooks";
import { ApiError } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

/** Last day of the current month, which is the shape the docs' example uses. */
function defaultPeriod() {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${endOfMonth.getFullYear()}-${pad(endOfMonth.getMonth() + 1)}-${pad(endOfMonth.getDate())}`;
}

export function RunPayrollDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const periodId = useId();

  const [payPeriod, setPayPeriod] = useState(defaultPeriod);
  const [confirmed, setConfirmed] = useState(false);

  const run = useRunPayroll();
  const { data: existing } = usePayroll();

  // A run for this period already happened — worth saying before they do it twice.
  const alreadyRun = existing?.some((record) => record.payPeriod === payPeriod) ?? false;

  function close() {
    setPayPeriod(defaultPeriod());
    setConfirmed(false);
    run.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!payPeriod || !confirmed) return;

    try {
      await run.mutateAsync({ payPeriod });
      close();
    } catch (cause) {
      console.error("[run payroll] sent:", { payPeriod });
      console.error("[run payroll] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Run payroll"
      description="Creates one payslip for every active employee."
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="h-12 flex-1 rounded-field border border-border-strong text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="run-payroll-form"
            disabled={run.isPending || !confirmed || !payPeriod}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {run.isPending ? "Running…" : "Run payroll"}
          </button>
        </>
      }
    >
      <form id="run-payroll-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <p className="flex items-start gap-2 rounded-field bg-secondary/15 p-4 text-body-sm font-medium text-text-strong">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>
            This cannot be undone. The API has no way to delete or re-run a
            payroll period once it exists.
          </span>
        </p>

        <div className="flex flex-col gap-2">
          <label htmlFor={periodId} className="text-body-md font-semibold text-text-strong">
            Pay period <span className="text-error">*</span>
          </label>
          <input
            id={periodId}
            type="date"
            value={payPeriod}
            onChange={(event) => {
              setPayPeriod(event.target.value);
              // Changing the period invalidates a confirmation given for another.
              setConfirmed(false);
            }}
            className="h-12 w-full rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <p className="text-body-sm text-text-muted">
            A full date, not a month — the docs use the last day of the period.
          </p>
        </div>

        {alreadyRun ? (
          <p className="flex items-start gap-2 rounded-field bg-error/8 p-3 text-body-sm font-medium text-error">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Payroll has already been run for{" "}
              {formatDate(payPeriod) ?? payPeriod}. Running it again will most
              likely duplicate every payslip.
            </span>
          </p>
        ) : null}

        <label className="flex items-start gap-3 rounded-field bg-surface-sunk p-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
          />
          <span className="text-body-md text-text-strong">
            I understand this creates payslips for every active employee and
            cannot be reversed.
          </span>
        </label>

        {run.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-error/8 p-3 text-body-sm font-medium text-error"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p>{run.error.message}</p>
              {run.error instanceof ApiError && run.error.fieldErrors.length > 0 ? (
                <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                  {run.error.fieldErrors.map((fieldError) => (
                    <li key={fieldError.field}>
                      <span className="font-semibold">{fieldError.field}</span>{" "}
                      {fieldError.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ) : null}
      </form>
    </Drawer>
  );
}

/*
 * WHY A CHECKBOX RATHER THAN A CONFIRM DIALOG
 *
 * Destructive actions elsewhere open <ConfirmDialog>, which suits deactivating
 * one employee. This is different in kind: one click writes a row for every
 * active employee, and nothing in the API can undo it.
 *
 * An inline checkbox makes the confirmation part of the form rather than an
 * interruption after it, so the period and the consent are visible together. It
 * also resets whenever the period changes — a confirmation given for September
 * must not carry over to a date the user then edited.
 *
 * THE DUPLICATE WARNING IS THE USEFUL PART
 *
 * `usePayroll()` is already loaded for the register, so checking whether the
 * chosen period has records costs nothing. Payroll being run twice for one month
 * is the obvious way to cause real damage here, and the API will not stop it.
 *
 * WHY THE DEFAULT IS THE END OF THIS MONTH
 *
 * The docs' example is "2026-09-30" — a full date, and the last day of the
 * period rather than the first. Defaulting to that shape makes the expected
 * format obvious without anyone reading the hint.
 */
