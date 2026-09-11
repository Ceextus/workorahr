"use client";

import { AlertCircle } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { useCreateDepartment, useUpdateDepartment } from "@/features/departments/hooks";
import type { Department } from "@/features/departments/types";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Present when editing, absent when creating. */
  department?: Department | null;
}

export function DepartmentFormDrawer({ open, onClose, department }: Props) {
  const nameId = useId();
  const descriptionId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  const create = useCreateDepartment();
  const update = useUpdateDepartment();

  const isEditing = Boolean(department);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const nameError = name.trim() ? undefined : "A department needs a name.";

  /*
   * Load the record into the form when a different one is opened.
   *
   * This is React's documented "adjusting state when a prop changes" pattern:
   * compare against the last loaded identity DURING render and setState
   * immediately. React throws away the in-progress render and re-runs it before
   * touching the DOM, so nothing flashes and no effect is involved.
   *
   * The effect version worked but was worse twice over: it triggered a cascading
   * render, and it had to depend on `department?.id` rather than `department`,
   * because the object is a fresh reference on every parent render — depending on
   * it wiped the form mid-typing.
   */
  const identity = open ? (department?.id ?? "new") : null;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (identity !== null && identity !== loadedFor) {
    setLoadedFor(identity);
    setName(department?.name ?? "");
    setDescription(department?.description ?? "");
    setTouched(false);
  }

  function close() {
    create.reset();
    update.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (nameError) return;

    const payload = {
      name: name.trim(),
      ...(description.trim() && { description: description.trim() }),
    };

    try {
      if (department) {
        await update.mutateAsync({ id: department.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      close();
    } catch (cause) {
      console.error("[department] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={isEditing ? "Edit department" : "New department"}
      description={
        isEditing
          ? "Renaming affects every employee assigned to it."
          : "Employees must belong to a department, so create these first."
      }
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
            form="department-form"
            disabled={pending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {pending ? "Saving…" : isEditing ? "Save changes" : "Create"}
          </button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-body-md font-semibold text-text-strong">
            Name <span className="text-error">*</span>
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Engineering"
            aria-invalid={Boolean(touched && nameError)}
            className={`h-12 ${fieldBase} ${
              touched && nameError ? "border-error" : "border-border-subtle"
            }`}
          />
          {touched && nameError ? (
            <p className="flex items-center gap-1.5 text-body-sm font-medium text-error">
              <AlertCircle size={14} aria-hidden />
              {nameError}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor={descriptionId}
            className="text-body-md font-semibold text-text-strong"
          >
            Description
          </label>
          <textarea
            id={descriptionId}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            placeholder="What this team is responsible for."
            className={`resize-none py-3 ${fieldBase} border-border-subtle`}
          />
          <p className="text-body-sm text-text-muted">Optional.</p>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-error/8 p-3 text-body-sm font-medium text-error"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p>{error.message}</p>
              {error instanceof ApiError && error.fieldErrors.length > 0 ? (
                <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                  {error.fieldErrors.map((fieldError) => (
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
 * ONE COMPONENT FOR CREATE AND EDIT
 *
 * The two differ by a prop, a title, a verb and which mutation fires. Splitting
 * them would duplicate the fields, the validation and the error block — and then
 * they would drift, because someone will add a field to one and forget the
 * other.
 *
 * `department` being present is the whole switch. Absent means create.
 *
 * THE DEPENDENCY ARRAY IS THE SUBTLE PART
 *
 *   }, [open, department?.id])
 *
 * Not `[open, department]`. The parent holds departments in an array from the
 * query cache and passes one object down; that object is a new reference
 * whenever the parent re-renders. Depending on it would re-run this effect on
 * every keystroke and reset the form to its loaded values mid-typing.
 *
 * Same class of bug as the focus loss in Drawer — an unstable reference in a
 * dependency array, doing something observable.
 *
 * WHY `description` IS CONDITIONALLY SPREAD
 *
 * An empty string is not "no description", it is a description that happens to
 * be empty. Omitting the key leaves the field null on the backend rather than
 * storing "". Same rule as the employee form and the query builder.
 */
