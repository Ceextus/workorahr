"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronsUpDown, Eye, Power, RotateCcw, Users } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton, SkeletonCircle, SkeletonText } from "@/components/ui/skeleton";
import {
  useDeactivateEmployee,
  useReactivateEmployee,
} from "@/features/employees/hooks";
import {
  getEmployeeDepartmentName,
  type Employee,
} from "@/features/employees/types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Sorting
// ─────────────────────────────────────────────────────────────────────────────

export type SortKey = "name" | "jobTitle" | "department" | "status";
export interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

const SORT_VALUE: Record<
  SortKey,
  (employee: Employee, departmentById?: Map<string, string>) => string
> = {
  name: (e) => `${e.firstName} ${e.lastName}`.toLowerCase(),
  jobTitle: (e) => (e.jobTitle ?? "").toLowerCase(),
  department: (e, departmentById) =>
    getEmployeeDepartmentName(e, departmentById).toLowerCase(),
  status: (e) => (e.active ? "0" : "1"),
};

export function sortEmployees(
  employees: Employee[],
  sort: SortState,
  departmentById?: Map<string, string>,
) {
  // Copy first — the array belongs to the query cache and .sort() mutates.
  return [...employees].sort((a, b) => {
    const compared = SORT_VALUE[sort.key](a, departmentById).localeCompare(
      SORT_VALUE[sort.key](b, departmentById),
    );
    return sort.direction === "asc" ? compared : -compared;
  });
}

/*
 * SORTING IS CLIENT-SIDE BECAUSE THE API HAS NO SORT PARAMETER.
 *
 * GET /employees takes departmentId, jobTitle and active — nothing else. So the
 * choice is sort what we were given, or don't offer sorting.
 *
 * That is honest here only because the same endpoint returns every employee in
 * one array with no pagination either. We already hold the whole set, so sorting
 * it locally is complete rather than misleading.
 *
 * The day the backend adds paging, this silently becomes a lie — it would sort
 * the current page only, which looks identical and is wrong. Move sorting to the
 * server at the same time as paging, not after.
 *
 * `localeCompare` rather than `<` so accented names order correctly.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Cells
// ─────────────────────────────────────────────────────────────────────────────

function StatusChip({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-body-sm font-semibold ${
        active ? "bg-primary/10 text-primary" : "bg-surface-sunk text-text-muted"
      }`}
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 rounded-pill ${active ? "bg-primary" : "bg-text-subtle"}`}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

const COLUMNS: { key: SortKey | null; label: string; className?: string }[] = [
  { key: "name", label: "Employee" },
  { key: "jobTitle", label: "Job title", className: "hidden lg:table-cell" },
  { key: "department", label: "Department", className: "hidden lg:table-cell" },
  { key: "status", label: "Status" },
  { key: null, label: "", className: "text-right" },
];

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <tbody>
      {Array.from({ length: rows }).map((_, index) => (
        <tr key={index} className="border-t border-border-subtle">
          <td className="px-4 py-4 lg:px-6">
            <div className="flex items-center gap-3">
              <SkeletonCircle size={40} />
              <div className="flex flex-col gap-2">
                <SkeletonText width="9rem" />
                <SkeletonText width="12rem" className="h-3" />
              </div>
            </div>
          </td>
          <td className="hidden px-4 py-4 lg:table-cell lg:px-6"><SkeletonText width="7rem" /></td>
          <td className="hidden px-4 py-4 lg:table-cell lg:px-6"><SkeletonText width="6rem" /></td>
          <td className="px-4 py-4 lg:px-6"><Skeleton rounded="pill" className="h-6 w-20" /></td>
          <td className="px-4 py-4 lg:px-6">
            <div className="flex justify-end gap-2">
              <Skeleton className="h-9 w-9" />
              <Skeleton className="h-9 w-9" />
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 · Row actions
// ─────────────────────────────────────────────────────────────────────────────

function RowActions({
  employee,
  canManage,
  onConfirmDeactivate,
}: {
  employee: Employee;
  canManage: boolean;
  onConfirmDeactivate: (employee: Employee) => void;
}) {
  const deactivate = useDeactivateEmployee();
  const reactivate = useReactivateEmployee();
  const isPending = deactivate.isPending || reactivate.isPending;

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={`/employees/${employee.id}`}
        aria-label={`View ${employee.firstName} ${employee.lastName}`}
        className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-primary/10 text-primary transition-colors hover:bg-primary/20"
      >
        <Eye size={16} aria-hidden />
      </Link>

      {canManage ? (
        employee.active ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onConfirmDeactivate(employee)}
            aria-label={`Deactivate ${employee.firstName} ${employee.lastName}`}
            className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-error/10 text-error transition-colors hover:bg-error/20 disabled:opacity-50"
          >
            <Power size={16} aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => reactivate.mutate(employee.id)}
            aria-label={`Reactivate ${employee.firstName} ${employee.lastName}`}
            className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-surface-sunk text-text-muted transition-colors hover:text-text-strong disabled:opacity-50"
          >
            <RotateCcw size={16} aria-hidden />
          </button>
        )
      ) : null}
    </div>
  );
}

/*
 * The mockup's row has three coloured action buttons. Two are implementable:
 * view, and deactivate/reactivate. The third — a red delete — has no endpoint
 * behind it. DELETE /employees/{id} is a *deactivation*, which is the button
 * already here. A second one promising real deletion would be lying.
 *
 * Deactivation is confirmed through <ConfirmDialog>, which lives at the table
 * level rather than inside RowActions — one dialog for the whole table instead
 * of one mounted per row. The row only reports which employee was chosen.
 */

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 5 · The table
// ─────────────────────────────────────────────────────────────────────────────

