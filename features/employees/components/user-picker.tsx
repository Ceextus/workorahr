"use client";

import { AlertCircle } from "lucide-react";
import { useMemo } from "react";

import { useEmployees } from "@/features/employees/hooks";

/**
 * Pick a person, get their USER id.
 *
 * Everything else in this app identifies people by employee id. Incidents and
 * on-call do not — they take the id of the linked user account. This component
 * is the bridge: it lists employees by name and yields `employee.userId`.
 */
export function UserPicker({
  id,
  value,
  onChange,
  placeholder = "Choose someone",
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
  invalid?: boolean;
}) {
  const { data, isLoading, error } = useEmployees();

  // Only people who can actually be selected: active, and carrying a user id.
  const people = useMemo(
    () =>
      (data ?? [])
        .filter((employee) => employee.active !== false && employee.userId)
        .sort((a, b) =>
          `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`),
        ),
    [data],
  );

  const loaded = !isLoading && !error;
  const noneSelectable = loaded && (data?.length ?? 0) > 0 && people.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading || noneSelectable}
        className={`h-12 w-full rounded-field border bg-surface-raised px-4 text-body-md text-text-strong outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-surface-sunk disabled:text-text-subtle ${
          invalid ? "border-error" : "border-border-subtle"
        }`}
      >
        <option value="">
          {isLoading ? "Loading people…" : noneSelectable ? "Nobody selectable" : placeholder}
        </option>
        {people.map((employee) => (
          <option key={employee.id} value={employee.userId as string}>
            {employee.firstName} {employee.lastName}
            {employee.jobTitle ? ` · ${employee.jobTitle}` : ""}
          </option>
        ))}
      </select>

      {error ? (
        <p className="flex items-start gap-1.5 text-body-sm text-text-muted">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-error" aria-hidden />
          Could not load the directory. {error.message}
        </p>
      ) : noneSelectable ? (
        <p className="flex items-start gap-1.5 rounded-field bg-warning/10 p-3 text-body-sm text-text-muted">
          <AlertCircle size={14} className="mt-0.5 shrink-0 text-warning" aria-hidden />
          <span>
            The directory loaded, but none of the records include a{" "}
            <code className="font-mono">userId</code>. This endpoint needs a user
            id, so nobody can be selected until the backend returns that field.
          </span>
        </p>
      ) : null}
    </div>
  );
}

/*
 * THIS COMPONENT EXISTS BECAUSE ONE API USES TWO ID SPACES.
 *
 * Assets assign by employee id. Incidents and on-call assign by user id. Both
 * are UUIDs, both are called "id", and passing the wrong one fails in the worst
 * possible way — a valid-looking request that silently references nobody, or a
 * 404 that reads like the record is missing.
 *
 * For a while this app had no way to resolve the second kind, so those two
 * screens asked the user to paste a raw UUID. That was wrong twice over: it is
 * unusable, and the premise was false — EmployeeResponse carries `userId`, it
 * simply was not in the frontend's type. One missing field in an interface made
 * a whole feature look impossible.
 *
 * THE `noneSelectable` BRANCH IS NOT DEFENSIVE PADDING
 *
 * `userId` is optional on the type because not every response shape is
 * guaranteed to include it. If a deployment returns employees without it, the
 * filter empties the list — and a select with no options and no explanation is
 * indistinguishable from a loading bug. The warning names the exact missing
 * field, so the next person knows whether to look at this file or at the
 * backend.
 *
 * Note it distinguishes "directory is empty" from "directory has people but
 * none usable": `(data?.length ?? 0) > 0 && people.length === 0`. A company
 * with no employees yet should not be told its backend is misconfigured.
 */
