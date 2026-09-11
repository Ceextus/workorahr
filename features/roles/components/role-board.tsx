"use client";

import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import { Skeleton, SkeletonText } from "@/components/ui/skeleton";
import { RoleFormDrawer } from "@/features/roles/components/role-form-drawer";
import { useDeleteRole, useRoles } from "@/features/roles/hooks";
import type { RoleRecord } from "@/features/roles/types";
import { ApiError } from "@/lib/api-client";

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-card bg-surface-raised p-6 shadow-card">
      <Skeleton className="h-11 w-11" />
      <div className="flex flex-col gap-2">
        <SkeletonText width="45%" className="h-4" />
        <SkeletonText width="85%" className="h-3" />
        <SkeletonText width="60%" className="h-3" />
      </div>
    </div>
  );
}

export function RoleBoard({ canManage }: { canManage: boolean }) {
  const { data: roles, isLoading, error } = useRoles();
  const remove = useDeleteRole();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  async function handleDelete(role: RoleRecord) {
    if (
      !confirm(
        `Delete the "${role.name}" role? Employees holding it may block this.`,
      )
    ) {
      return;
    }

    setDeleteError(null);
    try {
      await remove.mutateAsync(role.id);
    } catch (cause) {
      const message =
        cause instanceof ApiError ? cause.message : "Could not delete that role.";
      setDeleteError(`${role.name}: ${message}`);
    }
  }

  if (error) {
    return (
      <div className="rounded-card bg-error/8 p-8 text-center ring-1 ring-error/25">
        <p className="text-body-lg font-semibold text-error">Could not load roles.</p>
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
            New role
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
      ) : !roles?.length ? (
        <div className="flex flex-col items-center gap-3 rounded-card bg-surface-raised px-6 py-16 text-center shadow-card">
          <span className="grid h-12 w-12 place-items-center rounded-field bg-surface-sunk text-text-subtle">
            <ShieldCheck size={22} aria-hidden />
          </span>
          <div>
            <p className="text-body-lg font-semibold text-text-strong">No roles yet</p>
            <p className="mt-1 max-w-sm text-body-md text-text-muted">
              Roles are optional on an employee, but they are how you group people
              by what they do.
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
          {roles.map((role) => (
            <article
              key={role.id}
              className="group flex flex-col gap-4 rounded-card bg-surface-raised p-6 shadow-card transition-shadow hover:shadow-float"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-field bg-primary/10 text-primary">
                  <ShieldCheck size={20} aria-hidden />
                </span>

                {canManage ? (
                  <div className="flex gap-1.5 transition-opacity lg:opacity-0 lg:focus-within:opacity-100 lg:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(role);
                        setDrawerOpen(true);
                      }}
                      aria-label={`Edit ${role.name}`}
                      className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-surface-sunk text-text-muted transition-colors hover:text-text-strong"
                    >
                      <Pencil size={15} aria-hidden />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(role)}
                      disabled={remove.isPending}
                      aria-label={`Delete ${role.name}`}
                      className="grid h-11 w-11 place-items-center rounded-field lg:h-9 lg:w-9 bg-error/10 text-error transition-colors hover:bg-error/20 disabled:opacity-50"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="min-w-0">
                <h2 className="text-body-lg font-bold text-text-strong">{role.name}</h2>
                <p className="mt-1 text-body-md text-text-muted">
                  {role.description || "No description."}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}

      <RoleFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        role={editing}
      />
    </div>
  );
}

/*
 * A ROLE HERE IS NOT AN ACCESS LEVEL
 *
 * Worth being clear about, because the naming collides. These are records with
 * a name and a description, created freely and attached to employees via
 * `roleIds` — "HR", "Team Lead", whatever the company wants.
 *
 * What actually governs permissions is `userType` on the auth user
 * (EMPLOYEE < MANAGER < HR < ADMIN < SUPER_ADMIN), which is the ladder in
 * lib/permissions.ts and is not editable through any endpoint in this API.
 *
 * So creating a role called "ADMIN" here grants nobody anything. The two
 * concepts share a word and nothing else.
 */
