"use client";

import { AlertCircle, Check, Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";

import { Drawer } from "@/components/ui/drawer";
import { useDepartments } from "@/features/departments/hooks";
import { useUpdateEmployee } from "@/features/employees/hooks";
import {
  getEmployeeDepartmentId,
  getEmployeeRoleIds,
  type Employee,
  type UpdateEmployeePayload,
} from "@/features/employees/types";
import { useRoles } from "@/features/roles/hooks";
import { ApiError } from "@/lib/api-client";

const fieldBase =
  "h-12 w-full rounded-field border border-border-subtle bg-surface-raised px-4 " +
  "text-body-md text-text-strong outline-none transition-colors " +
  "placeholder:text-text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20";

interface Props {
  open: boolean;
  onClose: () => void;
  employee: Employee;
}

export function EditEmployeeDrawer({ open, onClose, employee }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const jobTitleId = useId();
  const salaryId = useId();
  const departmentId = useId();

  const { data: departments } = useDepartments();
  const { data: roles } = useRoles();
  const update = useUpdateEmployee();

  const [jobTitle, setJobTitle] = useState("");
  const [salary, setSalary] = useState("");
  const [department, setDepartment] = useState("");
  const [roleIds, setRoleIds] = useState<string[]>([]);

  // Render-phase state sync — see the note in department-form-drawer.tsx.
  const identity = open ? employee.id : null;
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  if (identity !== null && identity !== loadedFor) {
    setLoadedFor(identity);
    setJobTitle(employee.jobTitle ?? "");
    setSalary(employee.salary != null ? String(employee.salary) : "");
    setDepartment(getEmployeeDepartmentId(employee) ?? "");
    setRoleIds(getEmployeeRoleIds(employee));
  }

  useEffect(() => {
    if (update.error) {
      formRef.current?.parentElement?.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [update.error]);

  function toggleRole(id: string) {
    setRoleIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  function close() {
    update.reset();
    onClose();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const currentDeptId = getEmployeeDepartmentId(employee) ?? "";
    const currentRoleIds = getEmployeeRoleIds(employee);

    /*
     * PUT /employees/{id} validates as if it were a create — see the note at the
     * foot of this file. Six fields must be present or it answers 400, even
     * though the service only applies four of them. So the unchanged ones are
     * resent from the record we already hold.
     */
    const nextSalary = salary ? Number(salary) : employee.salary;
    const nextDepartmentId = department || currentDeptId;

    const missing = [
      !employee.firstName && "first name",
      !employee.lastName && "last name",
      !employee.email && "email",
      !employee.hireDate && "hire date",
      nextSalary == null && "salary",
      !nextDepartmentId && "department",
    ].filter(Boolean) as string[];

    if (missing.length > 0) {
      // Fail with a sentence rather than letting the backend answer 400 with
      // "must not be null" about a field this form never showed.
      toast.error(
        `This employee's record is missing ${missing.join(", ")}. Ask HR to complete it before editing.`,
      );
      return;
    }

    const payload: UpdateEmployeePayload = {
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      hireDate: employee.hireDate as string,
      salary: nextSalary as number,
      departmentId: nextDepartmentId,
      ...(jobTitle.trim() && { jobTitle: jobTitle.trim() }),
    };

    const rolesChanged =
      roleIds.length !== currentRoleIds.length ||
      roleIds.some((id) => !currentRoleIds.includes(id));
    // An empty array means "no change" to this backend, so never send one.
    if (roleIds.length > 0 && rolesChanged) {
      payload.roleIds = roleIds;
    }

    try {
      await update.mutateAsync({ id: employee.id, payload });
      close();
    } catch (cause) {
      console.error("[update employee] sent:", payload);
      console.error("[update employee] response:", (cause as ApiError)?.body ?? cause);
    }
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={`Edit ${employee.firstName} ${employee.lastName}`}
      description="Name and email are set at creation and cannot be changed here."
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
            form="edit-employee-form"
            disabled={update.isPending}
            className="h-12 flex-1 rounded-field bg-grey-900 text-body-md font-semibold text-white transition-colors hover:bg-grey-800 disabled:bg-grey-300 disabled:text-text-subtle"
          >
            {update.isPending ? "Saving…" : "Save changes"}
          </button>
        </>
      }
    >
      <form
        ref={formRef}
        id="edit-employee-form"
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        {update.error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-error/10 border border-error/20 p-3 text-body-sm font-medium text-error"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0">
              <p>{update.error.message}</p>
              {update.error instanceof ApiError && update.error.fieldErrors.length > 0 ? (
                <ul className="mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                  {update.error.fieldErrors.map((fieldError) => (
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

        <div className="flex flex-col gap-2">
          <label htmlFor={jobTitleId} className="text-body-md font-semibold text-text-strong">
            Job title
          </label>
          <input
            id={jobTitleId}
            value={jobTitle}
            onChange={(event) => setJobTitle(event.target.value)}
            placeholder="Senior Software Engineer"
            className={fieldBase}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={salaryId} className="text-body-md font-semibold text-text-strong">
            Salary
          </label>
          <input
            id={salaryId}
            type="number"
            min="0"
            step="0.01"
            value={salary}
            onChange={(event) => setSalary(event.target.value)}
            placeholder="95000"
            className={fieldBase}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor={departmentId} className="text-body-md font-semibold text-text-strong">
            Department
          </label>
          <select
            id={departmentId}
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            className={fieldBase}
          >
            <option value="">Unchanged</option>
            {departments?.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="pb-2 text-body-md font-semibold text-text-strong">Roles</legend>

          <div className="flex flex-col gap-1.5">
            {roles?.map((role) => {
              const selected = roleIds.includes(role.id);
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  aria-pressed={selected}
                  className={`flex items-center justify-between gap-3 rounded-field border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary/8"
                      : "border-border-subtle hover:bg-surface-sunk"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-body-md font-semibold text-text-strong">
                      {role.name}
                    </span>
                    {role.description ? (
                      <span className="block text-body-sm text-text-muted">
                        {role.description}
                      </span>
                    ) : null}
                  </span>
                  <span
                    aria-hidden
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-pill border ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-border-strong"
                    }`}
                  >
                    {selected ? <Check size={13} /> : null}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="flex items-start gap-2 text-body-sm text-text-muted">
            <Info size={14} className="mt-0.5 shrink-0" aria-hidden />
            Select at least one role. Clearing every role is not supported —
            deselecting them all leaves the current roles unchanged.
          </p>
        </fieldset>
      </form>
    </Drawer>
  );
}

/*
 * WHY THIS SENDS A DIFF RATHER THAN THE WHOLE FORM
 *
 * The endpoint applies non-null fields and ignores the rest. Sending everything
 * would work, but it makes two things worse:
 *
 *   - A field cleared to "" would be sent as an empty string and overwrite a
 *     perfectly good value with nothing.
 *   - The request stops describing what the user did, which matters when you
 *     are reading logs to work out what changed.
 *
 * That was the original design here, and the deployed API rejects it.
 *
 * PUT /employees/{id} BINDS THE SAME DTO AS CREATE, AND VALIDATES IT
 *
 * The controller is `@Valid @RequestBody EmployeeRequest` — the very same class
 * POST /employees uses, carrying @NotBlank on firstName/lastName/email and
 * @NotNull on hireDate/salary/departmentId. So a genuine partial payload answers
 * 400 "must not be blank" about fields this form does not even show, and the
 * docs describing it as "partial update — every field is optional" are wrong
 * about the build that is running.
 *
 * So all six are resent from the employee record already in hand. Three of them
 * — firstName, lastName, email — are validated and then thrown away, because the
 * service only assigns hireDate, jobTitle, salary, departmentId and roleIds;
 * names and email live on the User row and this endpoint cannot touch them.
 * Resending the current values is therefore a no-op, not a silent overwrite.
 *
 * THE PROPER FIX IS ON THE BACKEND
 *
 * A separate EmployeeUpdateRequest without the create-time constraints, or
 * Jakarta validation groups on the shared one. Either makes the endpoint behave
 * the way its own documentation describes, and this workaround can come out.
 *
 * The `missing` check above exists because this workaround has a failure mode:
 * a record stored without a hireDate or department cannot satisfy the
 * validation at all. Better to say which field is missing than to forward a 400
 * about a control the user never saw.
 *
 * `roleIds` IS THE FIELD THAT CHANGED SHAPE
 *
 * The old docs said `roleId: string`. The endpoint takes `roleIds: string[]`,
 * and a non-empty array replaces the employee's roles outright. That is why the
 * UI is a multi-select rather than a dropdown.
 *
 * The read response carries a single `role: {id, name}`, so the current
 * selection is seeded from that one value. If multi-role assignment is used,
 * the detail endpoint would need to return the full set for this to round-trip
 * faithfully.
 *
 * WHY THE ROLE PICKER IS BUTTONS RATHER THAN <select multiple>
 *
 * A native multi-select requires ctrl/cmd-click to select more than one, which
 * almost nobody knows and which does not exist on touch. Toggle rows are
 * obvious, work on a phone, and can show each role's description.
 * `aria-pressed` is what tells assistive tech the state.
 */
