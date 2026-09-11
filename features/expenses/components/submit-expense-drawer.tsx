"use client";

import { AlertCircle } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { categoryLabel } from "@/features/expenses/components/expense-bits";
import { useSubmitExpense } from "@/features/expenses/hooks";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/features/expenses/types";
import { ApiError } from "@/lib/api-client";
import { money } from "@/lib/format";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

export function SubmitExpenseDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const categoryId = useId();
  const amountId = useId();
  const descriptionId = useId();
  const receiptId = useId();

  const [category, setCategory] = useState<ExpenseCategory>("TRAVEL");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptReference, setReceiptReference] = useState("");
  const [touched, setTouched] = useState(false);

  const submit = useSubmitExpense();

  const numericAmount = Number(amount);
  const errors = {
    amount:
      amount && numericAmount > 0 ? undefined : "Enter an amount above zero.",
    description: description.trim() ? undefined : "Say what this was for.",
  };
  const isValid = !errors.amount && !errors.description;

  function close() {
    setCategory("TRAVEL");
    setAmount("");
    setDescription("");
    setReceiptReference("");
    setTouched(false);
    submit.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) return;

    const payload = {
      category,
      amount: numericAmount,
      description: description.trim(),
      ...(receiptReference.trim() && { receiptReference: receiptReference.trim() }),
    };

    try {
      await submit.mutateAsync(payload);
      close();
    } catch (cause) {
      console.error("[submit expense] sent:", payload);
      console.error("[submit expense] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title="New expense claim"
      description="Your manager reviews this before it can be paid."
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
            form="submit-expense-form"
            disabled={submit.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {submit.isPending ? "Submitting…" : "Submit claim"}
          </button>
        </>
      }
    >
      <form
        id="submit-expense-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <label htmlFor={categoryId} className="text-body-md font-semibold text-text-strong">
            Category <span className="text-error">*</span>
          </label>
          <select
            id={categoryId}
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
            className={`h-12 ${fieldBase} border-border-subtle`}
          >
            {EXPENSE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {categoryLabel(value)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={amountId} className="text-body-md font-semibold text-text-strong">
            Amount <span className="text-error">*</span>
          </label>
          <input
            id={amountId}
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="152.50"
            aria-invalid={Boolean(touched && errors.amount)}
            className={`h-12 ${fieldBase} ${
              touched && errors.amount ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.amount ? (
            <p className="flex items-center gap-1.5 text-body-sm font-medium text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.amount}
            </p>
          ) : numericAmount > 0 ? (
            /* Echo it back formatted, so a mistyped decimal is obvious. */
            <p className="text-body-sm text-text-muted">
              Claiming {money(numericAmount)}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={descriptionId}
            className="text-body-md font-semibold text-text-strong"
          >
            Description <span className="text-error">*</span>
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="Client site visit taxi fares"
            aria-invalid={Boolean(touched && errors.description)}
            className={`resize-none py-3 ${fieldBase} ${
              touched && errors.description ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && errors.description ? (
            <p className="flex items-center gap-1.5 text-body-sm font-medium text-error">
              <AlertCircle size={14} aria-hidden />
              {errors.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={receiptId} className="text-body-md font-semibold text-text-strong">
            Receipt reference
          </label>
          <input
            id={receiptId}
            value={receiptReference}
            onChange={(event) => setReceiptReference(event.target.value)}
            placeholder="RCPT-0001"
            className={`h-12 ${fieldBase} border-border-subtle`}
          />
          <p className="text-body-sm text-text-muted">
            Optional. A reference only — there is no way to attach the receipt
            itself.
          </p>
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
 * `receiptReference` IS A STRING, NOT A FILE
 *
 * Worth being explicit about in the UI, because "receipt" invites a file picker
 * and there is no upload endpoint for expenses. The field takes a reference
 * someone types — an invoice number, a folder id — and the hint says so, rather
 * than leaving a user hunting for an attach button that does not exist.
 *
 * The API has multipart uploads for profile pictures, policy documents and board
 * documents. Expenses is not one of them.
 *
 * `inputMode="decimal"` brings up the numeric keypad on a phone. `type="number"`
 * alone is inconsistent across mobile browsers, and this is a form people will
 * mostly fill in on a phone, standing next to a taxi.
 */
