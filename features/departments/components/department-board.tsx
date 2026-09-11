"use client";

import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { DepartmentFormDrawer } from "@/features/departments/components/department-form-drawer";
import { useDeleteDepartment, useDepartments } from "@/features/departments/hooks";
import type { Department } from "@/features/departments/types";
import { ApiError } from "@/lib/api-client";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-raised p-6 shadow-card">
      <Skeleton className="h-11 w-11" />
      <div className="flex flex-col gap-2">
        <SkeletonText width="55%" className="h-4" />
        <SkeletonText width="90%" className="h-3" />
        <SkeletonText width="70%" className="h-3" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · The board
// ─────────────────────────────────────────────────────────────────────────────

export function DepartmentBoard({ canManage }: { canManage: boolean }) {
  const { data: departments, isLoading, error } = useDepartments();
  const remove = useDeleteDepartment();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(department: Department) {
    setEditing(department);
    setDrawerOpen(true);
  }

  async function handleDelete(department: Department) {
    if (
      !confirm(
        `Delete "${department.name}"? Employees assigned to it may block this.`,
      )
    ) {
      return;
    }

    setDeleteError(null);
    try {
      await remove.mutateAsync(department.id);
    } catch (cause) {
      // A department in use is the expected failure — say so where it happened.
      const message =
        cause instanceof ApiError
          ? cause.message
          : "Could not delete that department.";
      setDeleteError(`${department.name}: ${message}`);
    }
  }

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">
          Could not load departments.
        </p>
        <p className="mt-1 text-body-md text-text-muted">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex h-11 items-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
          >
            <Plus size={17} aria-hidden />
            New department
          </button>
        </div>
      ) : null}

      {deleteError ? (
        <p
          role="alert"
          className="rounded-card bg-error/8 p-4 text-body-md font-medium text-error ring-1 ring-error/25"
        >
          {deleteError}
        </p>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : !departments?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
            <Building2 size={22} aria-hidden />
          </span>
          <div>
            <p className="text-body-lg font-semibold text-text-strong">
              No departments yet
            </p>
            <p className="mt-1 max-w-sm text-body-md text-text-muted">
              Every employee must belong to one, so this is the first thing to set
              up before adding people.
            </p>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="mt-1 inline-flex h-11 items-center gap-2 rounded-field bg-grey-900 px-5 text-body-md font-semibold text-white transition-colors hover:bg-grey-800"
            >
              <Plus size={17} aria-hidden />
              Create the first one
            </button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {departments.map((department) => (
            <article
              key={department.id}
              className="group flex flex-col gap-4 rounded-card bg-surface-raised p-6 shadow-card transition-shadow hover:shadow-float"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                  <Building2 size={20} aria-hidden />
                </span>

                {canManage ? (
                  <div className="flex gap-1.5 transition-opacity lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(department)}
                      aria-label={`Edit ${department.name}`}
                      className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-surface-sunk text-text-muted transition-colors hover:text-text-strong"
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(department)}
                      disabled={remove.isPending}
                      aria-label={`Delete ${department.name}`}
                      className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-error/10 text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                <h2 className="text-body-lg font-bold text-text-strong">
                  {department.name}
                </h2>
                <p className="mt-1 text-body-md text-text-muted">
                  {department.description || "No description."}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <DepartmentFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        department={editing}
      />
    </div>
  );
}

/*
 * WHY THE EMPTY STATE MATTERS MORE HERE THAN ANYWHERE ELSE
 *
 * A brand-new install has no departments, and no employees can be created until
 * one exists — the backend requires `departmentId`. So this empty state is not a
 * polite placeholder, it is the first instruction the app gives anyone.
 *
 * It says why, not just what, and offers the action inline.
 *
 * DELETE ERRORS ARE HANDLED SEPARATELY FROM LOAD ERRORS
 *
 * A department with employees in it will likely fail to delete — a foreign key
 * or a guard on the backend. That failure belongs next to the grid, not in place
 * of it: the list is still perfectly good and should stay on screen.
 *
 * `remove.error` alone would not do, because it does not say *which* department
 * failed. The name is captured into local state at the point of the attempt.
 *
 * ACTIONS APPEAR ON HOVER, AND ON FOCUS
 *
 * `focus-within:opacity-100` next to `group-hover:opacity-100` is the part that
 * is easy to miss. Without it these buttons are reachable by keyboard but
 * invisible while focused — the focus ring lands on something nobody can see.
 */
