"use client";

import { AlertCircle } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { leaveDays } from "@/features/leaves/components/leave-bits";
import { useSubmitLeave } from "@/features/leaves/hooks";
import { LEAVE_TYPES, type LeaveType } from "@/features/leaves/types";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "h-12 w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

const label = (value: string) =>
  value.charAt(0) + value.slice(1).toLowerCase().replace("_", " ");

export function SubmitLeaveDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const typeId = useId();
  const startId = useId();
  const endId = useId();
  const reasonId = useId();

  const [leaveType, setLeaveType] = useState<LeaveType>("ANNUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const submit = useSubmitLeave();
  const days = startDate && endDate ? leaveDays(startDate, endDate) : null;

  const errors = {
    startDate: startDate ? undefined : "Choose a start date.",
    endDate: !endDate
      ? "Choose an end date."
      : days === null
        ? "The end date must not be before the start date."
        : undefined,
  };
  const isValid = !errors.startDate && !errors.endDate;

  function close() {
    setLeaveType("ANNUAL");
    setStartDate("");
    setEndDate("");
    setReason("");
    setTouched(false);
    submit.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      leaveType,
      startDate,
      endDate,
      ...(reason.trim() && { reason: reason.trim() }),
    };

    try {
      await submit.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[submit leave] sent:", payload);
      console.error("[submit leave] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="Request leave"
      description="Your manager is notified once you submit."
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
            form="submit-leave-form"
            disabled={submit.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {submit.isPending ? "Submitting…" : "Submit request"}
          </button>
        </>
      }
    >
      <form
        id="submit-leave-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={typeId} className="text-body-md font-semibold text-text-strong">
            Leave type <span className="text-error">*</span>
          </label>
          <select
            id={typeId}
            value={leaveType}
            onChange={(event) => setLeaveType(event.target.value as LeaveType)}
            className={`${fieldBase} border-border-subtle`}
          >
            {LEAVE_TYPES.map((type) => (
              <option key={type} value={type}>
                {label(type)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor={startId} className="text-body-md font-semibold text-text-strong">
              From <span className="text-error">*</span>
            </label>
            <input
              id={startId}
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              aria-invalid={Boolean(touched && errors.startDate)}
              className={`${fieldBase} ${touched && errors.startDate ? "border-error" : "border-border-subtle"}`}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={endId} className="text-body-md font-semibold text-text-strong">
              To <span className="text-error">*</span>
            </label>
            <input
              id={endId}
              type="date"
              value={endDate}
              // Can't end before it starts — enforced by the picker, not just checked.
              min={startDate || undefined}
              onChange={(event) => setEndDate(event.target.value)}
              aria-invalid={Boolean(touched && errors.endDate)}
              className={`${fieldBase} ${touched && errors.endDate ? "border-error" : "border-border-subtle"}`}
            />
          </div>
        </div>

        {touched && (errors.startDate || errors.endDate) ? (
          <p className="flex items-center gap-1.5 text-body-sm font-medium text-error">
            <AlertCircle size={14} aria-hidden />
            {errors.startDate ?? errors.endDate}
          </p>
        ) : days ? (
          <p className="rounded-field bg-primary/8 px-4 py-3 text-body-md font-semibold text-text-strong">
            {days} {days === 1 ? "day" : "days"} of leave
          </p>
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor={reasonId} className="text-body-md font-semibold text-text-strong">
            Reason
          </label>
          <textarea
            id={reasonId}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            placeholder="Family vacation"
            className={`resize-none py-3 ${fieldBase} h-auto border-border-subtle`}
          />
          <p className="text-body-sm text-text-muted">Optional.</p>
        </div>

        {submit.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-error/8 p-3 text-body-sm font-medium text-error"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p>{submit.error.message}</p>
              {submit.error instanceof ApiError && submit.error.fieldErrors.length > 0 ? (
                <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                  {submit.error.fieldErrors.map((fieldError) => (
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
 * `min={startDate}` ON THE END DATE
 *
 * The validation catches an inverted range, but the picker preventing it is
 * better: the invalid dates are simply not selectable, so the error never fires.
 * Constrain the input where you can, and validate for the cases you cannot.
 *
 * THE DAY COUNT DOUBLES AS FEEDBACK
 *
 * "5 days of leave" appears as soon as both dates are valid, in the same slot
 * the error would occupy. It confirms the range was understood the way the user
 * meant — a fortnight that reads as 15 days is a typo they can see immediately.
 */
