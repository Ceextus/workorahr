"use client";

import { Search, X } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { useDepartments } from "@/features/departments/hooks";
import type { EmployeeClientFilters } from "@/features/employees/types";

interface Props {
  filters: EmployeeClientFilters;
  onChange: (next: EmployeeClientFilters) => void;
}

const selectClass =
  "h-11 rounded-field border border-border-subtle bg-surface-raised px-4 text-body-md " +
  "text-text-strong outline-none transition-colors focus:border-primary " +
  "focus:ring-2 focus:ring-primary/20";

export function EmployeeFilterBar({ filters, onChange }: Props) {
  const { data: departments, isLoading: departmentsLoading } = useDepartments();

  const hasFilters =
    Boolean(filters.search) ||
    Boolean(filters.departmentId) ||
    filters.active !== undefined;

  const set = (patch: Partial<EmployeeClientFilters>) =>
    onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-col gap-3 rounded-card bg-surface-raised p-4 shadow-card lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3 rounded-field bg-surface-sunk px-4">
        <Search size={18} className="shrink-0 text-text-subtle" aria-hidden />
        <input
          type="search"
          value={filters.search ?? ""}
          onChange={(event) => set({ search: event.target.value || undefined })}
          placeholder="Search name, email or job title…"
          aria-label="Search employees"
          className="h-11 min-w-0 flex-1 bg-transparent text-body-md text-text-strong outline-none placeholder:text-text-subtle"
        />
      </div>

      {departmentsLoading ? (
        <Skeleton className="h-11 w-full lg:w-52" />
      ) : (
        <select
          value={filters.departmentId ?? ""}
          onChange={(event) => set({ departmentId: event.target.value || undefined })}
          aria-label="Filter by department"
          className={`${selectClass} w-full lg:w-52`}
        >
          <option value="">All departments</option>
          {departments?.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.active === undefined ? "" : String(filters.active)}
        onChange={(event) =>
          set({
            active: event.target.value === "" ? undefined : event.target.value === "true",
          })
        }
        aria-label="Filter by status"
        className={`${selectClass} w-full lg:w-40`}
      >
        <option value="">All statuses</option>
        <option value="true">Active</option>
        <option value="false">Inactive</option>
      </select>

      {hasFilters ? (
        <button
          type="button"
          onClick={() => onChange({})}
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-field px-3 text-body-md font-semibold text-text-muted transition-colors hover:bg-surface-sunk hover:text-text-strong"
        >
          <X size={16} aria-hidden />
          Clear
        </button>
      ) : null}
    </div>
  );
}

/*
 * EVERY FILTER HERE IS NOW CLIENT-SIDE, AND THAT IS FORCED.
 *
 * GET /employees accepts firstName, lastName and email — nothing else. There is
 * no departmentId or active parameter any more, so those two cannot be sent.
 *
 * And a single search box cannot map onto three separate name fields: it has no
 * way to know whether "Smith" is a first name, a surname or part of an email.
 * Sending it as `firstName` would quietly fail to find anyone searched by
 * surname, which is worse than not offering search at all.
 *
 * So the list arrives unfiltered and is narrowed in the browser. Two things make
 * that honest rather than lazy:
 *
 *   - the endpoint has no pagination, so the whole set is already here;
 *   - the backend scopes the list by role first, so a non-HR caller only ever
 *     receives their own department anyway.
 *
 * It is also better to use: no debounce, no refetch, no loading flash between
 * keystrokes. The trade-off is that it stops working the day the list gets big
 * enough to need pagination — at which point search, department and status all
 * move back to the server together.
 *
 * THE `active` THREE-STATE MAPPING IS STILL THE SUBTLE PART
 *
 *   ""      -> undefined   not filtering
 *   "true"  -> true
 *   "false" -> false
 *
 * `Boolean(event.target.value)` would turn "false" into `true`, because any
 * non-empty string is truthy. That bug shows up as an Inactive filter returning
 * active people, and it is easy to read straight past.
 */
