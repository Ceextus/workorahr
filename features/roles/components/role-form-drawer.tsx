"use client";

import { AlertCircle } from "lucide-react";
import { useId, useState } from "react";

import { Drawer } from "@/components/ui/drawer";
import { useCreateRole, useUpdateRole } from "@/features/roles/hooks";
import type { RoleRecord } from "@/features/roles/types";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Present when editing, absent when creating. */
  role?: RoleRecord | null;
}

export function RoleFormDrawer({ open, onClose, role }: Props) {
  const nameId = useId();
  const descriptionId = useId();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);

  const create = useCreateRole();
  const update = useUpdateRole();

  const isEditing = Boolean(role);
  const pending = create.isPending || update.isPending;
  const error = create.error ?? update.error;
  const nameError = name.trim() ? undefined : "A role needs a name.";

  // Render-phase state sync, same as the department drawer — see the note there
  // for why this is not a useEffect.
  const identity = open ? (role?.id ?? "new") : null;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (identity !== null && identity !== loadedFor) {
    setLoadedFor(identity);
    setName(role?.name ?? "");
    setDescription(role?.description ?? "");
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
      if (role) {
        await update.mutateAsync({ id: role.id, payload });
      } else {
        await create.mutateAsync(payload);
      }
      close();
    } catch (cause) {
      console.error("[role] sent:", payload);
      console.error("[role] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={isEditing ? "Edit role" : "New role"}
      description={
        isEditing
          ? "Renaming affects every employee holding this role."
          : "Roles are assigned to employees from their profile."
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
            form="role-form"
            disabled={pending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {pending ? "Saving…" : isEditing ? "Save changes" : "Create"}
          </button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label htmlFor={nameId} className="text-body-md font-semibold text-text-strong">
            Name <span className="text-error">*</span>
          </label>
          <input
            id={nameId}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="HR"
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
            placeholder="Human Resources staff."
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
 * This is deliberately near-identical to DepartmentFormDrawer. Both resources
 * are {name, description} behind the same five endpoints, so the forms end up
 * the same shape.
 *
 * Two copies rather than one shared `<NameDescriptionDrawer resource="role">`:
 * the abstraction would have to take the hooks, the labels, the placeholders and
 * the copy as props, at which point it is a template engine rather than a
 * component. If a third resource of this shape appears, that is the moment to
 * extract it — not before.
 */
