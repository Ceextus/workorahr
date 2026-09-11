"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";

import * as rolesApi from "./api";
import type { RolePayload } from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 · Keys
// ─────────────────────────────────────────────────────────────────────────────

export const roleKeys = {
  all: ["roles"] as const,
  list: () => [...roleKeys.all, "list"] as const,
  detail: (id: string) => [...roleKeys.all, "detail", id] as const,
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 · Reads
// ─────────────────────────────────────────────────────────────────────────────

export function useRoles() {
  return useQuery({
    queryKey: roleKeys.list(),
    queryFn: rolesApi.listRoles,
    // Read by the employee edit drawer on every open — keep it warm.
    staleTime: 5 * 60 * 1000,
  });
}

export function useRole(id: string) {
  return useQuery({
    queryKey: roleKeys.detail(id),
    queryFn: () => rolesApi.getRole(id),
    enabled: Boolean(id),
  });
}

export function useRoleNameMap() {
  const { data, isLoading } = useRoles();

  const roleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of data ?? []) {
      const anyR = r as unknown as Record<string, unknown>;
      const id = String(r.id || anyR.roleId || anyR._id || "").trim();
      const name = String(r.name || anyR.roleName || anyR.title || "").trim();
      if (id && name) {
        map.set(id, name);
        map.set(id.toLowerCase(), name);
      }
    }
    return map;
  }, [data]);

  return { roleById, roles: data, isLoading };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 · Writes
// ─────────────────────────────────────────────────────────────────────────────

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success("Role created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create role");
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RolePayload }) =>
      rolesApi.updateRole(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      toast.success("Role updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update role");
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: rolesApi.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: roleKeys.all });
      // An employee's `role` field is stale the moment a role disappears.
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Role deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete role");
    },
  });
}

/*
 * EVERY MUTATION INVALIDATES RATHER THAN WRITING THE RESPONSE IN
 *
 * `createRole` and `updateRole` are typed as returning the saved record, and
 * that is what the docs imply. But the employee endpoints turned out to answer
 * with an empty body despite documenting a response, and `setQueryData` on
 * `undefined` throws *after* the write has already succeeded — the data is
 * saved and the UI reports a crash.
 *
 * Invalidating costs one refetch and cannot fail that way. On a resource this
 * small it is the right trade, and it stays correct whichever the backend does.
 *
 * WHY DELETE ALSO INVALIDATES `employees`
 *
 * Employees carry an expanded `role: { id, name }`. Delete a role and every
 * cached employee holding it is describing something that no longer exists.
 * Nothing else in this file reaches outside its own prefix — this one has to,
 * because the relationship is real.
 */
