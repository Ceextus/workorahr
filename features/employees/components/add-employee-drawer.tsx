"use client";

import { AlertCircle, Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Drawer } from "@/components/ui/drawer";
import { useDepartments } from "@/features/departments/hooks";
import { NewCredentials } from "@/features/employees/components/new-credentials";
import { useCreateEmployee } from "@/features/employees/hooks";
import { useRoles } from "@/features/roles/hooks";
import type { CreateEmployeePayload } from "@/features/employees/types";
import { ApiError } from "@/lib/api-client";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Field
// ─────────────────────────────────────────────────────────────────────────────

const fieldBase =
  "h-12 w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong " +
  "outline-none transition-colors placeholder:text-text-subtle " +
  "focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: (id: string, invalid: boolean) => React.ReactNode;
}) {
  const id = useId();
  const invalid = Boolean(error);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="text-body-md font-semibold text-text-strong">
          {label}
          {required ? (
            <span className="text-error" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </label>
        {hint ? <span className="text-body-xs text-text-subtle">{hint}</span> : null}
      </div>

      {children(id, invalid)}

      {error ? (
        <p role="alert" className="text-body-sm font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Form state
// ─────────────────────────────────────────────────────────────────────────────

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  departmentId: string;
  roleId: string;
  salary: string;
  hireDate: string;
}

const EMPTY: FormState = {
  firstName: "",
  lastName: "",
  email: "",
  jobTitle: "",
  departmentId: "",
  roleId: "",
  salary: "",
  hireDate: "",
};

const REQUIRED = "This field is required.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(form: FormState) {
  return {
    firstName: form.firstName.trim() ? undefined : REQUIRED,
    lastName: form.lastName.trim() ? undefined : REQUIRED,
    email: EMAIL_PATTERN.test(form.email) ? undefined : "Enter a valid email address.",
    departmentId: form.departmentId ? undefined : "Choose a department.",
    salary:
      form.salary && Number(form.salary) > 0 ? undefined : "Enter a salary above zero.",
    hireDate: form.hireDate ? undefined : "Choose a hire date.",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · The drawer
// ─────────────────────────────────────────────────────────────────────────────

export function AddEmployeeDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState(false);

  /** The address just created; switches the drawer to the confirmation screen. */
  const [created, setCreated] = useState<string | null>(null);

  const { data: departments, isLoading: departmentsLoading } = useDepartments();
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const create = useCreateEmployee();

  const errors = validate(form);
  const isValid = Object.values(errors).every((error) => !error);
  const show = (key: keyof typeof errors) => (touched ? errors[key] : undefined);

  const noDepartments = !departmentsLoading && (departments?.length ?? 0) === 0;

  useEffect(() => {
    if (create.error) {
      formRef.current?.parentElement?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [create.error]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  function close() {
    setForm(EMPTY);
    setTouched(false);
    setCreated(null);
    create.reset();
    onClose();
  }

  /** Keep the drawer open for the next hire, clearing the previous one. */
  function addAnother() {
    setForm(EMPTY);
    setTouched(false);
    setCreated(null);
    create.reset();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (!isValid) {
      toast.error("Please fill in all required fields.");
      formRef.current?.parentElement?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const payload: CreateEmployeePayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      departmentId: form.departmentId,
      salary: Number(form.salary),
      hireDate: form.hireDate,
      ...(form.jobTitle.trim() && { jobTitle: form.jobTitle.trim() }),
      ...(form.roleId && { roleIds: [form.roleId] }),
    };

    try {
      await create.mutateAsync(payload);
      // Confirm rather than close, so the drawer can offer "Add another".
      setCreated(payload.email);
    } catch (cause) {
      console.error("[create employee] sent:", payload);
      console.error("[create employee] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={created ? "Employee created" : "Add new employee"}
      description={
        created
          ? "Their account is ready and their invitation is on its way."
          : "This creates their login and emails them an invitation."
      }
      footer={
        created ? (
          <>
            <button
              type="button"
              onClick={addAnother}
              className="h-12 flex-1 rounded-field border border-border-strong text-body-md font-semibold text-text-strong transition-colors hover:bg-surface-sunk"
            >
              Add another
            </button>
            <button
              type="button"
              onClick={close}
              className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
            >
              Done
            </button>
          </>
        ) : (
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
              form="add-employee-form"
              disabled={create.isPending || noDepartments}
              className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
            >
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </>
        )
      }
    >
      {created ? (
        <NewCredentials email={created} />
      ) : (
      <form
        ref={formRef}
        id="add-employee-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        {create.error ? (
          <div
            role="alert"
            className="sticky top-0 z-10 flex items-start gap-2 rounded-field bg-error/10 border border-error/20 p-3 text-body-sm font-medium text-error shadow-card backdrop-blur-sm"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p>{create.error.message}</p>
              {create.error instanceof ApiError && create.error.fieldErrors.length > 0 ? (
                <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                  {create.error.fieldErrors.map((fieldError) => (
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

        {touched && !isValid ? (
          <div
            role="alert"
            className="sticky top-0 z-10 flex items-start gap-2 rounded-field bg-error/10 border border-error/20 p-3 text-body-sm font-medium text-error shadow-card backdrop-blur-sm"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p>Please fill in all required fields below.</p>
            </div>
          </div>
        ) : null}

        {noDepartments ? (
          <p className="flex items-start gap-2 rounded-field bg-secondary/15 p-3 text-body-sm font-medium text-text-strong">
            <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
            You need at least one department before you can add an employee — the
            backend requires it. Create one under Departments first.
          </p>
        ) : null}

        <Field label="First name" required error={show("firstName")}>
          {(id, invalid) => (
            <input
              id={id}
              value={form.firstName}
              onChange={(event) => set("firstName", event.target.value)}
              placeholder="Jane"
              aria-invalid={invalid}
              className={`${fieldBase} ${invalid ? "border-error" : "border-border-subtle"}`}
            />
          )}
        </Field>

        <Field label="Last name" required error={show("lastName")}>
          {(id, invalid) => (
            <input
              id={id}
              value={form.lastName}
              onChange={(event) => set("lastName", event.target.value)}
              placeholder="Smith"
              aria-invalid={invalid}
              className={`${fieldBase} ${invalid ? "border-error" : "border-border-subtle"}`}
            />
          )}
        </Field>

        <Field
          label="Email address"
          required
          error={show("email")}
          hint="Their onboarding invitation goes here."
        >
          {(id, invalid) => (
            <input
              id={id}
              type="email"
              value={form.email}
              onChange={(event) => set("email", event.target.value)}
              placeholder="jane.smith@company.com"
              aria-invalid={invalid}
              className={`${fieldBase} ${invalid ? "border-error" : "border-border-subtle"}`}
            />
          )}
        </Field>

        <Field label="Department" required error={show("departmentId")}>
          {(id, invalid) => (
            <select
              id={id}
              value={form.departmentId}
              onChange={(event) => set("departmentId", event.target.value)}
              disabled={departmentsLoading}
              aria-invalid={invalid}
              className={`${fieldBase} ${invalid ? "border-error" : "border-border-subtle"}`}
            >
              <option value="">
                {departmentsLoading ? "Loading…" : "Choose a department"}
              </option>
              {departments?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Role">
          {(id) => (
            <select
              id={id}
              value={form.roleId}
              onChange={(event) => set("roleId", event.target.value)}
              disabled={rolesLoading}
              className={`${fieldBase} border-border-subtle`}
            >
              <option value="">
                {rolesLoading ? "Loading…" : "No role (optional)"}
              </option>
              {roles?.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Job title">
          {(id) => (
            <input
              id={id}
              value={form.jobTitle}
              onChange={(event) => set("jobTitle", event.target.value)}
              placeholder="Software Engineer"
              className={`${fieldBase} border-border-subtle`}
            />
          )}
        </Field>

        <Field label="Hire date" required error={show("hireDate")}>
          {(id, invalid) => (
            <input
              id={id}
              type="date"
              value={form.hireDate}
              onChange={(event) => set("hireDate", event.target.value)}
              aria-invalid={invalid}
              className={`${fieldBase} ${invalid ? "border-error" : "border-border-subtle"}`}
            />
          )}
        </Field>

        <Field label="Salary" required error={show("salary")}>
          {(id, invalid) => (
            <input
              id={id}
              type="number"
              min="0"
              step="0.01"
              value={form.salary}
              onChange={(event) => set("salary", event.target.value)}
              placeholder="500000"
              aria-invalid={invalid}
              className={`${fieldBase} ${invalid ? "border-error" : "border-border-subtle"}`}
            />
          )}
        </Field>

        <p className="flex items-start gap-2 rounded-field bg-surface-sunk p-3 text-body-sm text-text-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden />
          Phone and access level cannot be set here. They can be updated
          after creation via Edit details.
        </p>
      </form>
      )}
    </Drawer>
  );
}

/*
 * THE "NO DEPARTMENTS" GUARD IS NOT DEFENSIVE PROGRAMMING
 *
 * `departmentId` is required, and its only legitimate values come from
 * GET /departments. On a fresh install that list is empty, so adding an employee
 * is genuinely impossible until a department exists.
 *
 * Without the notice, someone submits and gets "Department is required" — true,
 * and completely unhelpful, because there was nothing to choose. Saying so up
 * front and disabling submit turns a dead end into an instruction.
 *
 * WHAT THE FORM OFFERS AND WHAT IT DOES NOT
 *
 * `roleIds` (plural, an array) is accepted on POST /employees. `roleId`
 * (singular) is NOT — the backend rejects it. The dropdown sends
 * `roleIds: [selectedId]`. It is optional; omitting it creates the employee
 * with no role.
 *
 * Phone and access level still have no accepted field name on this endpoint
 * under any spelling we tried — a control for either would silently discard
 * what you type.
 */