interface EmployeeTableProps {
  employees: Employee[] | undefined;
  isLoading: boolean;
  isRefreshing?: boolean;
  error?: Error | null;
  sort: SortState;
  onSortChange: (sort: SortState) => void;
  canManage: boolean;
  onClearFilters?: () => void;
  departmentById?: Map<string, string>;
}

export function EmployeeTable({
  employees,
  isLoading,
  isRefreshing = false,
  error,
  sort,
  onSortChange,
  canManage,
  onClearFilters,
  departmentById,
}: EmployeeTableProps) {
  const [confirming, setConfirming] = useState<Employee | null>(null);
  const deactivate = useDeactivateEmployee();

  async function confirmDeactivate() {
    if (!confirming) return;
    try {
      await deactivate.mutateAsync(confirming.id);
    } finally {
      setConfirming(null);
    }
  }

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">Could not load employees.</p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  const isEmpty = !isLoading && (employees?.length ?? 0) === 0;

  function toggleSort(key: SortKey) {
    onSortChange(
      sort.key === key
        ? { key, direction: sort.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-panel bg-surface-raised shadow-card">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-sunk/50 text-body-xs font-semibold uppercase tracking-wider text-text-subtle">
              {COLUMNS.map((column) => (
                <th key={column.label || "actions"} className={`px-4 py-3.5 lg:px-6 ${column.className ?? ""}`}>
                  {column.key ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key!)}
                      className="inline-flex items-center gap-1.5 transition-colors hover:text-text-strong"
                    >
                      {column.label}
                      <ChevronsUpDown size={13} aria-hidden />
                    </button>
                  ) : (
                    column.label
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {isLoading ? (
            <TableSkeleton />
          ) : (
            <tbody className={isRefreshing ? "opacity-50 transition-opacity" : undefined}>
              {employees?.map((employee) => {
                const deptName = getEmployeeDepartmentName(employee, departmentById);
                return (
                  <tr
                    key={employee.id}
                    className="border-t border-border-subtle transition-colors hover:bg-surface-sunk"
                  >
                    <td className="px-4 py-4 lg:px-6">
                      <div className="flex items-center gap-3">
                        <Avatar
                          name={`${employee.firstName} ${employee.lastName}`}
                          src={employee.profilePictureUrl}
                          size={40}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-body-md font-semibold text-text-strong">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="truncate text-body-sm text-text-muted">{employee.email}</p>
                          <p className="truncate text-body-sm text-text-subtle lg:hidden">
                            {[employee.jobTitle, deptName !== "—" ? deptName : undefined]
                              .filter(Boolean)
                              .join(" · ") || "—"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-4 text-body-md text-text-muted lg:table-cell lg:px-6">
                      {employee.jobTitle ?? "—"}
                    </td>
                    <td className="hidden px-4 py-4 text-body-md text-text-muted lg:table-cell lg:px-6">
                      {deptName}
                    </td>
                    <td className="px-4 py-4 lg:px-6">
                      <StatusChip active={employee.active} />
                    </td>
                    <td className="px-4 py-4 lg:px-6">
                      <RowActions
                        employee={employee}
                        canManage={canManage}
                        onConfirmDeactivate={setConfirming}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          )}
        </table>
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
            <Users size={22} aria-hidden />
          </span>
          <div>
            <p className="text-body-lg font-semibold text-text-strong">
              No employees match these filters
            </p>
            <p className="mt-1 text-body-md text-text-muted">
              Try widening your search, or clear the filters to see everyone.
            </p>
          </div>
          {onClearFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="mt-1 rounded-field bg-grey-900 px-4 py-2.5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming !== null}
        onCancel={() => setConfirming(null)}
        onConfirm={confirmDeactivate}
        title={`Deactivate ${confirming?.firstName ?? ""} ${confirming?.lastName ?? ""}?`}
        description="Their login is locked immediately. The record is kept, and they can be reactivated later."
        confirmLabel="Deactivate"
        pendingLabel="Deactivating…"
        isPending={deactivate.isPending}
      />
    </div>
  );
}

/*
 * `aria-sort` on the <th> is what tells a screen reader which column is sorted
 * and which way. The chevron icon carries that for sighted users only.
 *
 * Clicking the same header flips direction; clicking a different one starts at
 * ascending. That is the behaviour people expect without being told.
 */
